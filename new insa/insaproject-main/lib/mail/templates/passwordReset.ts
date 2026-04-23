import { baseTemplate } from "./baseTemplate";

export function passwordResetEmail(options: { name?: string; resetLink: string }) {
  const content = `
    <p>Dear ${options.name || "user"},</p>
    <p>We received a request to reset the password for your INSA Risk Management System account.</p>
    <p>You can reset your password by clicking the link below:</p>
    <p><a href="${options.resetLink}">${options.resetLink}</a></p>
    <p>If you did not request this, you can safely ignore this email.</p>
  `;

  return baseTemplate(content);
}
