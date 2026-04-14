# Vienna OS Integration Guides

Complete setup guides for connecting external services to Vienna governance events.

---

## Slack Integration

Send governance notifications to Slack channels.

### 1. Create Slack Webhook

1. Go to https://api.slack.com/apps
2. Click **Create New App** → **From scratch**
3. Name: "Vienna OS"
4. Select your workspace
5. Click **Incoming Webhooks**
6. Toggle **Activate Incoming Webhooks** to **On**
7. Click **Add New Webhook to Workspace**
8. Select channel (e.g., `#governance`)
9. Click **Allow**
10. **Copy the Webhook URL** (starts with `https://hooks.slack.com/services/`)

### 2. Configure in Vienna OS

1. Go to https://console.regulator.ai/integrations
2. Click **Add Integration**
3. Select **Slack**
4. Fill in details:
   - **Name:** "Slack Governance Channel"
   - **Webhook URL:** Paste from step 1.10
   - **Channel:** `#governance` (optional display name)
5. Select events to monitor:
   - ✅ Approval Required
   - ✅ Approval Resolved
   - ✅ Action Executed
   - ✅ Policy Violation
6. Click **Test Integration** to verify
7. Click **Save**

### 3. Customize Messages (Optional)

Slack messages include:
- Event type (emoji + title)
- Agent ID and action type
- Risk tier badge
- Timestamp
- Link to console

To customize:
- Edit `apps/console-proxy/lib/notifications.js`
- Modify `formatSlackMessage()` function

### 4. Troubleshooting

**Messages not appearing?**
- Verify webhook URL is correct
- Check channel permissions
- Test integration from console
- Check Slack app is installed in workspace

**Rate limiting?**
- Slack allows 1 message per second
- Vienna batches events automatically

---

## Email Integration

Send email notifications via SMTP or email service provider.

### 1. Configure SMTP Settings

**Option A: Gmail**

1. Enable 2FA on your Google account
2. Go to https://myaccount.google.com/apppasswords
3. Create app password for "Vienna OS"
4. Use these settings:
   - **SMTP Host:** `smtp.gmail.com`
   - **Port:** `587`
   - **Username:** your-email@gmail.com
   - **Password:** App password from step 3
   - **TLS:** Enabled

**Option B: SendGrid**

1. Sign up at https://sendgrid.com
2. Create API key
3. Settings:
   - **SMTP Host:** `smtp.sendgrid.net`
   - **Port:** `587`
   - **Username:** `apikey`
   - **Password:** Your SendGrid API key

**Option C: AWS SES**

1. Verify domain in AWS SES
2. Create SMTP credentials
3. Settings:
   - **SMTP Host:** `email-smtp.[region].amazonaws.com`
   - **Port:** `587`
   - **Username:** IAM SMTP username
   - **Password:** IAM SMTP password

### 2. Configure in Vienna OS

1. Go to console settings → Integrations
2. Click **Add Integration** → **Email**
3. Fill in:
   - **Name:** "Email Notifications"
   - **Recipients:** admin@company.com (comma-separated for multiple)
   - **From Name:** "Vienna OS"
   - **Subject Prefix:** "[Vienna]"
4. Select events
5. Click **Save**

### 3. Email Template

Default template includes:
- Subject: `[Vienna] {event_type} - {agent_id}`
- Body: HTML formatted with:
  - Event summary
  - Agent details
  - Action payload
  - Risk tier
  - Link to console

To customize:
- Edit `apps/console-proxy/lib/email-templates/`

### 4. Best Practices

- Use dedicated email account (e.g., vienna@company.com)
- Set up email filters/labels
- Configure digest mode for high-volume (batch emails hourly)
- Test with yourself first before adding team

---

## Custom Webhook Integration

POST governance events to your own HTTP endpoint.

### 1. Create Webhook Endpoint

Your endpoint must:
- Accept POST requests
- Return 200 OK within 5 seconds
- Handle Vienna event payload

**Example (Node.js/Express):**

```javascript
app.post('/webhooks/vienna', express.json(), (req, res) => {
  const { event_type, timestamp, data } = req.body;
  
  // Verify signature (optional but recommended)
  const signature = req.headers['x-vienna-signature'];
  if (!verifySignature(req.body, signature, SECRET)) {
    return res.status(401).send('Invalid signature');
  }
  
  // Handle event
  console.log(`Vienna event: ${event_type}`, data);
  
  // Store in database, trigger alerts, etc.
  handleGovernanceEvent(event_type, data);
  
  res.status(200).send('OK');
});

function verifySignature(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}
```

**Example (Python/Flask):**

```python
@app.route('/webhooks/vienna', methods=['POST'])
def vienna_webhook():
    data = request.json
    event_type = data['event_type']
    timestamp = data['timestamp']
    event_data = data['data']
    
    # Verify signature
    signature = request.headers.get('X-Vienna-Signature')
    if not verify_signature(request.data, signature, SECRET):
        return 'Invalid signature', 401
    
    # Handle event
    handle_governance_event(event_type, event_data)
    
    return 'OK', 200

def verify_signature(payload, signature, secret):
    expected = hmac.new(
        secret.encode(),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)
```

