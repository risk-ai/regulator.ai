# Vienna OS Admin Guide

Complete guide for organization admins to manage team members, roles, and security settings.

---

## Table of Contents

1. [Team Management](#team-management)
2. [Role-Based Access Control (RBAC)](#role-based-access-control)
3. [Security Best Practices](#security-best-practices)
4. [Billing & Usage](#billing--usage)
5. [Audit & Compliance](#audit--compliance)

---

## Team Management

### Inviting Team Members

1. Go to https://console.regulator.ai/team
2. Click **Invite Member**
3. Enter email address
4. Select role:
   - **Admin:** Full access (manage team, policies, settings)
   - **Operator:** Approve actions, manage agents, view audit logs
   - **Viewer:** Read-only access
5. Click **Send Invitation**

**Invitation expires in 7 days.** Recipient receives email with signup link.

### Viewing Team Members

Team page shows:
- Member name and email
- Current role
- Status (Active/Pending/Suspended)
- Last login time
- Invite date

### Changing Member Roles

**Admin only:**

1. Find member in team list
2. Click **Edit** button
3. Select new role from dropdown
4. Change is immediate (no confirmation email)

**Use cases:**
- Promote operator to admin (when they need policy/team access)
- Demote admin to operator (reduce permissions)
- Change to viewer (temporary read-only access)

### Removing Team Members

**Admin only:**

1. Find member in team list
2. Click **Remove**
3. Confirm removal
4. Member loses access immediately
5. API keys and sessions are invalidated

**Cannot remove:**
- Yourself (admin cannot self-remove)
- Last remaining admin (prevents lockout)

---

## Role-Based Access Control

### Role Matrix

| Permission | Admin | Operator | Viewer |
|------------|-------|----------|--------|
| **Team Management** |
| Invite members | ✅ | ❌ | ❌ |
| Change roles | ✅ | ❌ | ❌ |
| Remove members | ✅ | ❌ | ❌ |
| **Governance** |
| Approve/deny actions | ✅ | ✅ | ❌ |
| View approvals | ✅ | ✅ | ✅ |
| Override policies | ✅ | ❌ | ❌ |
| **Fleet** |
| Register agents | ✅ | ✅ | ❌ |
| Suspend agents | ✅ | ✅ | ❌ |
| View agent status | ✅ | ✅ | ✅ |
| **Policies** |
| Create policies | ✅ | ❌ | ❌ |
| Edit policies | ✅ | ❌ | ❌ |
| Enable/disable | ✅ | ❌ | ❌ |
| View policies | ✅ | ✅ | ✅ |
| **Settings** |
| Billing | ✅ | ❌ | ❌ |
| Integrations | ✅ | ✅ | ❌ |
| API keys | ✅ | ✅ | ❌ |
| Security settings | ✅ | ❌ | ❌ |
| **Analytics** |
| View dashboards | ✅ | ✅ | ✅ |
| Export reports | ✅ | ✅ | ❌ |
| **Audit** |
| View audit logs | ✅ | ✅ | ✅ |
| Export audit logs | ✅ | ✅ | ❌ |

### Choosing the Right Role

**Admin:**
- Technical leads
- Security officers
- System administrators
- Billing contacts
- Limit to 2-3 people

**Operator:**
- Team leads
- On-call engineers
- DevOps engineers
- Support staff
- Most common role

**Viewer:**
- Executives
- Auditors
- Stakeholders
- External consultants
- Temporary access

---

## Security Best Practices

### Password Policy

**Enforce:**
- Minimum 12 characters
- Mix of uppercase, lowercase, numbers, symbols
- No common passwords
- No reuse of last 5 passwords
- Change every 90 days

**Configure in Settings → Security**

### Multi-Factor Authentication (MFA)

**Strongly recommended for admins.**

Enable MFA:
1. Settings → Security → MFA
2. Scan QR code with authenticator app
3. Enter verification code
4. Save backup codes

**Require MFA for entire organization:**
- Settings → Security → Require MFA
- Grace period: 7 days
- Users without MFA are locked out after grace period

### API Key Management

**Best practices:**
- Create separate keys per application
- Rotate keys every 90 days
- Delete unused keys immediately
- Never commit keys to git
- Use environment variables

**Create API key:**
1. Settings → API Keys
2. Click **Create Key**
3. Enter description (e.g., "Production backend")
4. Select permissions
5. **Copy key immediately** (shown only once)
6. Store in password manager

**Revoke compromised key:**
1. Settings → API Keys
2. Find key in list
3. Click **Revoke**
4. Immediate revocation (all requests fail)

### IP Allowlisting (Enterprise)

Restrict API access to specific IPs:
1. Settings → Security → IP Allowlist
2. Add IP ranges (CIDR notation)
3. Click **Enable**

Example:
```
10.0.0.0/8     # Internal network
203.0.113.0/24 # Office IP range
```

### Session Management

**Default settings:**
- Session timeout: 24 hours
- Idle timeout: 2 hours
- Remember me: 30 days

**Force logout all sessions:**
1. Settings → Security
2. Click **Revoke All Sessions**
3. All users are logged out
4. Use for security incidents

---

## Billing & Usage

### View Current Usage

**Console → Usage Dashboard**

Shows:
- Proposals this month vs plan limit
- Active agents vs plan limit
- API calls vs plan limit
- Trend charts (7d/30d/90d)

### Plan Limits

**Team Plan ($49/agent/month):**
- 1,000 proposals/month
- 10 agents max
- 50,000 API calls/month
- Standard support

**Business Plan ($99/agent/month):**
- 10,000 proposals/month
- 50 agents max
- 500,000 API calls/month
- Priority support
- Advanced analytics

### Upgrade Plan

**Approaching limits?**

1. Go to Settings → Billing
2. Click **Upgrade Plan**
3. Select new plan
4. Confirm billing
5. Upgrade is immediate

**Or:** Click **Customer Portal** for full Stripe billing management

### Add Team Members to Billing

1. Settings → Billing → Team Plan
2. Current: 3 agents ($147/month)
3. Click **Add Agents**
4. Select new count
5. Prorated charge on next invoice

### View Invoices

Settings → Billing → Invoices

- Download PDFs
- Email to finance@company.com
- View payment history

---

## Audit & Compliance

### Audit Log

**Console → History**

Every governance action is logged:
- Who approved/denied
- What action was requested
- When it occurred
- Policy evaluations
- Warrant signatures
- Execution outcomes

**Retention:** 7 years (configurable)

### Compliance Reports

**Console → Compliance**

Generate reports for:
- SOC 2 audits
- GDPR compliance
- HIPAA requirements
- Custom date ranges

**Export formats:**
- PDF (executive summary)
- CSV (full data for analysis)
- JSON (API integration)

### Export Audit Data

**Bulk export:**

```bash
curl https://console.regulator.ai/api/v1/audit?start=2026-01-01&end=2026-12-31 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o audit_2026.json
```

**Automated export:**

Set up scheduled exports:
1. Settings → Integrations → Add → Webhook
2. Filter: `audit` events
3. POST to your data warehouse

### Data Retention Policy

**Default:** 7 years

**Configure:**
1. Settings → Compliance → Retention
2. Select period:
   - 1 year (minimum)
   - 3 years
   - 7 years (recommended)
   - Indefinite
3. Save

**Data deletion:**
- Records older than retention period are archived
- Archives stored in cold storage (S3 Glacier)
- Retrievable with 24-48 hour notice

---

## Troubleshooting

### User Can't Login

1. Check invitation status (Team → Pending Invitations)
2. Verify email address is correct
3. Check spam folder for invite email
4. Resend invitation if expired
5. Verify MFA is not blocking access

### User Missing Permissions

1. Check current role (Team → Members)
2. Verify role permissions (see RBAC matrix above)
3. Change role if needed
4. Ask user to refresh browser

### Billing Issues

1. Verify payment method (Settings → Billing)
2. Check usage limits (Console → Usage)
3. Review invoices for failed payments
4. Contact support@regulator.ai

### Security Incident Response

**If API key compromised:**
1. Settings → API Keys → Revoke key immediately
2. Review audit logs for unauthorized activity
3. Rotate all keys
4. Notify team

**If account compromised:**
1. Settings → Security → Revoke All Sessions
2. Force password reset for affected users
3. Enable MFA if not already
4. Review audit logs for suspicious activity
5. Contact support@regulator.ai

---

## Additional Resources

- **API Documentation:** [API_REFERENCE.md](./API_REFERENCE.md)
- **Integration Guides:** [INTEGRATION_GUIDES.md](./INTEGRATION_GUIDES.md)
- **Support:** support@regulator.ai
- **Community:** https://discord.com/invite/clawd
- **Status Page:** https://regulator.ai/status

---

**Last Updated:** 2026-04-14
