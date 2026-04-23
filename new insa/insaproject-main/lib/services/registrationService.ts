import Registration from '@/models/Registration';
import { sendMail } from '@/lib/mail/mailer';

function generateCertificateNumber(): string {
    const year = new Date().getFullYear();
    const random = Math.floor(10000 + Math.random() * 90000);
    return `INSA-${year}-${random}`;
}

function getOverallRiskLevel(summary: any): string {
    try {
        const dist = summary?.overall?.riskDistribution || {};
        if (dist.CRITICAL > 0) return 'CRITICAL';
        if (dist.HIGH > 0) return 'HIGH';
        if (dist.MEDIUM > 0) return 'MEDIUM';
        if (dist.LOW > 0) return 'LOW';
        return 'VERY_LOW';
    } catch {
        return 'UNKNOWN';
    }
}

export async function registerAssessment(params: {
    questionnaireId: string;
    analysisId: string;
    company: string;
    summary: any;
}): Promise<{ success: boolean; certificateNumber?: string; error?: string }> {
    try {
        // Check if already registered
        const existing = await Registration.findOne({ analysisId: params.analysisId });
        if (existing) {
            return { success: true, certificateNumber: existing.certificateNumber };
        }

        const certificateNumber = generateCertificateNumber();
        const overallRiskLevel = getOverallRiskLevel(params.summary);

        await Registration.create({
            questionnaireId: params.questionnaireId,
            analysisId: params.analysisId,
            company: params.company,
            certificateNumber,
            overallRiskLevel,
            status: 'registered',
        });

        // Send admin notification — non-blocking
        try {
            const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
            if (adminEmail) {
                await sendMail({
                    to: adminEmail,
                    subject: `New Assessment Registered: ${params.company}`,
                    html: `
            <h2>New Assessment Registered</h2>
            <p><strong>Organization:</strong> ${params.company}</p>
            <p><strong>Certificate No:</strong> ${certificateNumber}</p>
            <p><strong>Overall Risk Level:</strong> ${overallRiskLevel}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          `,
                });
            }
        } catch (mailErr) {
            console.error('Registration notification email failed (non-critical):', mailErr);
        }

        return { success: true, certificateNumber };
    } catch (error: any) {
        console.error('Registration failed (non-critical):', error);
        return { success: false, error: error.message };
    }
}
