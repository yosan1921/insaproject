import { baseTemplate } from "./baseTemplate";

export function roleChangeNotificationEmail(options: {
  name?: string;
  oldRole?: string;
  newRole: string;
}) {
  const content = `
    <p>Dear ${options.name || "user"},</p>
    <p>Your role in the INSA Risk Management System has been updated.</p>
    ${options.oldRole ? `<p>Previous role: <strong>${options.oldRole}</strong></p>` : ""}
    <p>New role: <strong>${options.newRole}</strong></p>
    <p>If you did not expect this change, please contact your administrator immediately.</p>
  `;

  return baseTemplate(content);
}
