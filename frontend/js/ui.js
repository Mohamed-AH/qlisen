/**
 * UI Update and Display Logic
 */

const UI = {
    /**
     * Show recording status
     */
    showRecordingStatus() {
        document.getElementById('recordingStatus').classList.remove('hidden');
        document.getElementById('processingStatus').classList.add('hidden');
        document.getElementById('resultsSection').classList.add('hidden');
        document.getElementById('queuedSection').classList.add('hidden');
    },

    /**
     * Hide recording status
     */
    hideRecordingStatus() {
        document.getElementById('recordingStatus').classList.add('hidden');
    },

    /**
     * Show processing status
     */
    showProcessingStatus(step = '') {
        document.getElementById('processingStatus').classList.remove('hidden');
        document.getElementById('recordingStatus').classList.add('hidden');
        document.getElementById('resultsSection').classList.add('hidden');
        document.getElementById('queuedSection').classList.add('hidden');

        if (step) {
            document.getElementById('processingStep').textContent = step;
        }
    },

    /**
     * Hide processing status
     */
    hideProcessingStatus() {
        document.getElementById('processingStatus').classList.add('hidden');
    },

    /**
     * Update record button
     */
    updateRecordButton(isRecording) {
        const btn = document.getElementById('recordBtn');
        const icon = document.getElementById('recordIcon');
        const text = document.getElementById('recordText');

        if (isRecording) {
            btn.classList.add('recording');
            icon.textContent = t('stopIcon');
            text.textContent = t('stopText');
        } else {
            btn.classList.remove('recording');
            icon.textContent = t('recordIcon');
            text.textContent = t('recordText');
        }
    },

    /**
     * Display analysis results
     */
    showResults(result) {
        // Hide other sections
        document.getElementById('processingStatus').classList.add('hidden');
        document.getElementById('queuedSection').classList.add('hidden');

        // Show results section
        const resultsSection = document.getElementById('resultsSection');
        resultsSection.classList.remove('hidden');

        // Surah info
        const lang = getCurrentLanguage();
        const surahName = lang === 'ar' ? result.analysis.surahNameArabic || result.analysis.surah : result.analysis.surah;
        document.getElementById('surahName').textContent = surahName;
        document.getElementById('verseRange').textContent =
            `${t('verse')} ${result.analysis.startVerse} - ${result.analysis.endVerse}`;

        // Accuracy
        const accuracyPercent = Math.round(result.analysis.accuracy * 100);
        document.getElementById('accuracyPercent').textContent = `${accuracyPercent}%`;

        // Transcript
        document.getElementById('transcriptText').textContent = result.transcript;

        // Verses list
        const versesList = document.getElementById('versesList');
        versesList.innerHTML = '';

        if (result.analysis.verses && result.analysis.verses.length > 0) {
            result.analysis.verses.forEach(verse => {
                versesList.appendChild(this.createVerseElement(verse));
            });
        }

        // Recommendations
        if (result.analysis.recommendations && result.analysis.recommendations.length > 0) {
            document.getElementById('recommendationsSection').classList.remove('hidden');
            const recommendationsList = document.getElementById('recommendationsList');
            recommendationsList.innerHTML = result.analysis.recommendations
                .map(rec => `<li>${rec}</li>`)
                .join('');
        } else {
            document.getElementById('recommendationsSection').classList.add('hidden');
        }

        // Scroll to results
        resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Create verse element
     */
    createVerseElement(verse) {
        const div = document.createElement('div');
        div.className = `verse-item ${verse.status}`;

        // Verse header
        const header = document.createElement('div');
        header.className = 'verse-header';

        const verseNumber = document.createElement('span');
        verseNumber.className = 'verse-number';
        verseNumber.textContent = `${t('verse')} ${verse.ayah}`;

        const verseStatus = document.createElement('span');
        verseStatus.className = `verse-status ${verse.status}`;
        verseStatus.textContent = this.getStatusIcon(verse.status) + ' ' + this.getStatusText(verse.status);

        header.appendChild(verseNumber);
        header.appendChild(verseStatus);

        // Verse text
        const verseText = document.createElement('div');
        verseText.className = 'verse-text';
        verseText.textContent = verse.text;

        // Verse stats
        const verseStats = document.createElement('div');
        verseStats.className = 'verse-stats';
        verseStats.innerHTML = `
            <span>${verse.wordsMatched} ${t('wordsMatched')}</span>
            <span>${verse.wordsMissing} ${t('wordsMissing')}</span>
            <span>${Math.round(verse.accuracy * 100)}% ${t('accuracyLabel')}</span>
        `;

        div.appendChild(header);
        div.appendChild(verseText);
        div.appendChild(verseStats);

        // Warning for missing words
        if (verse.wordsMissing > 0) {
            const warning = document.createElement('div');
            warning.className = 'verse-warning';
            warning.textContent = `⚠️ ${verse.wordsMissing} ${t('wordsMissing')}`;
            div.appendChild(warning);
        }

        return div;
    },

    /**
     * Get status icon
     */
    getStatusIcon(status) {
        const icons = {
            perfect: '✅',
            good: '✓',
            partial: '⚠️',
            skipped: '❌'
        };
        return icons[status] || '';
    },

    /**
     * Get status text
     */
    getStatusText(status) {
        return t(`status${status.charAt(0).toUpperCase() + status.slice(1)}`);
    },

    /**
     * Show queued message
     */
    showQueued(jobId) {
        // Hide other sections
        document.getElementById('processingStatus').classList.add('hidden');
        document.getElementById('resultsSection').classList.add('hidden');

        // Show queued section
        const queuedSection = document.getElementById('queuedSection');
        queuedSection.classList.remove('hidden');

        document.getElementById('jobId').textContent = jobId;

        // Scroll to queued section
        queuedSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /**
     * Show error message
     */
    showError(errorMessage) {
        this.hideProcessingStatus();
        alert(errorMessage); // Simple alert for now
    },

    /**
     * Reset to initial state
     */
    reset() {
        // Hide all sections
        document.getElementById('recordingStatus').classList.add('hidden');
        document.getElementById('processingStatus').classList.add('hidden');
        document.getElementById('resultsSection').classList.add('hidden');
        document.getElementById('queuedSection').classList.add('hidden');

        // Reset button
        this.updateRecordButton(false);

        // Clear timer
        document.getElementById('recordingTimer').textContent = '00:00';

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
};

/**
 * Show help modal
 */
function showHelp() {
    document.getElementById('helpModal').classList.remove('hidden');
}

/**
 * Close help modal
 */
function closeHelp() {
    document.getElementById('helpModal').classList.add('hidden');
}

// Close modal on background click
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('helpModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeHelp();
            }
        });
    }
});
