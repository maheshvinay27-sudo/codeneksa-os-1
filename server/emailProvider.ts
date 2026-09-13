/**
 * Codeneksa OS - Backend Email Provider Abstraction
 * Supports multiple email service providers (Resend, SendGrid, Postmark, Webhook)
 * Ensures zero secret exposure to client code.
 */

export interface SendEmailOptions {
  to: string;
  from: string;
  fromName?: string;
  replyTo?: string;
  subject: string;
  html: string;
  text?: string;
  tags?: Record<string, string>;
  idempotencyKey?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: string;
  statusCode?: number;
  providerName: string;
}

export interface EmailProvider {
  readonly name: string;
  isConfigured(): boolean;
  sendEmail(options: SendEmailOptions): Promise<SendEmailResult>;
}

/**
 * Fallback Unconfigured Provider
 * Strictly prevents fake success records when environment is not set up
 */
export class UnconfiguredProvider implements EmailProvider {
  readonly name = 'unconfigured';

  isConfigured(): boolean {
    return false;
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    return {
      success: false,
      error: 'Email provider not configured. Please set EMAIL_API_KEY and EMAIL_PROVIDER in environment variables.',
      errorCode: 'PROVIDER_NOT_CONFIGURED',
      statusCode: 503,
      providerName: this.name,
    };
  }
}

/**
 * Resend Email Provider (https://resend.com)
 */
export class ResendProvider implements EmailProvider {
  readonly name = 'resend';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Resend API key is missing.',
        errorCode: 'MISSING_API_KEY',
        providerName: this.name,
      };
    }

    try {
      const fromFormatted = options.fromName
        ? `${options.fromName} <${options.from}>`
        : options.from;

      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
        },
        body: JSON.stringify({
          from: fromFormatted,
          to: [options.to],
          reply_to: options.replyTo,
          subject: options.subject,
          html: options.html,
          text: options.text,
          tags: options.tags
            ? Object.entries(options.tags).map(([name, value]) => ({ name, value }))
            : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `Resend API returned status ${response.status}`,
          errorCode: data.name || `HTTP_${response.status}`,
          statusCode: response.status,
          providerName: this.name,
        };
      }

      return {
        success: true,
        messageId: data.id || `resend_${Date.now()}`,
        statusCode: response.status,
        providerName: this.name,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error connecting to Resend API',
        errorCode: 'NETWORK_FAILURE',
        providerName: this.name,
      };
    }
  }
}

/**
 * SendGrid Email Provider (https://sendgrid.com)
 */
export class SendGridProvider implements EmailProvider {
  readonly name = 'sendgrid';
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'SendGrid API key is missing.',
        errorCode: 'MISSING_API_KEY',
        providerName: this.name,
      };
    }

    try {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [
            {
              to: [{ email: options.to }],
            },
          ],
          from: {
            email: options.from,
            name: options.fromName,
          },
          reply_to: options.replyTo ? { email: options.replyTo } : undefined,
          subject: options.subject,
          content: [
            ...(options.text ? [{ type: 'text/plain', value: options.text }] : []),
            { type: 'text/html', value: options.html },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: errorText || `SendGrid API returned status ${response.status}`,
          errorCode: `HTTP_${response.status}`,
          statusCode: response.status,
          providerName: this.name,
        };
      }

      const messageId = response.headers.get('x-message-id') || `sg_${Date.now()}`;

      return {
        success: true,
        messageId,
        statusCode: response.status,
        providerName: this.name,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error connecting to SendGrid API',
        errorCode: 'NETWORK_FAILURE',
        providerName: this.name,
      };
    }
  }
}

/**
 * Postmark Email Provider (https://postmarkapp.com)
 */
export class PostmarkProvider implements EmailProvider {
  readonly name = 'postmark';
  private serverToken: string;

  constructor(serverToken: string) {
    this.serverToken = serverToken;
  }

  isConfigured(): boolean {
    return Boolean(this.serverToken && this.serverToken.trim().length > 0);
  }

  async sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
    if (!this.isConfigured()) {
      return {
        success: false,
        error: 'Postmark server token is missing.',
        errorCode: 'MISSING_API_KEY',
        providerName: this.name,
      };
    }

    try {
      const fromFormatted = options.fromName
        ? `${options.fromName} <${options.from}>`
        : options.from;

      const response = await fetch('https://api.postmarkapp.com/email', {
        method: 'POST',
        headers: {
          'X-Postmark-Server-Token': this.serverToken,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          From: fromFormatted,
          To: options.to,
          ReplyTo: options.replyTo,
          Subject: options.subject,
          HtmlBody: options.html,
          TextBody: options.text,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.ErrorCode) {
        return {
          success: false,
          error: data.Message || `Postmark error (${data.ErrorCode || response.status})`,
          errorCode: String(data.ErrorCode || `HTTP_${response.status}`),
          statusCode: response.status,
          providerName: this.name,
        };
      }

      return {
        success: true,
        messageId: data.MessageID || `pm_${Date.now()}`,
        statusCode: response.status,
        providerName: this.name,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Network error connecting to Postmark API',
        errorCode: 'NETWORK_FAILURE',
        providerName: this.name,
      };
    }
  }
}

/**
 * Factory to instantiate the appropriate email provider based on environment variables
 */
export function getEmailProvider(): EmailProvider {
  const providerType = (process.env.EMAIL_PROVIDER || '').toLowerCase().trim();
  const apiKey = (process.env.EMAIL_API_KEY || '').trim();

  // If no API key is set, return unconfigured provider
  if (!apiKey) {
    return new UnconfiguredProvider();
  }

  if (providerType === 'resend' || apiKey.startsWith('re_')) {
    return new ResendProvider(apiKey);
  }

  if (providerType === 'sendgrid' || apiKey.startsWith('SG.')) {
    return new SendGridProvider(apiKey);
  }

  if (providerType === 'postmark') {
    return new PostmarkProvider(apiKey);
  }

  // If provider name is explicitly resend, sendgrid or postmark
  switch (providerType) {
    case 'resend':
      return new ResendProvider(apiKey);
    case 'sendgrid':
      return new SendGridProvider(apiKey);
    case 'postmark':
      return new PostmarkProvider(apiKey);
    default:
      // Default to Resend if unknown or unspecified but key exists
      return new ResendProvider(apiKey);
  }
}
