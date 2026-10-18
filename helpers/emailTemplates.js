const brandName = process.env.APP_NAME || "ERP System";

const emailShell = ({ preheader, title, greeting, bodyHtml, buttonText, buttonUrl, footerNote }) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#0f172a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0f172a;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#111827;border-radius:20px;overflow:hidden;border:1px solid #1f2937;">
          <tr>
            <td style="padding:28px 32px;background:linear-gradient(135deg,#0ea5e9,#2563eb);">
              <p style="margin:0;color:#e0f2fe;font-size:13px;letter-spacing:2px;text-transform:uppercase;">${brandName}</p>
              <h1 style="margin:8px 0 0;color:#ffffff;font-size:26px;font-weight:700;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px 24px;color:#e5e7eb;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${greeting}</p>
              ${bodyHtml}
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
                <tr>
                  <td align="center" bgcolor="#2563eb" style="border-radius:12px;">
                    <a href="${buttonUrl}" target="_blank" style="display:inline-block;padding:14px 32px;color:#ffffff;text-decoration:none;font-size:16px;font-weight:700;letter-spacing:0.3px;">
                      ${buttonText}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#9ca3af;">
                If the button does not work, copy and paste this link into your browser:<br />
                <a href="${buttonUrl}" style="color:#38bdf8;word-break:break-all;">${buttonUrl}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 32px;">
              <div style="border-top:1px solid #1f2937;padding-top:18px;color:#6b7280;font-size:12px;line-height:1.6;">
                ${footerNote}
                <p style="margin:12px 0 0;">&copy; ${new Date().getFullYear()} ${brandName}. All rights reserved.</p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

const verificationEmail = ({ username, verifyUrl }) => {
  return emailShell({
    preheader: "Verify your email to activate your ERP account.",
    title: "Verify your email",
    greeting: `Hi ${username || "there"},`,
    bodyHtml: `
      <p style="margin:0;font-size:15px;line-height:1.7;color:#d1d5db;">
        Welcome to <strong style="color:#fff;">${brandName}</strong>. Please confirm this email address to activate your account and start using the system.
      </p>
      <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#d1d5db;">
        This verification link expires in <strong style="color:#fff;">24 hours</strong>.
      </p>
    `,
    buttonText: "Verify Email",
    buttonUrl: verifyUrl,
    footerNote:
      "If you did not create an account, you can safely ignore this email. No account will be activated without verification.",
  });
};

const resetPasswordEmail = ({ username, resetUrl }) => {
  return emailShell({
    preheader: "Reset your ERP account password.",
    title: "Reset your password",
    greeting: `Hi ${username || "there"},`,
    bodyHtml: `
      <p style="margin:0;font-size:15px;line-height:1.7;color:#d1d5db;">
        We received a request to reset the password for your <strong style="color:#fff;">${brandName}</strong> account.
      </p>
      <p style="margin:16px 0 0;font-size:15px;line-height:1.7;color:#d1d5db;">
        This reset link expires in <strong style="color:#fff;">15 minutes</strong>. If you did not ask for this, ignore this email and your password will stay the same.
      </p>
    `,
    buttonText: "Reset Password",
    buttonUrl: resetUrl,
    footerNote: "For your security, never share this link with anyone.",
  });
};

const resultPage = ({ success, title, message }) => {
  const color = success ? "#22c55e" : "#ef4444";
  const badge = success ? "Success" : "Something went wrong";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
</head>
<body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0f172a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e5e7eb;">
  <div style="width:min(460px,92%);background:#111827;border:1px solid #1f2937;border-radius:20px;padding:36px 28px;text-align:center;">
    <p style="display:inline-block;margin:0 0 16px;padding:6px 12px;border-radius:999px;background:${color}22;color:${color};font-size:12px;letter-spacing:1px;text-transform:uppercase;">${badge}</p>
    <h1 style="margin:0 0 12px;font-size:26px;">${title}</h1>
    <p style="margin:0;color:#9ca3af;line-height:1.7;">${message}</p>
  </div>
</body>
</html>`;
};

module.exports = {
  verificationEmail,
  resetPasswordEmail,
  resultPage,
};
