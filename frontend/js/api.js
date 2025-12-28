/**
 * Backend API Communication
 */

class API {
    constructor(baseURL) {
        this.baseURL = baseURL;
    }

    /**
     * Send audio for transcription and analysis
     */
    async analyzeRecitation(audioBlob, userEmail = '') {
        try {
            const formData = new FormData();
            formData.append('audio', audioBlob, 'recitation.ogg');

            if (userEmail) {
                formData.append('email', userEmail);
            }

            const response = await fetch(
                `${this.baseURL}${CONFIG.API_ENDPOINTS.analyze}`,
                {
                    method: 'POST',
                    body: formData
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            return result;

        } catch (error) {
            console.error('API Error:', error);
            return {
                success: false,
                error: error.message || t('errorNetwork')
            };
        }
    }

    /**
     * Check job status by ID
     */
    async checkJobStatus(jobId) {
        try {
            const response = await fetch(
                `${this.baseURL}${CONFIG.API_ENDPOINTS.job}/${jobId}`
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            console.error('API Error:', error);
            return {
                success: false,
                error: error.message || t('errorNetwork')
            };
        }
    }

    /**
     * Get queue statistics
     */
    async getQueueStats() {
        try {
            const response = await fetch(
                `${this.baseURL}${CONFIG.API_ENDPOINTS.queueStats}`
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            console.error('API Error:', error);
            return {
                success: false,
                error: error.message || t('errorNetwork')
            };
        }
    }

    /**
     * Check backend health
     */
    async checkHealth() {
        try {
            const response = await fetch(
                `${this.baseURL}${CONFIG.API_ENDPOINTS.health}`
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();

        } catch (error) {
            console.error('API Error:', error);
            return {
                success: false,
                error: error.message || t('errorNetwork')
            };
        }
    }
}

// Create global instance
const api = new API(CONFIG.API_BASE_URL);
