import { baseTemplate } from "./baseTemplate";

export function accountUpdatedEmail(options: { name?: string; changes: string[] }) {
	const list = options.changes
		.map((c) => `<li>${c}</li>`)
		.join("");

	const content = `
		<p>Dear ${options.name || "user"},</p>
		<p>Your account details have been updated in the INSA Risk Management System.</p>
		<p>The following changes were recorded:</p>
		<ul>${list}</ul>
		<p>If you did not perform these changes, please contact your system administrator immediately.</p>
	`;

	return baseTemplate(content);
}

