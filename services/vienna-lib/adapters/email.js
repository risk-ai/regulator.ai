/**
 * Email Notification Adapter — Vienna OS
 * 
 * Sends approval requests and governance notifications via email.
 * Uses Resend API (same as marketing site).
 * 
 * Configuration:
 *   RESEND_API_KEY — Resend API key
 *   VIENNA_NOTIFICATION_EMAIL — Operator email for notifications
 */

class EmailAdapter {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.RESEND_API_KEY;
    this.fromEmail = config.fromEmail || 'Vienna OS <notifications@regulator.ai>';
    this.notificationEmail = config.notificationEmail || process.env.VIENNA_NOTIFICATION_EMAIL;
    this.consoleUrl = config.consoleUrl || 'https://console.regulator.ai';
    this.enabled = Boolean(this.apiKey && this.notificationEmail);
  }

  /**
   * Send approval request email
   */
  async sendApprovalRequest(approval, recipientEmail) {
    if (!this.enabled) return null;
    const to = recipientEmail || this.notificationEmail;

    const tierColors = { T0: '#94a3b8', T1: '#fbbf24', T2: '#ef4444' };
    const tierLabels = { T0: 'Auto-Approve', T1: 'Operator Approval Required', T2: 'Multi-Party Approval Required' };
    const color = tierColors[approval.riskTier] || '#94a3b8';

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;">
        <div style="background:#0D0F14;padding:24px;border-radius:12px;color:#e2e8f0;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
            <span style="color:#7c3aed;font-weight:700;font-size:16px;">🛡️ Vienna OS</span>
          </div>
          
          <div style="background:${color}15;border:1px solid ${color}30;border-radius:8px;padding:16px;margin-bottom:16px;">
            <h2 style="margin:0 0 8px;font-size:16px;color:#fff;">
              ${tierLabels[approval.riskTier] || 'Approval Required'}
            </h2>
            <p style="margin:0;font-size:14px;color:#94a3b8;">
              An agent has requested authorization for a governed action.
            </p>
          </div>

          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Action</td><td style="padding:6px 0;color:#fff;font-size:13px;font-family:monospace;">${approval.action}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Risk Tier</td><td style="padding:6px 0;color:${color};font-size:13px;font-weight:700;">${approval.riskTier}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Agent</td><td style="padding:6px 0;color:#fff;font-size:13px;">${approval.source || 'unknown'}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Tenant</td><td style="padding:6px 0;color:#fff;font-size:13px;">${approval.tenantId || 'system'}</td></tr>
            <tr><td style="padding:6px 0;color:#64748b;font-size:13px;">Expires</td><td style="padding:6px 0;color:#fff;font-size:13px;">${approval.ttl || 300}s</td></tr>
          </table>

          ${approval.scope ? `
          <div style="background:#111826;border-radius:6px;padding:12px;margin-bottom:16px;">
            <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Scope</div>
            <pre style="margin:0;font-size:12px;color:#94a3b8;font-family:monospace;white-space:pre-wrap;">${JSON.stringify(approval.scope, null, 2)}</pre>
          </div>` : ''}

          <div style="text-align:center;margin-top:20px;">
            <a href="${this.consoleUrl}/#approvals" 
               style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
              Review in Console
            </a>
          </div>

          <div style="margin-top:20px;padding-top:12px;border-top:1px solid #1E293B;font-size:11px;color:#334155;text-align:center;">
            Approval ID: ${approval.id} · <a href="https://regulator.ai" style="color:#7c3aed;">regulator.ai</a>
          </div>
        </div>
      </div>
    `;

    return this._send(to, `[Vienna OS] ${tierLabels[approval.riskTier]}: ${approval.action}`, html);
  }

  /**
   * Send execution result notification
   */
  async sendExecutionNotification(execution, recipientEmail) {
    if (!this.enabled) return null;
    const to = recipientEmail || this.notificationEmail;
    const isSuccess = execution.status === 'executed';

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;">
        <div style="background:#0D0F14;padding:24px;border-radius:12px;color:#e2e8f0;">
          <div style="margin-bottom:16px;"><span style="color:#7c3aed;font-weight:700;">🛡️ Vienna OS</span></div>
          <h2 style="margin:0 0 12px;font-size:16px;color:${isSuccess ? '#4ade80' : '#f87171'};">
            ${isSuccess ? '✅' : '❌'} Execution ${execution.status}: ${execution.action}
          </h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Warrant</td><td style="padding:4px 0;color:#fff;font-size:12px;font-family:monospace;">${execution.warrantId || 'N/A'}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Tenant</td><td style="padding:4px 0;color:#fff;font-size:13px;">${execution.tenantId || 'system'}</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Duration</td><td style="padding:4px 0;color:#fff;font-size:13px;">${execution.durationMs || '?'}ms</td></tr>
            <tr><td style="padding:4px 0;color:#64748b;font-size:13px;">Verified</td><td style="padding:4px 0;color:${execution.verified ? '#4ade80' : '#f87171'};font-size:13px;">${execution.verified ? 'Yes' : 'No'}</td></tr>
          </table>
          <div style="margin-top:16px;text-align:center;">
            <a href="${this.consoleUrl}/#history" style="color:#7c3aed;font-size:13px;">View in Audit Trail →</a>
          </div>
        </div>
      </div>
    `;

    return this._send(to, `[Vienna OS] Execution ${execution.status}: ${execution.action}`, html);
  }

  /**
   * Send daily governance digest
   */
  async sendDailyDigest(stats, recipientEmail) {
    if (!this.enabled) return null;
    const to = recipientEmail || this.notificationEmail;

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;">
        <div style="background:#0D0F14;padding:24px;border-radius:12px;color:#e2e8f0;">
          <div style="margin-bottom:16px;"><span style="color:#7c3aed;font-weight:700;">🛡️ Vienna OS</span> <span style="color:#64748b;font-size:13px;">Daily Governance Digest</span></div>
          
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;">
            <div style="background:#111826;border-radius:8px;padding:16px;text-align:center;">
              <div style="font-size:24px;font-weight:700;color:#fff;">${stats.totalActions || 0}</div>
              <div style="font-size:11px;color:#64748b;">Actions Governed</div>
            </div>
            <div style="background:#111826;border-radius:8px;padding:16px;text-align:center;">
              <div style="font-size:24px;font-weight:700;color:#4ade80;">${stats.approvalRate || '100'}%</div>
              <div style="font-size:11px;color:#64748b;">Compliance Rate</div>
            </div>
            <div style="background:#111826;border-radius:8px;padding:16px;text-align:center;">
              <div style="font-size:24px;font-weight:700;color:#fbbf24;">${stats.pendingApprovals || 0}</div>
              <div style="font-size:11px;color:#64748b;">Pending Approvals</div>
            </div>
            <div style="background:#111826;border-radius:8px;padding:16px;text-align:center;">
              <div style="font-size:24px;font-weight:700;color:#f87171;">${stats.violations || 0}</div>
              <div style="font-size:11px;color:#64748b;">Policy Violations</div>
            </div>
          </div>

          <div style="text-align:center;"><a href="${this.consoleUrl}" style="display:inline-block;background:#7c3aed;color:#fff;padding:10px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;">Open Console</a></div>
          <div style="margin-top:16px;text-align:center;font-size:11px;color:#334155;">
            ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} · <a href="https://regulator.ai" style="color:#7c3aed;">regulator.ai</a>
          </div>
        </div>
      </div>
    `;

    return this._send(to, `[Vienna OS] Daily Governance Digest — ${stats.totalActions || 0} actions governed`, html);
  }

  async _send(to, subject, html) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: this.fromEmail, to: [to], subject, html }),
      });
      if (!res.ok) {
        console.error('[EmailAdapter] Send failed:', res.status);
        return null;
      }
      return { sent: true, to };
    } catch (error) {
      console.error('[EmailAdapter] Error:', error.message);
      return null;
    }
  }

  /**
   * Send policy notification (triggered by Policy Builder notify action)
   */
  async sendPolicyNotification(notification, recipientEmail) {
    if (!this.enabled) return null;
    const to = recipientEmail || this.notificationEmail;

    const tierColors = { T0: '#94a3b8', T1: '#fbbf24', T2: '#ef4444' };
    const color = tierColors[notification.riskTier] || '#94a3b8';

    const html = `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:560px;margin:0 auto;">
        <div style="background:#0D0F14;padding:24px;border-radius:12px;color:#e2e8f0;">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:16px;">
            <span style="color:#7c3aed;font-weight:700;font-size:16px;">🛡️ Vienna OS</span>
          </div>
          
          <div style="background:${color}15;border:1px solid ${color}30;border-radius:8px;padding:16px;margin-bottom:16px;">
            <h2 style="margin:0 0 8px;font-size:16px;color:#fff;">📋 Policy Notification</h2>
            <p style="margin:0;color:#94a3b8;font-size:14px;">${notification.policy_name}</p>
          </div>
          
          <div style="background:#161821;border:1px solid #262837;border-radius:8px;padding:16px;margin-bottom:16px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px;">
              <div>
                <div style="color:#64748b;font-size:12px;margin-bottom:4px;">Intent</div>
                <div style="color:#e2e8f0;font-size:14px;font-weight:500;">${notification.intent_type}</div>
              </div>
              <div>
                <div style="color:#64748b;font-size:12px;margin-bottom:4px;">Risk Tier</div>
                <div style="color:${color};font-size:14px;font-weight:600;">${notification.riskTier}</div>
              </div>
            </div>
            
            <div style="margin-bottom:12px;">
              <div style="color:#64748b;font-size:12px;margin-bottom:4px;">Source</div>
              <div style="color:#e2e8f0;font-size:14px;">${notification.source?.id || 'unknown'}</div>
            </div>
            
            <div style="margin-bottom:12px;">
              <div style="color:#64748b;font-size:12px;margin-bottom:4px;">Message</div>
              <div style="color:#e2e8f0;font-size:14px;">${notification.message}</div>
            </div>
            
            <div>
              <div style="color:#64748b;font-size:12px;margin-bottom:4px;">Time</div>
              <div style="color:#94a3b8;font-size:13px;">${new Date(notification.timestamp).toLocaleString()}</div>
            </div>
          </div>
          
          <div style="background:#0f1117;border:1px solid #1e2433;border-radius:8px;padding:12px;margin-bottom:16px;">
            <div style="color:#64748b;font-size:11px;font-family:monospace;">
              Intent ID: ${notification.intent_id}
            </div>
          </div>
          
          <div style="text-align:center;padding-top:16px;border-top:1px solid #262837;">
            <a href="${this.consoleUrl}/intents/${notification.intent_id}" 
               style="display:inline-block;background:#7c3aed;color:#fff;text-decoration:none;padding:10px 20px;border-radius:6px;font-weight:600;font-size:14px;">
              View Intent Details
            </a>
          </div>
          
          <div style="text-align:center;margin-top:16px;color:#64748b;font-size:12px;">
            Vienna OS Governance Platform
          </div>
        </div>
      </div>
    `;

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to,
          subject: `[Vienna OS] Policy Notification: ${notification.policy_name}`,
          html,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Resend API error: ${error}`);
      }

      const data = await response.json();
      return { sent: true, id: data.id };
    } catch (error) {
      console.error('[EmailAdapter] Policy notification error:', error.message);
      return null;
    }
  }
}

module.exports = { EmailAdapter };
