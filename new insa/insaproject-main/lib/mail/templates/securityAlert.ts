import { baseTemplate } from "./baseTemplate";

export function securityAlertEmail(options: { name?: string; action: string }) {
	const content = `
		<p>Dear ${options.name || "user"},</p>
		<p>A security-related action was detected on your account in the INSA Risk Management System:</p>
		<p><strong>${options.action}</strong></p>
		<p>If this was not you, please contact your system administrator immediately.</p>
	`;

	return baseTemplate(content);
}

