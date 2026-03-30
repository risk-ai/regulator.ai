/**
 * Email Integration Adapter — Vienna OS
 *
 * Sends HTML email notifications for approvals, alerts, and reports.
 * Supports Resend API or raw SMTP. Generates signed JWT links for one-click approvals.
 */
import crypto from 'crypto';
const RISK_TIER_COLORS = {
    T0: '#22c55e',
    T1: '#f59e0b',
    T2: '#ef4444',
    T3: '#7c3aed',
};
function generateApprovalToken(approvalId, action, secret) {
    const payload = {
        aid: approvalId,
        act: action,
        exp: Math.floor(Date.now() / 1000) + 86400, // 24h expiry
        nonce: crypto.randomBytes(8).toString('hex'),
    };
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    return `${data}.${sig}`;
}
export function verifyApprovalToken(token, secret) {
    try {
        const [data, sig] = token.split('.');
        if (!data || !sig)
            return { valid: false, error: 'Malformed token' };
        const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
        if (sig !== expectedSig)
            return { valid: false, error: 'Invalid signature' };
        const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
        if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
            return { valid: false, error: 'Token expired' };
        }
        return { valid: true, payload };
    }
    catch {
        return { valid: false, error: 'Token decode failed' };
    }
}
function buildEmailHtml(event, config) {
    const { type, data } = event;
    const tierColor = data.risk_tier ? (RISK_TIER_COLORS[data.risk_tier] || '#6b7280') : '#6b7280';
    const secret = config.signing_secret || config.api_key || 'vienna-default-secret';
    const baseUrl = config.callback_url || process.env.VIENNA_PUBLIC_URL || 'http://localhost:3000';
    let approvalButtons = '';
    if (type === 'approval_required' && data.approval_id) {
        const approveToken = generateApprovalToken(data.approval_id, 'approve', secret);
        const denyToken = generateApprovalToken(data.approval_id, 'deny', secret);
        approvalButtons = `
      <tr><td style="padding:24px 0 0 0;">
        <table cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="padding-right:12px;">
            <a href="${baseUrl}/api/v1/integrations/callbacks/email?token=${approveToken}&action=approve"
               style="display:inline-block;padding:12px 28px;background:#22c55e;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
              ✅ Approve
            </a>
          </td>
          <td>
            <a href="${baseUrl}/api/v1/integrations/callbacks/email?token=${denyToken}&action=deny"
               style="display:inline-block;padding:12px 28px;background:#ef4444;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:14px;">
              ❌ Deny
            </a>
          </td>
        </tr></table>
      </td></tr>`;
    }
    const detailRows = data.details
        ? Object.entries(data.details)
            .slice(0, 8)
            .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#9ca3af;font-size:13px;">${k}</td><td style="padding:4px 0;color:#e5e7eb;font-size:13px;">${typeof v === 'object' ? JSON.stringify(v) : v}</td></tr>`)
            .join('')
        : '';
    return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111827;padding:32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#1f2937;border-radius:12px;overflow:hidden;">
  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#7c3aed,#4f46e5);padding:24px 32px;">
    <div style="font-size:20px;font-weight:700;color:#fff;">⚡ Vienna OS</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.8);margin-top:4px;">${formatEventType(type)}</div>
  </td></tr>
  <!-- Body -->
  <tr><td style="padding:28px 32px;">
    ${data.summary ? `<div style="font-size:16px;color:#f3f4f6;font-weight:600;margin-bottom:16px;">${data.summary}</div>` : ''}
    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
      ${data.risk_tier ? `<tr><td style="padding:4px 12px 4px 0;color:#9ca3af;font-size:13px;">Risk Tier</td><td style="padding:4px 0;"><span style="display:inline-block;padding:2px 10px;background:${tierColor};color:#fff;border-radius:4px;font-size:12px;font-weight:600;">${data.risk_tier}</span></td></tr>` : ''}
      ${data.agent_id ? `<tr><td style="padding:4px 12px 4px 0;color:#9ca3af;font-size:13px;">Agent</td><td style="padding:4px 0;color:#e5e7eb;font-size:13px;"><code style="background:#374151;padding:2px 6px;border-radius:4px;">${data.agent_id}</code></td></tr>` : ''}
      ${data.action_type ? `<tr><td style="padding:4px 12px 4px 0;color:#9ca3af;font-size:13px;">Action</td><td style="padding:4px 0;color:#e5e7eb;font-size:13px;"><code style="background:#374151;padding:2px 6px;border-radius:4px;">${data.action_type}</code></td></tr>` : ''}
      ${data.intent_id ? `<tr><td style="padding:4px 12px 4px 0;color:#9ca3af;font-size:13px;">Intent</td><td style="padding:4px 0;color:#e5e7eb;font-size:13px;"><code style="background:#374151;padding:2px 6px;border-radius:4px;">${data.intent_id.slice(0, 12)}</code></td></tr>` : ''}
      ${detailRows}
    </table>
    ${approvalButtons}
  </td></tr>
  <!-- Footer -->
  <tr><td style="padding:16px 32px;border-top:1px solid #374151;">
    <div style="font-size:11px;color:#6b7280;">Vienna OS Governance • ${new Date(data.timestamp).toLocaleString()} • Do not forward this email</div>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}
