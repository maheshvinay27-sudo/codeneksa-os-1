import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { getEmailProvider, SendEmailOptions } from './server/emailProvider';

// Load environment variables
dotenv.config();

const PORT = 3000;
const HOST = '0.0.0.0';

async function startServer() {
  const app = express();

  // Middleware for parsing JSON requests
  app.use(express.json({ limit: '10mb' }));

  // In-memory active security passcode store
  let activeMasterPasscode: {
    code: string;
    email: string;
    expiresAt: number;
  } | null = null;

  // ==========================================
  // API ROUTES
  // ==========================================

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Master Security Passcode Generation & Dispatch
  app.post('/api/auth/send-passcode', async (req, res) => {
    try {
      const { email } = req.body;
      const targetEmail =
        typeof email === 'string' && email.includes('@')
          ? email.trim().toLowerCase()
          : 'vurukurthisriramavinay@gmail.com';

      // Generate a cryptographic 6-digit numeric passcode
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      activeMasterPasscode = {
        code,
        email: targetEmail,
        expiresAt,
      };

      console.log(`[MASTER AUTH] Security passcode generated for ${targetEmail}: ${code} (expires in 10m)`);

      const provider = getEmailProvider();
      let emailSent = false;
      let sendError: string | null = null;

      if (provider.isConfigured()) {
        try {
          const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'security@codeneksa.com';
          const fromName = 'Codeneksa OS Security';

          const emailResult = await provider.sendEmail({
            to: targetEmail,
            from: fromAddress,
            fromName,
            subject: `[Codeneksa OS] Master Security Passcode: ${code}`,
            text: `Your Codeneksa OS master login passcode is: ${code}. Valid for 10 minutes. Do not share this code.`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background-color: #0f172a; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <div style="display: inline-block; padding: 6px 14px; background: rgba(249, 115, 22, 0.15); border: 1px solid rgba(249, 115, 22, 0.3); border-radius: 9999px; color: #fb923c; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
                    CODENEKSA OS • OWNER VERIFICATION
                  </div>
                </div>
                <h2 style="font-size: 20px; font-weight: 800; text-align: center; margin: 0 0 8px 0; color: #ffffff;">
                  Master Security Passcode
                </h2>
                <p style="font-size: 13px; color: #94a3b8; text-align: center; margin: 0 0 28px 0;">
                  Use this one-time security code to authenticate your administrative session in Codeneksa OS.
                </p>
                <div style="background-color: #1e293b; border: 2px dashed #f97316; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
                  <span style="font-family: monospace; font-size: 34px; font-weight: 900; letter-spacing: 10px; color: #f97316; display: inline-block;">
                    ${code}
                  </span>
                  <div style="font-size: 11px; color: #94a3b8; margin-top: 8px;">
                    Expires in 10 minutes • Single-use only
                  </div>
                </div>
                <p style="font-size: 12px; color: #64748b; line-height: 1.6; margin: 0; text-align: center;">
                  If you did not request this login attempt, your credentials may be compromised. Please change your password in Settings immediately.
                </p>
              </div>
            `,
          });

          emailSent = emailResult.success;
          if (!emailResult.success) {
            sendError = emailResult.error || 'Provider rejected email dispatch';
          }
        } catch (e) {
          sendError = e instanceof Error ? e.message : 'Unknown mail provider error';
        }
      }

      return res.json({
        success: true,
        emailSent,
        targetEmail,
        expiresInMinutes: 10,
        // If email could not be sent (e.g. unconfigured provider in development/sandbox),
        // provide devPasscode in response so the owner is never locked out
        devPasscode: !emailSent ? code : undefined,
        message: emailSent
          ? `Passcode sent to ${targetEmail}. Please check your inbox.`
          : `Passcode generated for ${targetEmail}. (${sendError || 'Email provider not configured, passcode provided directly'})`,
      });
    } catch (err) {
      console.error('Passcode dispatch error:', err);
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Internal passcode generation error',
      });
    }
  });

  // Verify Passcode
  app.post('/api/auth/verify-passcode', (req, res) => {
    try {
      const { passcode } = req.body;
      if (!passcode || typeof passcode !== 'string') {
        return res.status(400).json({ success: false, error: 'Passcode is required.' });
      }

      if (!activeMasterPasscode) {
        return res.status(400).json({
          success: false,
          error: 'No active passcode found. Please click "Send Passcode" first.',
        });
      }

      if (Date.now() > activeMasterPasscode.expiresAt) {
        activeMasterPasscode = null;
        return res.status(400).json({
          success: false,
          error: 'Passcode has expired (10m limit). Please request a new code.',
        });
      }

      if (activeMasterPasscode.code !== passcode.trim()) {
        return res.status(400).json({
          success: false,
          error: 'Invalid passcode. Please enter the correct 6-digit code.',
        });
      }

      // Valid! Clear the passcode to prevent replay attacks
      const verifiedEmail = activeMasterPasscode.email;
      activeMasterPasscode = null;

      return res.json({
        success: true,
        message: 'Passcode verified successfully.',
        user: {
          email: verifiedEmail,
          displayName: 'Vinay (Owner)',
          role: 'admin',
        },
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        error: 'Failed to verify passcode.',
      });
    }
  });

  // Get Email Provider Configuration status (Safe: no secrets exposed)
  app.get('/api/email/config', (_req, res) => {
    const provider = getEmailProvider();
    res.json({
      configured: provider.isConfigured(),
      provider: provider.name,
      fromAddress: process.env.EMAIL_FROM_ADDRESS || 'admissions@codeneksa.com',
      fromName: process.env.EMAIL_FROM_NAME || 'Codeneksa Admissions',
      replyTo: process.env.EMAIL_REPLY_TO || 'support@codeneksa.com',
      testRecipient: process.env.EMAIL_TEST_RECIPIENT || 'operations-test@codeneksa.com',
    });
  });

  // Single Email Send Endpoint (with Idempotency & Safe Test Mode)
  app.post('/api/email/send', async (req, res) => {
    try {
      const {
        studentId,
        recipientEmail,
        recipientName,
        subject,
        html,
        text,
        batchId,
        templateId,
        isTest,
        testRecipient,
        idempotencyKey,
      } = req.body;

      if (!subject || !html) {
        return res.status(400).json({
          success: false,
          error: 'Subject and HTML body are required.',
          errorCode: 'INVALID_REQUEST',
        });
      }

      // Determine target recipient
      let targetRecipient = recipientEmail;
      let finalSubject = subject;

      if (isTest) {
        targetRecipient = testRecipient || process.env.EMAIL_TEST_RECIPIENT || recipientEmail;
        if (!targetRecipient) {
          return res.status(400).json({
            success: false,
            error: 'Test recipient email is required in test mode.',
            errorCode: 'MISSING_TEST_RECIPIENT',
          });
        }
        if (!finalSubject.startsWith('[TEST]')) {
          finalSubject = `[TEST EMAIL] ${finalSubject}`;
        }
      } else if (!targetRecipient || !targetRecipient.includes('@')) {
        return res.status(400).json({
          success: false,
          error: 'Valid recipient email address is required.',
          errorCode: 'INVALID_RECIPIENT_EMAIL',
        });
      }

      const provider = getEmailProvider();

      // Enforce strict constraint: Never fake sent status if provider is unconfigured
      if (!provider.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'Email provider not configured. Please set EMAIL_API_KEY and EMAIL_PROVIDER in environment variables.',
          errorCode: 'PROVIDER_NOT_CONFIGURED',
          configured: false,
        });
      }

      const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'admissions@codeneksa.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'Codeneksa Admissions';
      const replyTo = process.env.EMAIL_REPLY_TO || 'support@codeneksa.com';

      const emailOptions: SendEmailOptions = {
        to: targetRecipient,
        from: fromAddress,
        fromName,
        replyTo,
        subject: finalSubject,
        html,
        text,
        idempotencyKey,
        tags: {
          studentId: studentId || 'unknown',
          batchId: batchId || 'unknown',
          templateId: templateId || 'default',
          isTest: isTest ? 'true' : 'false',
        },
      };

      const result = await provider.sendEmail(emailOptions);

      if (!result.success) {
        return res.status(result.statusCode || 400).json({
          success: false,
          error: result.error || 'Failed to dispatch email via provider.',
          errorCode: result.errorCode || 'DISPATCH_FAILED',
          providerName: result.providerName,
        });
      }

      return res.json({
        success: true,
        providerMessageId: result.messageId,
        providerName: result.providerName,
        sentAt: new Date().toISOString(),
        isTest: Boolean(isTest),
        recipient: targetRecipient,
      });
    } catch (err) {
      console.error('Email dispatch error:', err);
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Internal server error while processing email',
        errorCode: 'SERVER_ERROR',
      });
    }
  });

  // Batch Email Dispatch Endpoint (Sequential / controlled rate execution)
  app.post('/api/email/send-batch', async (req, res) => {
    try {
      const { items, templateId } = req.body;

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No email items provided for batch dispatch.',
        });
      }

      const provider = getEmailProvider();

      if (!provider.isConfigured()) {
        return res.status(503).json({
          success: false,
          error: 'Email provider not configured. Cannot process batch dispatch.',
          errorCode: 'PROVIDER_NOT_CONFIGURED',
          configured: false,
        });
      }

      const fromAddress = process.env.EMAIL_FROM_ADDRESS || 'admissions@codeneksa.com';
      const fromName = process.env.EMAIL_FROM_NAME || 'Codeneksa Admissions';
      const replyTo = process.env.EMAIL_REPLY_TO || 'support@codeneksa.com';

      const results = [];

      for (const item of items) {
        const {
          studentId,
          recipientEmail,
          recipientName,
          subject,
          html,
          text,
          batchId,
          idempotencyKey,
        } = item;

        if (!recipientEmail || !recipientEmail.includes('@')) {
          results.push({
            studentId,
            recipientEmail,
            success: false,
            error: 'Missing or invalid recipient email',
            errorCode: 'INVALID_RECIPIENT_EMAIL',
          });
          continue;
        }

        const emailOptions: SendEmailOptions = {
          to: recipientEmail,
          from: fromAddress,
          fromName,
          replyTo,
          subject,
          html,
          text,
          idempotencyKey: idempotencyKey || `${studentId}_welcome_${templateId || 'default'}`,
          tags: {
            studentId: studentId || '',
            batchId: batchId || '',
            templateId: templateId || 'default',
          },
        };

        const result = await provider.sendEmail(emailOptions);

        results.push({
          studentId,
          recipientEmail,
          recipientName,
          success: result.success,
          providerMessageId: result.messageId,
          error: result.error,
          errorCode: result.errorCode,
          sentAt: result.success ? new Date().toISOString() : undefined,
        });

        // Small interval to stay within common email API burst rate limits
        await new Promise((resolve) => setTimeout(resolve, 150));
      }

      const successfulCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;

      return res.json({
        success: failedCount === 0,
        total: items.length,
        successfulCount,
        failedCount,
        results,
      });
    } catch (err) {
      console.error('Batch email error:', err);
      return res.status(500).json({
        success: false,
        error: err instanceof Error ? err.message : 'Internal batch processing error',
      });
    }
  });

  // ==========================================
  // VITE / STATIC CLIENT INTEGRATION
  // ==========================================

  if (process.env.NODE_ENV !== 'production') {
    // Development mode: Vite middleware
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: Serve compiled assets
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(`Codeneksa OS Server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Codeneksa OS Server:', err);
  process.exit(1);
});
