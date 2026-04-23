export function baseTemplate(content: string): string {
	return `
		<html>
			<body style="font-family: Arial, sans-serif; background-color: #f5f5f5; padding: 24px;">
				<table width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden;">
					<tr>
						<td style="background-color: #111827; color: #ffffff; padding: 16px 24px; font-size: 18px; font-weight: 600;">
							INSA Risk Management System
						</td>
					</tr>
					<tr>
						<td style="padding: 24px; color: #111827; font-size: 14px; line-height: 1.5;">
							${content}
						</td>
					</tr>
					<tr>
						<td style="padding: 16px 24px; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb;">
							This is an automated message from the INSA Risk Management System.
						</td>
					</tr>
				</table>
			</body>
		</html>
	`;
}

