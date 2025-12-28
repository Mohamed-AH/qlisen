const WhisperService = require('./whisperService');
const RecitationAnalyzer = require('./recitationAnalyzer');
const quranService = require('./quranService'); // Singleton instance
const EmailService = require('./emailService');

/**
 * Queue Processor - Processes queued transcription jobs
 * Runs periodically to check for pending jobs
 */
class QueueProcessor {
    constructor(queueService) {
        this.queueService = queueService;
        this.whisperService = new WhisperService();
        this.quranService = quranService;
        this.recitationAnalyzer = new RecitationAnalyzer(this.quranService);
        this.emailService = new EmailService();

        this.isProcessing = false;
        this.interval = null;

        console.log('⚙️  Queue Processor initialized');
    }

    /**
     * Start the queue processor
     * @param {number} intervalMs - Processing interval in milliseconds (default: 30 seconds)
     */
    start(intervalMs = 30000) {
        if (this.interval) {
            console.warn('⚠️  Queue processor already running');
            return;
        }

        console.log(`▶️  Starting queue processor (interval: ${intervalMs/1000}s)`);

        // Process immediately on start
        this.processQueue();

        // Then process at intervals
        this.interval = setInterval(() => {
            this.processQueue();
        }, intervalMs);
    }

    /**
     * Stop the queue processor
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('⏹️  Queue processor stopped');
        }
    }

    /**
     * Process the queue
     */
    async processQueue() {
        // Don't process if already processing
        if (this.isProcessing) {
            return;
        }

        const queuedCount = this.queueService.getQueuedCount();
        if (queuedCount === 0) {
            return; // Nothing to process
        }

        this.isProcessing = true;

        try {
            console.log(`\n🔄 Processing queue (${queuedCount} jobs waiting)...`);

            const job = this.queueService.getNextJob();
            if (!job) {
                return;
            }

            await this.processJob(job);

        } catch (error) {
            console.error('❌ Queue processing error:', error);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Process a single job
     * @param {Object} job - Job to process
     */
    async processJob(job) {
        console.log(`\n📋 Processing job: ${job.id}`);
        console.log(`   Email: ${job.userEmail}`);
        console.log(`   Created: ${job.createdAt}`);

        // Update status to processing
        this.queueService.updateJob(job.id, 'processing');

        try {
            // Step 1: Transcribe audio
            console.log('🎯 Step 1: Transcribing audio...');
            const transcriptionResult = await this.whisperService.transcribeWithRetry(job.audioFile);

            if (!transcriptionResult.success) {
                // Check if should requeue (offline/busy)
                if (transcriptionResult.shouldQueue) {
                    console.log('⏳ Whisper still offline/busy - keeping in queue');
                    this.queueService.updateJob(job.id, 'queued');
                    return;
                }

                // Permanent failure
                throw new Error(transcriptionResult.error);
            }

            const transcript = transcriptionResult.transcript;
            console.log('✅ Transcription successful');

            // Step 2: Analyze recitation
            console.log('🎯 Step 2: Analyzing recitation...');
            const analysisResult = await this.recitationAnalyzer.analyzeRecitation(transcript);

            if (!analysisResult.success) {
                throw new Error(analysisResult.error || 'Analysis failed');
            }

            console.log('✅ Analysis successful');
            console.log(`   Surah: ${analysisResult.surah}`);
            console.log(`   Verses: ${analysisResult.startVerse}-${analysisResult.endVerse}`);

            // Step 3: Mark job as completed
            this.queueService.completeJob(job.id, {
                transcript,
                analysis: analysisResult,
                transcriptionTime: transcriptionResult.processingTime,
                analysisTime: analysisResult.processingTime
            });

            // Step 4: Send email notification
            console.log('📧 Step 3: Sending email notification...');
            const emailSent = await this.emailService.sendResultEmail(
                job.userEmail,
                analysisResult,
                job.id
            );

            if (emailSent) {
                console.log('✅ Email sent successfully');
            } else {
                console.log('⚠️  Email not sent (but job completed)');
            }

            console.log(`\n✅ Job completed successfully: ${job.id}`);

        } catch (error) {
            console.error(`❌ Job failed: ${job.id}`);
            console.error(`   Error: ${error.message}`);

            // Mark as failed (will requeue if retries < 3)
            this.queueService.failJob(job.id, error.message);

            // Send error email
            try {
                await this.emailService.sendErrorEmail(
                    job.userEmail,
                    error.message,
                    job.id
                );
            } catch (emailError) {
                console.error('   Failed to send error email:', emailError.message);
            }
        }
    }

    /**
     * Get processor status
     * @returns {Object} - Status information
     */
    getStatus() {
        return {
            running: this.interval !== null,
            processing: this.isProcessing,
            queueStats: this.queueService.getStats()
        };
    }
}

module.exports = QueueProcessor;
