import { baseTemplate } from "./baseTemplate";

export function criticalRiskAlertEmail(options: {
  name?: string;
  riskTitle: string;
  severity: string;
  description?: string;
}) {
  const content = `
    <p>Dear ${options.name || "user"},</p>
    <p>A <strong>critical risk</strong> has been identified in the INSA Risk Management System:</p>
    <p><strong>${options.riskTitle}</strong> (severity: ${options.severity})</p>
    ${options.description ? `<p>${options.description}</p>` : ""}
    <p>Please review and take appropriate action as soon as possible.</p>
  `;

  return baseTemplate(content);
}
