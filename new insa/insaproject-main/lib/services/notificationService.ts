import dbConnect from '@/lib/mongodb';
import Notification, { NotificationType, NotificationSeverity } from '@/models/Notification';
import { broadcastEvent } from '@/lib/sseHub';
import { sendMail } from '@/lib/mail/mailer';
import User from '@/models/User';

export async function createNotification(params: {
    type: NotificationType;
    severity: NotificationSeverity;
    title: string;
    message: string;
    link?: string;
}) {
    try {
        await dbConnect();
        const notification = await Notification.create(params);

        // Broadcast to all connected SSE clients
        broadcastEvent('notification', {
            id: notification._id.toString(),
            type: notification.type,
            severity: notification.severity,
            title: notification.title,
            message: notification.message,
            link: notification.link,
            createdAt: notification.createdAt,
        });

        return notification;
    } catch (error) {
        console.error('[NotificationService] Failed to create notification:', error);
        return null;
    }
}

export async function notifyNewQuestionnaire(params: {
    company: string;
    filledBy: string;
    role: string;
    questionnaireId: string;
}) {
    const { company, filledBy, role, questionnaireId } = params;

    // Create in-app notification
    await createNotification({
        type: 'questionnaire',
        severity: 'info',
        title: 'New Questionnaire Received',
        message: `From ${company} by ${filledBy} (${role})`,
        link: `/questionnaires`,
    });

    // Send email to all Directors and Division Heads
    try {
        await dbConnect();
        const recipients = await User.find({
            role: { $in: ['Director', 'Division Head'] },
        }).select('email name').lean();

        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
        const toEmails = recipients.map((u: any) => u.email).filter(Boolean);
        if (adminEmail && !toEmails.includes(adminEmail)) toEmails.push(adminEmail);

        if (toEmails.length > 0) {
            await sendMail({
                to: toEmails.join(','),
                subject: `New Assessment Received: ${company}`,
                html: `
          <h2>New Questionnaire Received</h2>
          <p><strong>Organization:</strong> ${company}</p>
          <p><strong>Filled By:</strong> ${filledBy}</p>
          <p><strong>Role:</strong> ${role}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          <p>Please log in to the CSRARS platform to review and analyze this assessment.</p>
        `,
            });
        }
    } catch (err) {
        console.error('[NotificationService] Email failed (non-critical):', err);
    }
}

export async function notifyCriticalRisk(params: {
    company: string;
    analysisId: string;
    criticalCount: number;
}) {
    const { company, analysisId, criticalCount } = params;

    await createNotification({
        type: 'critical',
        severity: 'critical',
        title: '🚨 Critical Risk Detected',
        message: `${criticalCount} critical risk(s) found for ${company}. Immediate action required.`,
        link: `/risk-analysis`,
    });
}

export async function notifyAnalysisComplete(params: {
    company: string;
    analysisId: string;
    overallRisk: string;
}) {
    const { company, overallRisk } = params;
    const severity = overallRisk === 'CRITICAL' ? 'critical' :
        overallRisk === 'HIGH' ? 'high' :
            overallRisk === 'MEDIUM' ? 'medium' : 'low';

    await createNotification({
        type: 'analysis',
        severity,
        title: 'Risk Analysis Completed',
        message: `Analysis for ${company} completed. Overall risk: ${overallRisk}`,
        link: `/risk-analysis`,
    });
}

export async function notifyAssetScan(params: {
    company: string;
    assetsFound: number;
}) {
    await createNotification({
        type: 'asset',
        severity: 'info',
        title: 'Asset Scan Completed',
        message: `${params.assetsFound} asset(s) discovered for ${params.company}`,
        link: `/assets`,
    });
}

export async function notifyThreatFound(params: {
    company: string;
    threatCount: number;
    maxSeverity: string;
}) {
    const severity = params.maxSeverity === 'critical' ? 'critical' :
        params.maxSeverity === 'high' ? 'high' : 'medium';

    await createNotification({
        type: 'threat',
        severity,
        title: 'Threat Intelligence Alert',
        message: `${params.threatCount} threat(s) detected for ${params.company}`,
        link: `/threats`,
    });
}
