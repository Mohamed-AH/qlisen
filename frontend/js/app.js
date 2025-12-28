/**
 * Main Application Logic
 */

// Application State
const AppState = {
    isRecording: false,
    isProcessing: false,
    currentRecording: null
};

/**
 * Initialize application
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Check browser support
    if (!AudioRecorder.isSupported()) {
        alert(t('errorBrowserSupport'));
        document.getElementById('recordBtn').disabled = true;
        return;
    }

    // Load translations
    updatePageTranslations();

    // Load saved email
    const savedEmail = localStorage.getItem(CONFIG.STORAGE_KEYS.userEmail);
    if (savedEmail) {
        document.getElementById('userEmail').textContent = savedEmail;
    }

    // Check backend health
    try {
        const health = await api.checkHealth();
        console.log('Backend health:', health);
    } catch (error) {
        console.error('Backend check failed:', error);
    }

    console.log('Qlisen initialized');
});

/**
 * Toggle recording on/off
 */
async function toggleRecording() {
    if (AppState.isProcessing) {
        return; // Ignore clicks while processing
    }

    if (AppState.isRecording) {
        // Stop recording
        await stopRecording();
    } else {
        // Start recording
        await startRecording();
    }
}

/**
 * Start audio recording
 */
async function startRecording() {
    const result = await recorder.startRecording();

    if (!result.success) {
        UI.showError(result.error);
        return;
    }

    // Update state
    AppState.isRecording = true;

    // Update UI
    UI.updateRecordButton(true);
    UI.showRecordingStatus();

    console.log('Recording started');
}

/**
 * Stop recording and process
 */
async function stopRecording() {
    try {
        // Stop recorder
        const recordingResult = await recorder.stopRecording();

        if (!recordingResult.success) {
            UI.showError(t('errorRecording'));
            return;
        }

        // Update state
        AppState.isRecording = false;
        AppState.isProcessing = true;
        AppState.currentRecording = recordingResult;

        // Update UI
        UI.updateRecordButton(false);
        UI.hideRecordingStatus();
        UI.showProcessingStatus(t('transcribingText'));

        console.log('Recording stopped, duration:', recordingResult.duration, 'ms');
        console.log('Audio size:', recordingResult.blob.size, 'bytes');

        // Process audio
        await processRecording(recordingResult.blob);

    } catch (error) {
        console.error('Stop recording error:', error);
        UI.showError(t('errorRecording'));
        resetState();
    }
}

/**
 * Process recorded audio
 */
async function processRecording(audioBlob) {
    try {
        // Get user email
        const userEmail = localStorage.getItem(CONFIG.STORAGE_KEYS.userEmail) || '';

        // Update processing step
        UI.showProcessingStatus(t('analyzingText'));

        // Send to backend
        const result = await api.analyzeRecitation(audioBlob, userEmail);

        console.log('Analysis result:', result);

        if (!result.success) {
            UI.showError(result.error || t('errorProcessing'));
            resetState();
            return;
        }

        // Check if queued
        if (result.queued) {
            UI.showQueued(result.jobId);
            resetState();
            return;
        }

        // Show results
        UI.showResults(result);
        resetState();

    } catch (error) {
        console.error('Processing error:', error);
        UI.showError(t('errorProcessing'));
        resetState();
    }
}

/**
 * Reset application state
 */
function resetState() {
    AppState.isRecording = false;
    AppState.isProcessing = false;
    AppState.currentRecording = null;
}

/**
 * Reset and start over
 */
function resetRecording() {
    // Cancel any active recording
    if (AppState.isRecording) {
        recorder.cancelRecording();
    }

    // Reset state
    resetState();

    // Reset UI
    UI.reset();
}

/**
 * Prompt for email if not set
 */
function promptForEmail() {
    const currentEmail = localStorage.getItem(CONFIG.STORAGE_KEYS.userEmail);

    if (!currentEmail) {
        const lang = getCurrentLanguage();
        const prompt = lang === 'ar'
            ? 'أدخل بريدك الإلكتروني (اختياري):'
            : 'Enter your email (optional):';

        const email = window.prompt(prompt);

        if (email && email.trim()) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.userEmail, email.trim());
            document.getElementById('userEmail').textContent = email.trim();
        }
    }
}

// Prompt for email on first use
setTimeout(promptForEmail, 2000);

/**
 * Keyboard shortcuts
 */
document.addEventListener('keydown', (e) => {
    // Space bar to toggle recording
    if (e.code === 'Space' && !e.repeat && e.target.tagName !== 'INPUT') {
        e.preventDefault();
        toggleRecording();
    }

    // Escape to cancel/reset
    if (e.code === 'Escape') {
        if (AppState.isRecording) {
            resetRecording();
        } else {
            closeHelp();
        }
    }
});

// Prevent accidental page close while recording
window.addEventListener('beforeunload', (e) => {
    if (AppState.isRecording || AppState.isProcessing) {
        e.preventDefault();
        e.returnValue = '';
        return '';
    }
});

console.log('Qlisen app.js loaded');
