const sgMail = require('@sendgrid/mail');

/**
 * Email Service for sending notifications
 * Uses SendGrid (free tier: 100 emails/day)
 */
class EmailService {
    constructor() {
        this.apiKey = process.env.SENDGRID_API_KEY;
        this.fromEmail = process.env.FROM_EMAIL || 'noreply@qlisen.com';
        this.frontendURL = process.env.FRONTEND_URL || 'https://qlisen.onrender.com';

        if (this.apiKey) {
            sgMail.setApiKey(this.apiKey);
            console.log('📧 Email Service initialized with SendGrid');
        } else {
            console.warn('⚠️  SENDGRID_API_KEY not configured - emails will not be sent');
        }
    }

    /**
     * Send email notification when transcription is ready
     * @param {string} toEmail - Recipient email
     * @param {Object} result - Analysis result
     * @param {string} jobId - Job ID
     * @returns {Promise<boolean>} - Success status
     */
    async sendResultEmail(toEmail, result, jobId) {
        if (!this.apiKey) {
            console.warn('⚠️  Skipping email (SendGrid not configured)');
            return false;
        }

        try {
            const msg = {
                to: toEmail,
                from: this.fromEmail,
                subject: 'Your Quran Recitation Analysis is Ready ✅',
                html: this.generateResultHTML(result, jobId),
                text: this.generateResultText(result, jobId)
            };

            await sgMail.send(msg);
            console.log(`📧 Email sent to: ${toEmail}`);
            return true;

        } catch (error) {
            console.error('❌ Email send error:', error.message);
            if (error.response) {
                console.error('   Response:', error.response.body);
            }
            return false;
        }
    }

    /**
     * Send error notification email
     * @param {string} toEmail - Recipient email
     * @param {string} errorMessage - Error message
     * @param {string} jobId - Job ID
     * @returns {Promise<boolean>} - Success status
     */
    async sendErrorEmail(toEmail, errorMessage, jobId) {
        if (!this.apiKey) {
            console.warn('⚠️  Skipping email (SendGrid not configured)');
            return false;
        }

        try {
            const msg = {
                to: toEmail,
                from: this.fromEmail,
                subject: 'Issue with Your Recitation Analysis ⚠️',
                html: this.generateErrorHTML(errorMessage, jobId),
                text: this.generateErrorText(errorMessage, jobId)
            };

            await sgMail.send(msg);
            console.log(`📧 Error email sent to: ${toEmail}`);
            return true;

        } catch (error) {
            console.error('❌ Email send error:', error.message);
            return false;
        }
    }