function formatEventType(type) {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
async function sendViaResend(config, subject, html) {
    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${config.api_key}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: config.from || 'Vienna OS <governance@vienna.dev>',
                to: Array.isArray(config.to) ? config.to : [config.to],
                subject,
                html,
            }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) {
            return { success: false, error: `Resend ${response.status}: ${JSON.stringify(body)}`, response: { status: response.status, body } };
        }
        return { success: true, response: { status: response.status, body } };
    }
    catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
    }
}
async function sendViaSmtp(config, subject, html) {
    // Dynamic import nodemailer only when SMTP is used
    try {
        const nodemailer = await import('nodemailer');
        const transport = nodemailer.default.createTransport({
            host: config.smtp_host,
            port: config.smtp_port || 587,
            secure: config.smtp_port === 465,
            auth: { user: config.smtp_user, pass: config.smtp_pass },
        });
        const info = await transport.sendMail({
            from: config.from_address || config.smtp_user,
            to: Array.isArray(config.to_addresses) ? config.to_addresses.join(',') : config.to_addresses,
            subject,
            html,
        });
        return { success: true, response: { messageId: info.messageId } };
    }
    catch (err) {
        return { success: false, error: err instanceof Error ? err.message : 'SMTP send failed' };
    }
}
export const emailAdapter = {
    type: 'email',
    validateConfig(config) {
        const errors = [];
        const provider = config.provider || 'resend';
        if (provider === 'resend') {
            if (!config.api_key)
                errors.push('Resend API key is required');
            if (!config.from)
                errors.push('From address is required');
            if (!config.to || (Array.isArray(config.to) && config.to.length === 0))
                errors.push('At least one recipient is required');
        }
        else {
            if (!config.smtp_host)
                errors.push('SMTP host is required');
            if (!config.smtp_user)
                errors.push('SMTP user is required');
            if (!config.smtp_pass)
                errors.push('SMTP password is required');
            if (!config.to_addresses)
                errors.push('At least one recipient is required');
        }
        return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
    },
    async sendNotification(event, config) {
        const subject = `[Vienna] ${formatEventType(event.type)}${event.data.summary ? `: ${event.data.summary}` : ''}`;
        const html = buildEmailHtml(event, config);
        const provider = config.provider || 'resend';
        if (provider === 'resend') {
            return sendViaResend(config, subject, html);
        }
        else {
            return sendViaSmtp(config, subject, html);
        }
    },
    async testConnection(config) {
        const validation = this.validateConfig(config);
        if (!validation.valid)
            return { success: false, message: validation.errors.join(', ') };
        const subject = '🔗 Vienna OS Email Test';
        const html = `<div style="font-family:sans-serif;padding:24px;background:#1f2937;color:#f3f4f6;border-radius:8px;">
      <h2 style="color:#a78bfa;">⚡ Vienna OS</h2>
      <p>Email integration connected successfully.</p>
      <p style="color:#9ca3af;font-size:12px;">Tested at ${new Date().toISOString()}</p>
    </div>`;
        const provider = config.provider || 'resend';
        const result = provider === 'resend'
            ? await sendViaResend(config, subject, html)
            : await sendViaSmtp(config, subject, html);
        return result.success
            ? { success: true, message: 'Test email sent successfully' }
            : { success: false, message: result.error || 'Send failed' };
    },
    async handleCallback(payload) {
        // Email callbacks come as GET requests with token query param
        const { token, action } = payload;
        const secret = payload._signing_secret || 'vienna-default-secret';
        const verification = verifyApprovalToken(token, secret);
        if (!verification.valid) {
            return { action: 'error', data: { error: verification.error } };
        }
        return {
            action: verification.payload.act, // 'approve' or 'deny'
            data: {
                approval_id: verification.payload.aid,
                reviewed_by: 'email_approver',
                decision_reason: `${verification.payload.act === 'approve' ? 'Approved' : 'Denied'} via email link`,
            },
        };
    },
};
export const emailConfigSchema = {
    type: 'email',
    label: 'Email',
    description: 'Send governance notifications via email with one-click approval links',
    icon: '📧',
    fields: [
        { key: 'provider', label: 'Provider', type: 'select', required: true, options: [{ value: 'resend', label: 'Resend' }, { value: 'smtp', label: 'SMTP' }] },
        { key: 'api_key', label: 'Resend API Key', type: 'password', required: false, placeholder: 're_...', help: 'Required for Resend provider' },
        { key: 'from', label: 'From Address', type: 'email', required: true, placeholder: 'governance@yourcompany.com' },
        { key: 'to', label: 'To Addresses', type: 'multi-text', required: true, placeholder: 'admin@yourcompany.com' },
        { key: 'smtp_host', label: 'SMTP Host', type: 'text', required: false, placeholder: 'smtp.gmail.com', help: 'Required for SMTP provider' },
        { key: 'smtp_port', label: 'SMTP Port', type: 'number', required: false, placeholder: '587' },
        { key: 'smtp_user', label: 'SMTP User', type: 'text', required: false },
        { key: 'smtp_pass', label: 'SMTP Password', type: 'password', required: false },
        { key: 'callback_url', label: 'Callback Base URL', type: 'url', required: false, placeholder: 'https://vienna.yourcompany.com', help: 'Base URL for approve/deny links' },
    ],
};
//# sourceMappingURL=emailAdapter.js.map