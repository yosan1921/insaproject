import nodemailer from "nodemailer";

const host = process.env.EMAIL_HOST;
const port = process.env.EMAIL_PORT ? Number(process.env.EMAIL_PORT) : undefined;
const user = process.env.EMAIL_USER;
const pass = process.env.EMAIL_PASS;
const from = process.env.EMAIL_FROM || "no-reply@localhost";

export const mailEnabled = !!(host && port && user && pass);

const transporter = mailEnabled
	? nodemailer.createTransport({
		host,
		port,
		secure: port === 465,
		auth: { user, pass },
	})
	: null;

export async function sendMail(options: {
	to: string;
	subject: string;
	html: string;
}) {
	if (!transporter) {
		console.log('Email not sent - transporter not configured. host:', host, 'port:', port, 'user:', user, 'pass:', pass ? '***set***' : 'NOT SET');
		return;
	}

	await transporter.sendMail({
		from,
		to: options.to,
		subject: options.subject,
		html: options.html,
	});
	console.log('Email sent to:', options.to, 'subject:', options.subject);
}

