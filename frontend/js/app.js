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
 * Device Detection
 */
function detectDevice() {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera;

    return {
        isIOS: /iPad|iPhone|iPod/.test(userAgent) && !window.MSStream,
        isAndroid: /android/i.test(userAgent),
        isMobile: /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent),
        isDesktop: !/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent)
    };
}

/**
 * Setup UI based on device capabilities
 */
function setupDeviceUI() {
    const device = detectDevice();
    const recordBtn = document.getElementById('recordBtn');
    const uploadBtn = document.getElementById('uploadBtn');
    const divider = document.getElementById('optionDivider');
    const recordInstructions = document.getElementById('recordInstructions');
    const uploadInstructions = document.getElementById('uploadInstructions');

    // Check MediaRecorder support
    const hasMediaRecorder = AudioRecorder.isSupported();

    if (device.isIOS) {
        // iOS: Prefer file upload (MediaRecorder unreliable)
        recordBtn.classList.add('hidden');
        uploadBtn.classList.remove('hidden');
        divider.classList.add('hidden');
        recordInstructions.classList.add('hidden');
        uploadInstructions.classList.remove('hidden');
        console.log('iOS detected: Showing upload only');

    } else if (device.isAndroid) {
        // Android: Show both options
        if (hasMediaRecorder) {
            recordBtn.classList.remove('hidden');
            uploadBtn.classList.remove('hidden');
            divider.classList.remove('hidden');
            console.log('Android detected: Showing both options');
        } else {
            // Old Android without MediaRecorder
            recordBtn.classList.add('hidden');
            uploadBtn.classList.remove('hidden');
            divider.classList.add('hidden');
            recordInstructions.classList.add('hidden');
            uploadInstructions.classList.remove('hidden');
            console.log('Old Android detected: Showing upload only');
        }

    } else {
        // Desktop: Show both options
        recordBtn.classList.remove('hidden');
        uploadBtn.classList.remove('hidden');
        divider.classList.remove('hidden');
        console.log('Desktop detected: Showing both options');
    }
}

/**
 * Initialize application
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Load translations
    updatePageTranslations();

    // Setup UI based on device
    setupDeviceUI();

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
 * Trigger file input dialog
 */
function triggerFileUpload() {
    if (AppState.isProcessing) {
        return; // Ignore clicks while processing
    }

    const fileInput = document.getElementById('fileInput');
    fileInput.click();
}

/**
 * Handle file upload
 */
async function handleFileUpload(event) {
    const file = event.target.files[0];

    if (!file) {
        return;
    }

    // Validate file type
    if (!file.type.startsWith('audio/')) {
        UI.showError(t('errorFileType') || 'Please select an audio file');
        return;
    }

    // Validate file size (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
        UI.showError(t('errorFileSize') || 'File size must be less than 50MB');
        return;
    }

    console.log('File selected:', file.name, file.type, file.size, 'bytes');

    // Update state
    AppState.isProcessing = true;

    // Show processing status
    UI.showProcessingStatus(t('transcribingText'));

    // Process the file
    await processRecording(file);

    // Clear file input for next upload
    event.target.value = '';
}

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