    /**
     * Generate HTML email body for successful result
     */
    generateResultHTML(result, jobId) {
        const accuracy = result.accuracy ? (result.accuracy * 100).toFixed(1) : 'N/A';

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
        }
        .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .result-box {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .result-item {
            padding: 10px 0;
            border-bottom: 1px solid #eee;
        }
        .result-item:last-child {
            border-bottom: none;
        }
        .label {
            font-weight: bold;
            color: #667eea;
        }
        .value {
            color: #333;
            font-size: 18px;
        }
        .arabic {
            font-size: 24px;
            direction: rtl;
            text-align: right;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            color: #888;
            margin-top: 30px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>✅ Your Recitation Analysis is Ready!</h1>
    </div>

    <div class="content">
        <p>السلام عليكم,</p>

        <p>Your Quran recitation has been analyzed successfully. Here are the results:</p>

        <div class="result-box">
            <div class="result-item">
                <div class="label">Surah:</div>
                <div class="value arabic">${result.surahNameArabic || result.surah}</div>
                <div class="value">${result.surah}</div>
            </div>

            <div class="result-item">
                <div class="label">Verses:</div>
                <div class="value">${result.startVerse} - ${result.endVerse} (${result.verseCount || 1} verse${result.verseCount > 1 ? 's' : ''})</div>
            </div>

            <div class="result-item">
                <div class="label">Accuracy:</div>
                <div class="value">${accuracy}%</div>
            </div>

            <div class="result-item">
                <div class="label">Method:</div>
                <div class="value">${result.method === 'fast_path' ? 'Fast Detection' : 'N-gram Analysis'}</div>
            </div>
        </div>

        <center>
            <a href="${this.frontendURL}/results/${jobId}" class="button">
                View Detailed Results
            </a>
        </center>

        <p style="margin-top: 30px; color: #666;">
            Keep practicing your recitation! May Allah accept your efforts.
        </p>

        <p style="color: #666;">
            جزاك الله خيراً
        </p>
    </div>

    <div class="footer">
        <p>This is an automated message from Qlisen - Quran Recitation Verifier</p>
        <p>Job ID: ${jobId}</p>
    </div>
</body>
</html>
        `;
    }

    /**
     * Generate plain text email body for successful result
     */
    generateResultText(result, jobId) {
        const accuracy = result.accuracy ? (result.accuracy * 100).toFixed(1) : 'N/A';

        return `
السلام عليكم,

Your Quran recitation has been analyzed successfully!

RESULTS:
--------
Surah: ${result.surah} (${result.surahNameArabic || ''})
Verses: ${result.startVerse} - ${result.endVerse} (${result.verseCount || 1} verse${result.verseCount > 1 ? 's' : ''})
Accuracy: ${accuracy}%
Method: ${result.method === 'fast_path' ? 'Fast Detection' : 'N-gram Analysis'}

View detailed results: ${this.frontendURL}/results/${jobId}

Keep practicing your recitation! May Allah accept your efforts.

جزاك الله خيراً

---
This is an automated message from Qlisen - Quran Recitation Verifier
Job ID: ${jobId}
        `;
    }

    /**
     * Generate HTML email body for error
     */
    generateErrorHTML(errorMessage, jobId) {
        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .header {
            background: #e74c3c;
            color: white;
            padding: 30px;
            border-radius: 10px 10px 0 0;
            text-align: center;
        }
        .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 10px 10px;
        }
        .error-box {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 20px;
            margin: 20px 0;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
        .footer {
            text-align: center;
            color: #888;
            margin-top: 30px;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>⚠️ Issue with Your Recitation Analysis</h1>
    </div>

    <div class="content">
        <p>السلام عليكم,</p>

        <p>We encountered an issue while analyzing your Quran recitation:</p>

        <div class="error-box">
            <strong>Error:</strong> ${errorMessage}
        </div>

        <p>Please try again with a clear audio recording of your recitation. Make sure:</p>
        <ul>
            <li>The audio is clear and not too noisy</li>
            <li>You're reciting from the Quran</li>
            <li>The recitation is in Arabic</li>
            <li>The audio file is not too long (max 2 minutes recommended)</li>
        </ul>

        <center>
            <a href="${this.frontendURL}" class="button">
                Try Again
            </a>
        </center>

        <p style="color: #666; margin-top: 30px;">
            If the problem persists, please contact support.
        </p>
    </div>

    <div class="footer">
        <p>This is an automated message from Qlisen - Quran Recitation Verifier</p>
        <p>Job ID: ${jobId}</p>
    </div>
</body>
</html>
        `;
    }

    /**
     * Generate plain text email body for error
     */
    generateErrorText(errorMessage, jobId) {
        return `
السلام عليكم,

We encountered an issue while analyzing your Quran recitation:

ERROR: ${errorMessage}

Please try again with a clear audio recording. Make sure:
- The audio is clear and not too noisy
- You're reciting from the Quran
- The recitation is in Arabic
- The audio file is not too long (max 2 minutes recommended)

Try again: ${this.frontendURL}

If the problem persists, please contact support.

---
This is an automated message from Qlisen - Quran Recitation Verifier
Job ID: ${jobId}
        `;
    }
}

module.exports = EmailService;