### 2. Configure in Vienna OS

1. Go to console → Integrations
2. Click **Add Integration** → **Webhook**
3. Fill in:
   - **Name:** "Custom Webhook"
   - **Endpoint URL:** https://your-api.com/webhooks/vienna
   - **Signing Secret:** Generate a random string (save it!)
   - **Custom Headers:** (optional, e.g., API keys)
4. Select events
5. Click **Test** to verify connectivity
6. Click **Save**

### 3. Event Payload Format

```json
{
  "event_type": "approval_required",
  "timestamp": "2026-04-14T19:30:00Z",
  "data": {
    "approval_id": "apr_123",
    "intent_id": "int_456",
    "agent_id": "finance_agent",
    "action_type": "charge_card",
    "risk_tier": "T2",
    "payload": {
      "amount": 2500,
      "merchant": "Acme Corp"
    },
    "required_approvers": 2,
    "expires_at": "2026-04-14T21:30:00Z"
  }
}
```

### 4. Event Types

| Event | Description |
|-------|-------------|
| `approval_required` | High-risk action needs approval |
| `approval_resolved` | Approval approved or denied |
| `action_executed` | Action completed successfully |
| `action_failed` | Action execution failed |
| `policy_violation` | Agent violated policy |
| `warrant_issued` | New warrant created |

### 5. Security Best Practices

- **Always verify signatures** (prevent replay attacks)
- Use HTTPS only
- Rotate signing secrets regularly
- Implement rate limiting
- Log all webhook deliveries
- Set up monitoring/alerting

### 6. Retry Logic

Vienna automatically retries failed webhooks:
- 3 retries with exponential backoff
- 1s, 5s, 30s intervals
- After 3 failures, integration is marked as "degraded"

To manually retry:
- Go to Integrations → Your webhook → Events log
- Click **Retry** on failed events

---

## GitHub Integration

Create GitHub issues for policy violations and high-risk actions.

### 1. Create GitHub Personal Access Token

1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Click **Generate new token (classic)**
3. Set scopes:
   - ✅ `repo` (full control)
   - ✅ `write:discussion`
4. Generate and **copy token** (starts with `ghp_`)

### 2. Configure in Vienna OS

1. Console → Integrations → Add → GitHub
2. Fill in:
   - **Name:** "GitHub Issues"
   - **Personal Access Token:** Paste from step 1.4
   - **Repository:** `your-org/your-repo`
   - **Labels:** `governance,audit` (comma-separated)
3. Select events:
   - ✅ Policy Violation
   - ✅ Approval Required (T2+ only)
4. Click **Test** (creates a test issue)
5. Click **Save**

### 3. Issue Template

Vienna creates issues with:
- **Title:** `[Vienna] {event_type} - {agent_id}`
- **Body:**
  ```markdown
  ## Governance Alert
  
  **Event:** {event_type}  
  **Agent:** {agent_id}  
  **Action:** {action_type}  
  **Risk Tier:** {risk_tier}  
  **Time:** {timestamp}
  
  ## Details
  
  {payload_formatted}
  
  ## Links
  
  - [View in Console](https://console.regulator.ai/approvals/{id})
  - [Agent Profile](https://console.regulator.ai/fleet/{agent_id})
  ```
- **Labels:** `governance`, `audit`, risk tier (e.g., `T2`)

### 4. Automation Ideas

- Auto-assign issues to security team
- Create projects for governance tracking
- Link issues to PRs
- Use GitHub Actions to trigger additional workflows

---

## Testing Integrations

### Test from Console

1. Go to Integrations
2. Select your integration
3. Click **Test Integration**
4. Check destination (Slack channel, email, etc.)

### Test via API

```bash
curl -X POST https://console.regulator.ai/api/v1/integrations/{id}/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

### Monitor Delivery

1. Go to Integrations → Your integration
2. Click **Events** tab
3. View delivery log:
   - ✅ Delivered (200 OK)
   - ⏱️ Pending (retry scheduled)
   - ❌ Failed (see error message)

---

## Troubleshooting

### Integration Not Working

1. **Check enabled status** - Toggle might be off
2. **Verify credentials** - Test integration from console
3. **Check event filters** - Make sure relevant events are selected
4. **Review logs** - Integration events tab shows delivery attempts
5. **Test endpoint** - Use curl/Postman to verify your webhook
6. **Check firewall** - Ensure Vienna can reach your endpoint

### Getting Help

- **Documentation:** https://regulator.ai/docs/integrations
- **Support:** support@regulator.ai
- **Community:** https://discord.com/invite/clawd

---

**Next:** See [ADMIN_GUIDE.md](./ADMIN_GUIDE.md) for team management and RBAC setup.
