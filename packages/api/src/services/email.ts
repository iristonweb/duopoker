import { randomBytes } from 'node:crypto';
import { config } from '../config.js';

export const createVerificationToken = () => randomBytes(32).toString('hex');

export const verificationExpiresAt = () => new Date(Date.now() + 1000 * 60 * 60 * 24);

export const shouldVerifyEmail = () => config.requireEmailVerification;

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
  const verifyUrl = `${config.publicWebUrl.replace(/\/$/, '')}/verify-email?token=${encodeURIComponent(token)}`;

  if (!config.resendApiKey) {
    if (!config.isProduction) {
      console.info(`[email] Verification link for ${email}: ${verifyUrl}`);
    }
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: config.emailFrom,
      to: [email],
      subject: 'Verify your DuoPoker email',
      html: `<p>Welcome to DuoPoker.</p><p><a href="${verifyUrl}">Verify your email</a></p><p>This link expires in 24 hours.</p>`
    })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to send verification email: ${body}`);
  }
}

export async function sendDunningEmail(
  email: string,
  opts: { clubName: string; status: 'GRACE' | 'PAST_DUE' }
): Promise<void> {
  const subject =
    opts.status === 'GRACE'
      ? `DuoPoker: renew your ${opts.clubName} club plan`
      : `DuoPoker: ${opts.clubName} plan past due`;

  const html =
    opts.status === 'GRACE'
      ? `<p>Your organizer plan for <strong>${opts.clubName}</strong> has entered a grace period.</p><p>Renew in the app to keep Pro/Network limits.</p>`
      : `<p>Your organizer plan for <strong>${opts.clubName}</strong> is past due.</p><p>Your club is now on Basic limits until payment succeeds.</p>`;

  if (!config.resendApiKey) {
    if (!config.isProduction) {
      console.info(`[dunning] ${opts.status} email for ${email}: ${subject}`);
    }
    return;
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.resendApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: config.emailFrom, to: [email], subject, html })
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to send dunning email: ${body}`);
  }
}
