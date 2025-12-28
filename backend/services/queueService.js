const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

/**
 * Queue Service for managing transcription jobs
 * Uses file-based storage (simple for testing, can upgrade to database later)
 */
class QueueService {
    constructor() {
        this.queueDir = path.join(__dirname, '../queue');
        this.jobsFile = path.join(this.queueDir, 'jobs.json');
        this.audioDir = path.join(this.queueDir, 'audio');

        // Ensure directories exist
        this.initializeStorage();

        // Load existing jobs
        this.jobs = this.loadJobs();

        console.log('📋 Queue Service initialized');
        console.log(`   Queued jobs: ${this.getQueuedCount()}`);
        console.log(`   Completed jobs: ${this.getCompletedCount()}`);
    }

    /**
     * Initialize storage directories and files
     */
    initializeStorage() {
        if (!fs.existsSync(this.queueDir)) {
            fs.mkdirSync(this.queueDir, { recursive: true });
        }

        if (!fs.existsSync(this.audioDir)) {
            fs.mkdirSync(this.audioDir, { recursive: true });
        }

        if (!fs.existsSync(this.jobsFile)) {
            fs.writeFileSync(this.jobsFile, JSON.stringify([], null, 2));
        }
    }

    /**
     * Load jobs from storage
     */
    loadJobs() {
        try {
            const data = fs.readFileSync(this.jobsFile, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading jobs:', error);
            return [];
        }
    }

    /**
     * Save jobs to storage
     */
    saveJobs() {
        try {
            fs.writeFileSync(this.jobsFile, JSON.stringify(this.jobs, null, 2));
        } catch (error) {
            console.error('Error saving jobs:', error);
        }
    }

    /**
     * Add a job to the queue
     * @param {string} audioFilePath - Path to uploaded audio file
     * @param {string} userEmail - User's email for notification
     * @param {Object} metadata - Additional metadata
     * @returns {Object} - Created job
     */
    async addToQueue(audioFilePath, userEmail, metadata = {}) {
        const jobId = uuidv4();

        // Move audio file to queue directory
        const audioFileName = `${jobId}${path.extname(audioFilePath)}`;
        const queuedAudioPath = path.join(this.audioDir, audioFileName);
        fs.copyFileSync(audioFilePath, queuedAudioPath);

        const job = {
            id: jobId,
            userEmail,
            audioFile: queuedAudioPath,
            audioFileName,
            status: 'queued',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            metadata,
            result: null,
            error: null,
            retries: 0
        };

        this.jobs.push(job);
        this.saveJobs();

        console.log(`📥 Job added to queue: ${jobId}`);
        console.log(`   Email: ${userEmail}`);
        console.log(`   Queue position: ${this.getQueuedCount()}`);

        return job;
    }

    /**
     * Get next job from queue
     * @returns {Object|null} - Next queued job or null
     */
    getNextJob() {
        const queuedJobs = this.jobs
            .filter(job => job.status === 'queued')
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

        return queuedJobs.length > 0 ? queuedJobs[0] : null;
    }

    /**
     * Update job status
     * @param {string} jobId - Job ID
     * @param {string} status - New status (queued, processing, completed, failed)
     * @param {Object} data - Additional data to update
     */
    updateJob(jobId, status, data = {}) {
        const job = this.jobs.find(j => j.id === jobId);
        if (!job) {
            console.error(`Job not found: ${jobId}`);
            return false;
        }

        job.status = status;
        job.updatedAt = new Date().toISOString();
        Object.assign(job, data);

        this.saveJobs();

        console.log(`✏️  Job updated: ${jobId}`);
        console.log(`   Status: ${status}`);

        return true;
    }

    /**
     * Mark job as completed
     * @param {string} jobId - Job ID
     * @param {Object} result - Analysis result
     */
    completeJob(jobId, result) {
        const job = this.jobs.find(j => j.id === jobId);
        if (!job) return false;

        job.status = 'completed';
        job.result = result;
        job.updatedAt = new Date().toISOString();
        job.completedAt = new Date().toISOString();

        this.saveJobs();

        // Clean up audio file after completion (optional - keep for 24h)
        // setTimeout(() => this.cleanupJobAudio(jobId), 24 * 60 * 60 * 1000);

        console.log(`✅ Job completed: ${jobId}`);

        return true;
    }

    /**
     * Mark job as failed
     * @param {string} jobId - Job ID
     * @param {string} error - Error message
     */
    failJob(jobId, error) {
        const job = this.jobs.find(j => j.id === jobId);
        if (!job) return false;

        job.status = 'failed';
        job.error = error;
        job.updatedAt = new Date().toISOString();
        job.retries = (job.retries || 0) + 1;

        // If retries < 3, requeue
        if (job.retries < 3) {
            job.status = 'queued';
            console.log(`🔄 Job requeued (retry ${job.retries}/3): ${jobId}`);
        } else {
            console.log(`❌ Job failed permanently: ${jobId}`);
        }

        this.saveJobs();

        return true;
    }

    /**
     * Get job by ID
     * @param {string} jobId - Job ID
     * @returns {Object|null} - Job object or null
     */
    getJob(jobId) {
        return this.jobs.find(j => j.id === jobId) || null;
    }

    /**
     * Get all jobs for a user email
     * @param {string} userEmail - User's email
     * @returns {Array} - Array of jobs
     */
    getJobsByEmail(userEmail) {
        return this.jobs.filter(j => j.userEmail === userEmail);
    }

    /**
     * Get count of queued jobs
     * @returns {number}
     */
    getQueuedCount() {
        return this.jobs.filter(j => j.status === 'queued').length;
    }

    /**
     * Get count of completed jobs
     * @returns {number}
     */
    getCompletedCount() {
        return this.jobs.filter(j => j.status === 'completed').length;
    }

    /**
     * Get count of failed jobs
     * @returns {number}
     */
    getFailedCount() {
        return this.jobs.filter(j => j.status === 'failed').length;
    }

    /**
     * Clean up old jobs (older than 7 days)
     */
    cleanupOldJobs() {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const before = this.jobs.length;

        this.jobs = this.jobs.filter(job => {
            const jobDate = new Date(job.createdAt);
            const shouldKeep = jobDate > sevenDaysAgo || job.status === 'queued';

            // Delete audio file for old jobs
            if (!shouldKeep && job.audioFile && fs.existsSync(job.audioFile)) {
                fs.unlinkSync(job.audioFile);
            }

            return shouldKeep;
        });

        const removed = before - this.jobs.length;
        if (removed > 0) {
            this.saveJobs();
            console.log(`🗑️  Cleaned up ${removed} old jobs`);
        }

        return removed;
    }

    /**
     * Clean up audio file for a specific job
     * @param {string} jobId - Job ID
     */
    cleanupJobAudio(jobId) {
        const job = this.getJob(jobId);
        if (job && job.audioFile && fs.existsSync(job.audioFile)) {
            fs.unlinkSync(job.audioFile);
            console.log(`🗑️  Deleted audio file for job: ${jobId}`);
        }
    }

    /**
     * Get queue statistics
     * @returns {Object} - Queue stats
     */
    getStats() {
        return {
            total: this.jobs.length,
            queued: this.getQueuedCount(),
            processing: this.jobs.filter(j => j.status === 'processing').length,
            completed: this.getCompletedCount(),
            failed: this.getFailedCount()
        };
    }
}

module.exports = QueueService;
