import { NextResponse } from "next/server";
import { EmailService } from '@/lib/email-service-simple';

/**
 * Weekly Digest Email
 * Sends a summary of platform activity to active users
 * Triggered by cron: 0 9 * * 1 (Monday 9am)
 */
export async function POST(request: Request) {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: "RESEND_API_KEY not configured" }, { status: 500 });
    }

    const pgUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!pgUrl) {
      return NextResponse.json({ error: "Database not configured" }, { status: 500 });
    }

    // Dynamic import for pg
    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: pgUrl, max: 5 });

    // Get active tenants with their stats from the last 7 days
    const tenantsResult = await pool.query(`
      SELECT DISTINCT
        t.id as tenant_id,
        t.name as tenant_name,
        u.email,
        u.full_name
      FROM tenants t
      JOIN users u ON u.tenant_id = t.id
      WHERE u.email IS NOT NULL
        AND u.email_verified = true
      ORDER BY t.name
    `);

    if (tenantsResult.rows.length === 0) {
      await pool.end();
      return NextResponse.json({ sent: 0, message: "No active users found" });
    }

    const emailService = new EmailService(resendKey);
    let sent = 0;
    const errors: string[] = [];

    for (const row of tenantsResult.rows) {
      try {
        // Get weekly stats for this tenant
        const statsResult = await pool.query(`
          SELECT
            (SELECT COUNT(*) FROM warrants WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '7 days') as warrants_issued,
            (SELECT COUNT(*) FROM execution_events WHERE tenant_id = $1 AND event_timestamp >= NOW() - INTERVAL '7 days') as executions,
            (SELECT COUNT(*) FROM approvals WHERE tenant_id = $1 AND created_at >= NOW() - INTERVAL '7 days') as approvals_processed,
            (SELECT COUNT(*) FROM public.agents WHERE tenant_id = $1 AND status = 'active') as active_agents,
            (SELECT COUNT(*) FROM policies WHERE tenant_id = $1) as total_policies
        `, [row.tenant_id]);

        const stats = statsResult.rows[0] || {};
        const firstName = row.full_name?.split(' ')[0] || 'there';

        const subject = `Your Vienna OS Weekly Digest — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
        
        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#0f172a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:#a78bfa;font-size:24px;margin:0;">Vienna<span style="color:#22d3ee;">OS</span></h1>
      <p style="color:#94a3b8;font-size:14px;margin-top:4px;">Weekly Governance Digest</p>
    </div>

    <div style="background:#1e293b;border-radius:12px;padding:24px;margin-bottom:24px;">
      <p style="color:#e2e8f0;font-size:16px;margin:0 0 16px;">Hi ${firstName},</p>
      <p style="color:#94a3b8;font-size:14px;line-height:1.6;margin:0;">
        Here's your weekly governance summary for ${row.tenant_name || 'your organization'}.
      </p>
    </div>

    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
      <div style="background:#1e293b;border-radius:12px;padding:20px;flex:1;min-width:120px;text-align:center;">
        <div style="color:#a78bfa;font-size:28px;font-weight:bold;">${stats.warrants_issued || 0}</div>
        <div style="color:#94a3b8;font-size:12px;margin-top:4px;">Warrants Issued</div>
      </div>
      <div style="background:#1e293b;border-radius:12px;padding:20px;flex:1;min-width:120px;text-align:center;">
        <div style="color:#22d3ee;font-size:28px;font-weight:bold;">${stats.executions || 0}</div>
        <div style="color:#94a3b8;font-size:12px;margin-top:4px;">Executions</div>
      </div>
      <div style="background:#1e293b;border-radius:12px;padding:20px;flex:1;min-width:120px;text-align:center;">
        <div style="color:#34d399;font-size:28px;font-weight:bold;">${stats.approvals_processed || 0}</div>
        <div style="color:#94a3b8;font-size:12px;margin-top:4px;">Approvals</div>
      </div>
    </div>

    <div style="background:#1e293b;border-radius:12px;padding:20px;margin-bottom:24px;">
      <h3 style="color:#e2e8f0;font-size:14px;margin:0 0 12px;text-transform:uppercase;letter-spacing:1px;">System Overview</h3>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="color:#94a3b8;font-size:14px;padding:8px 0;border-bottom:1px solid #334155;">Active Agents</td>
          <td style="color:#e2e8f0;font-size:14px;padding:8px 0;border-bottom:1px solid #334155;text-align:right;font-weight:bold;">${stats.active_agents || 0}</td>
        </tr>
        <tr>
          <td style="color:#94a3b8;font-size:14px;padding:8px 0;border-bottom:1px solid #334155;">Active Policies</td>
          <td style="color:#e2e8f0;font-size:14px;padding:8px 0;border-bottom:1px solid #334155;text-align:right;font-weight:bold;">${stats.total_policies || 0}</td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin-bottom:32px;">
      <a href="https://console.regulator.ai/dashboard" style="display:inline-block;background:#7c3aed;color:white;text-decoration:none;padding:12px 32px;border-radius:8px;font-size:14px;font-weight:600;">View Dashboard →</a>
    </div>

    <div style="text-align:center;border-top:1px solid #334155;padding-top:20px;">
      <p style="color:#64748b;font-size:12px;margin:0;">
        Vienna OS | AI Agent Governance Platform<br>
        <a href="{{unsubscribe_url}}" style="color:#64748b;">Unsubscribe</a> from weekly digests
      </p>
    </div>
  </div>
</body>
</html>`;

        await emailService.sendEmail(
          row.email,
          { subject, html },
          'Vienna OS <noreply@regulator.ai>'
        );
        sent++;
      } catch (err: any) {
        errors.push(`${row.email}: ${err.message}`);
      }
    }

    await pool.end();

    return NextResponse.json({
      sent,
      total: tenantsResult.rows.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error: any) {
    console.error('[Weekly Digest] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
