/**
 * Audio Recording Handler
 */

class AudioRecorder {
    constructor() {
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.stream = null;
        this.startTime = null;
        this.timerInterval = null;
    }

    /**
     * Check if browser supports recording
     */
    static isSupported() {
        return BROWSER_SUPPORT.mediaRecorder && BROWSER_SUPPORT.getUserMedia;
    }

    /**
     * Request microphone permission and start recording
     */
    async startRecording() {
        try {
            // Request microphone access
            this.stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            });

            // Determine supported MIME type
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : 'audio/ogg;codecs=opus';

            // Create MediaRecorder
            this.mediaRecorder = new MediaRecorder(this.stream, {
                mimeType: mimeType,
                audioBitsPerSecond: CONFIG.RECORDING.audioBitsPerSecond
            });

            // Reset audio chunks
            this.audioChunks = [];

            // Handle data available event
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };

            // Start recording
            this.mediaRecorder.start();
            this.startTime = Date.now();
            this.startTimer();

            return { success: true };

        } catch (error) {
            console.error('Recording error:', error);
            return {
                success: false,
                error: error.name === 'NotAllowedError'
                    ? t('errorMicPermission')
                    : t('errorRecording')
            };
        }
    }

    /**
     * Stop recording and return audio blob
     */
    async stopRecording() {
        return new Promise((resolve, reject) => {
            if (!this.mediaRecorder) {
                reject(new Error('No active recording'));
                return;
            }

            // Handle stop event
            this.mediaRecorder.onstop = () => {
                // Create blob from chunks
                const mimeType = this.mediaRecorder.mimeType;
                const audioBlob = new Blob(this.audioChunks, { type: mimeType });

                // Stop all tracks
                if (this.stream) {
                    this.stream.getTracks().forEach(track => track.stop());
                }

                // Stop timer
                this.stopTimer();

                // Calculate duration
                const duration = Date.now() - this.startTime;

                resolve({
                    success: true,
                    blob: audioBlob,
                    duration: duration,
                    mimeType: mimeType
                });

                // Reset
                this.mediaRecorder = null;
                this.stream = null;
                this.audioChunks = [];
            };

            // Stop recording
            this.mediaRecorder.stop();
        });
    }

    /**
     * Get current recording state
     */
    isRecording() {
        return this.mediaRecorder && this.mediaRecorder.state === 'recording';
    }

    /**
     * Start recording timer
     */
    startTimer() {
        const timerElement = document.getElementById('recordingTimer');

        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);

            if (timerElement) {
                timerElement.textContent =
                    `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }

            // Auto-stop at max duration
            if (elapsed >= CONFIG.RECORDING.maxDuration) {
                this.stopRecording();
            }
        }, 100);
    }

    /**
     * Stop recording timer
     */
    stopTimer() {
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
    }

    /**
     * Cancel recording without saving
     */
    cancelRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }

        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
        }

        this.stopTimer();
        this.audioChunks = [];
        this.mediaRecorder = null;
        this.stream = null;
    }
}

// Create global instance
const recorder = new AudioRecorder();
