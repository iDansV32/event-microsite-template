import "server-only";

import { env } from "../env";
import { emailEnvFraming } from "../email/framing";

/**
 * Magic-link email. Uses the same Resend REST wrapper shape as the RSVP
 * email — kept separate rather than sharing the body so each template
 * can evolve independently.
 *
 * Subject and body are wrapped via emailEnvFraming() so staging/preview
 * sends get [TEST] prefix + visible body banner; production sends are
 * untouched. See lib/email/framing.ts for the rules.
 */

export interface LoginEmailParams {
  to: string;
  firstName?: string | null;
  brandClient: string;
  eventShortName: string;
  magicUrl: string;
  expiresInMinutes: number;
}

export class ResendError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ResendError";
    this.status = status;
  }
}

export async function sendLoginEmail(params: LoginEmailParams): Promise<void> {
  const { to, firstName, brandClient, eventShortName, magicUrl, expiresInMinutes } = params;

  const framing = emailEnvFraming();

  const greeting = firstName ? `Hi ${firstName},` : "Hi,";
  const subject = `${framing.subjectPrefix}Your sign-in link — ${eventShortName}`;

  const text = [
    framing.bodyBanner ? framing.bodyBanner.trimEnd() : null,
    greeting,
    "",
    `Here's your sign-in link for ${eventShortName}:`,
    magicUrl,
    "",
    `This link is good for ${expiresInMinutes} minutes. If it expires, you can request a new one from the login page.`,
    "",
    `— The ${brandClient} events team`,
  ]
    .filter((x): x is string => x !== null)
    .join("\n");

  const html = `
<!doctype html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F5F0E8; color: #1C2A24; margin: 0; padding: 32px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 520px; margin: 0 auto;">
      <tr>
        <td style="background: #FBF7F0; border-radius: 18px; padding: 40px;">
          ${framing.bodyBannerHtml}
          <p style="margin: 0 0 16px; font-size: 16px;">${escapeHtml(greeting)}</p>
          <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5;">
            Here&rsquo;s your sign-in link for <strong>${escapeHtml(eventShortName)}</strong>:
          </p>
          <p style="margin: 0 0 28px;">
            <a href="${escapeHtml(magicUrl)}" style="display: inline-block; background: #F15A29; color: #FBF7F0; text-decoration: none; padding: 12px 20px; border-radius: 999px; font-weight: 500;">Sign in</a>
          </p>
          <p style="margin: 0; font-size: 13px; color: rgba(28,42,36,0.55); line-height: 1.5;">
            This link is good for ${expiresInMinutes} minutes. If it expires, request a fresh one from the login page.
          </p>
          <p style="margin: 28px 0 0; font-size: 13px; color: rgba(28,42,36,0.55);">
            \u2014 The ${escapeHtml(brandClient)} events team
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.resend.apiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.resend.fromEmail(),
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ResendError(res.status, `Resend ${res.status}: ${body || res.statusText}`);
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
