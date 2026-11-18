import { Injectable, Logger } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

export interface Email { to: string; subject: string; text: string }

export const SITE_URL = (process.env.SITE_URL || 'http://localhost:3210').replace(/\/$/, '');
const BRAND = process.env.BRAND_NAME || 'HomeAsk';

/**
 * Sends plain-text email through any SMTP service (SMTP_URL). Without one, as in local development, nothing is sent:
 * the whole email is written to the API log so links in it can still be opened.
 */
@Injectable()
export class Mailer {
  private log = new Logger('Mail');
  private transport: Transporter | null = process.env.SMTP_URL ? createTransport(process.env.SMTP_URL) : null;

  /** Never throws: a mail problem is logged, and must not fail the sign-up or enquiry that triggered it. */
  async send(email: Email): Promise<boolean> {
    const text = `${email.text}\n\n${BRAND}`;
    if (!this.transport) {
      this.log.log(`Not sent (no SMTP_URL). To: ${email.to} | Subject: ${email.subject}\n${text}`);
      return false;
    }
    try {
      await this.transport.sendMail({ from: process.env.MAIL_FROM || `${BRAND} <no-reply@localhost>`, to: email.to, subject: email.subject, text });
      return true;
    } catch (e) {
      this.log.error(`Could not send "${email.subject}" to ${email.to}: ${(e as Error).message}`);
      return false;
    }
  }
}
