import "server-only";

import { env } from "./env";
import { emailEnvFraming } from "./email/framing";

/**
 * Thin wrapper over the Resend REST API (no SDK dependency). Only the
 * typed templates are exported — `sendRsvpEmail` and
 * `sendFeedbackEmail` — other callers shouldn't be sending mail
 * without a typed template.
 *
 * Subject and body are wrapped via emailEnvFraming() so staging/preview
 * sends get [TEST] prefix + visible body banner; production sends are
 * untouched. See lib/email/framing.ts for the rules.
 *
 * https://resend.com/docs/api-reference/emails/send-email
 */

interface ResendSendParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class ResendError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ResendError";
    this.status = status;
  }
}

async function sendEmail(params: ResendSendParams): Promise<void> {
  const apiKey = env.resend.apiKey();
  const from = env.resend.fromEmail();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new ResendError(res.status, `Resend ${res.status}: ${body || res.statusText}`);
  }
}

export interface RsvpEmailParams {
  to: string;
  firstName: string;
  attending: "yes" | "no";
  brandClient: string;
  eventShortName: string;
  editUrl: string;
}

/**
 * Send the "your RSVP is recorded" confirmation email. Called from
 * /api/rsvp/[slug] after a successful upsert and from
 * /api/rsvp/[slug]/resend-link to re-send the confirmation.
 *
 * editUrl points to /e/<slug>/registration. The URL is NOT a standalone
 * credential \u2014 the site is fully auth-gated. If the recipient isn't
 * logged in on this device, clicking the link drops them at the login
 * page with the registration page preserved as next=, they go through
 * magic-link auth, and land back at the registration page where their
 * existing RSVP is read off session email and pre-filled. No token
 * signing, no expiry, no edit-link management \u2014 auth handles it.
 */
export async function sendRsvpEmail(params: RsvpEmailParams): Promise<void> {
  const {
    to,
    firstName,
    attending,
    brandClient,
    eventShortName,
    editUrl,
  } = params;

  const framing = emailEnvFraming();

  const subjectBase =
    attending === "yes"
      ? `You're in \u2014 ${eventShortName}`
      : `RSVP received \u2014 ${eventShortName}`;
  const subject = `${framing.subjectPrefix}${subjectBase}`;

  const lede =
    attending === "yes"
      ? `Thanks for confirming, ${firstName}. We\u2019re glad you\u2019ll be there.`
      : `Thanks for letting us know, ${firstName}. Sorry you can\u2019t make it \u2014 we\u2019ll miss you.`;

  const text = [
    framing.bodyBanner ? framing.bodyBanner.trimEnd() : null,
    `Hi ${firstName},`,
    "",
    lede,
    "",
    `To update your RSVP, head back to the registration page:`,
    editUrl,
    "",
    `You can change your answer anytime before registration closes. If you\u2019re signed out on a new device, we\u2019ll ask you to log in first.`,
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
          <p style="margin: 0 0 16px; font-size: 16px;">Hi ${escapeHtml(firstName)},</p>
          <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5;">${escapeHtml(lede)}</p>
          <p style="margin: 0 0 12px; font-size: 15px;">To update your RSVP:</p>
          <p style="margin: 0 0 28px;">
            <a href="${escapeHtml(editUrl)}" style="display: inline-block; background: #F15A29; color: #FBF7F0; text-decoration: none; padding: 12px 20px; border-radius: 999px; font-weight: 500;">Edit my RSVP</a>
          </p>
          <p style="margin: 0; font-size: 13px; color: rgba(28,42,36,0.55); line-height: 1.5;">
            You can change your answer anytime before registration closes. If you\u2019re signed out on a new device, we\u2019ll ask you to log in first.
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

  await sendEmail({ to, subject, html, text });
}

export interface FeedbackEmailParams {
  to: string;
  firstName: string;
  brandClient: string;
  eventShortName: string;
  /** Absolute URL to /e/<slug>/feedback — never a tally.so link; the
      auth-gated page is the front door. */
  feedbackUrl: string;
}

/** Framed subject for the feedback email — exported so the organizer
    send route's dry-run output shows the operator exactly what will go
    out (including whether the [TEST] prefix applies). */
export function feedbackEmailSubject(eventShortName: string): string {
  const framing = emailEnvFraming();
  return `${framing.subjectPrefix}How was ${eventShortName}? Share your feedback`;
}

/**
 * Send the post-event "share your feedback" email. Called from
 * /api/internal/[slug]/feedback-emails (organizer-gated, ledgered).
 *
 * Like the RSVP edit link, feedbackUrl is NOT a credential — the
 * feedback page is auth-gated, so a signed-out recipient round-trips
 * through magic-link login and lands back on the form.
 */
export async function sendFeedbackEmail(
  params: FeedbackEmailParams,
): Promise<void> {
  const { to, firstName, brandClient, eventShortName, feedbackUrl } = params;

  const framing = emailEnvFraming();
  const subject = feedbackEmailSubject(eventShortName);
  const name = firstName.trim() !== "" ? firstName.trim() : "there";

  const text = [
    framing.bodyBanner ? framing.bodyBanner.trimEnd() : null,
    `Hi ${name},`,
    "",
    `Thanks for being part of ${eventShortName}. We'd love to hear how it went — the good, the bad, and everything in between.`,
    "",
    `Share your feedback here:`,
    feedbackUrl,
    "",
    `It takes just a few minutes. If you're signed out on this device, we'll ask you to log in first.`,
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
          <p style="margin: 0 0 16px; font-size: 16px;">Hi ${escapeHtml(name)},</p>
          <p style="margin: 0 0 24px; font-size: 16px; line-height: 1.5;">Thanks for being part of ${escapeHtml(eventShortName)}. We&rsquo;d love to hear how it went &mdash; the good, the bad, and everything in between.</p>
          <p style="margin: 0 0 28px;">
            <a href="${escapeHtml(feedbackUrl)}" style="display: inline-block; background: #F15A29; color: #FBF7F0; text-decoration: none; padding: 12px 20px; border-radius: 999px; font-weight: 500;">Share my feedback</a>
          </p>
          <p style="margin: 0; font-size: 13px; color: rgba(28,42,36,0.55); line-height: 1.5;">
            It takes just a few minutes. If you&rsquo;re signed out on this device, we&rsquo;ll ask you to log in first.
          </p>
          <p style="margin: 28px 0 0; font-size: 13px; color: rgba(28,42,36,0.55);">
            &mdash; The ${escapeHtml(brandClient)} events team
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  await sendEmail({ to, subject, html, text });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
