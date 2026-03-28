# Vienna OS Email Onboarding System

This document describes the email onboarding system for Vienna OS, including templates, scheduling, and database integration.

## Overview

The email system provides a progressive onboarding experience with four key touchpoints:

1. **Welcome Email** - Sent immediately upon signup
2. **Getting Started Email** - Sent 1 day after signup
3. **Week One Email** - Sent 7 days after signup  
4. **Pilot Offer Email** - Sent 14 days after signup (community plan only)

## Email Templates

All email templates are located in `src/emails/` and use inline HTML for maximum compatibility:

### Welcome Email (`welcome.tsx`)
- **Trigger**: Immediately after successful signup
- **Purpose**: Welcome user, provide quick start steps
- **Content**: 
  - Welcome message with first name personalization
  - 3-step getting started guide (Console, API, Docs)
  - Different content for enterprise vs community plans
  - Links to sandbox console and documentation

### Getting Started Email (`getting-started.tsx`) 
- **Trigger**: 1 day after signup
- **Purpose**: Guide user to create their first policy
- **Content**:
  - Step-by-step policy creation tutorial
  - Code example for basic content safety policy
  - Link to interactive demo
  - Policy templates reference

### Week One Email (`week-one.tsx`)
- **Trigger**: 7 days after signup
- **Purpose**: Production deployment guidance and feature highlights
- **Content**:
  - Production deployment checklist
  - Advanced features they might have missed
  - Community links and upgrade CTAs
  - Team plan promotion

### Pilot Offer Email (`pilot-offer.tsx`)
- **Trigger**: 14 days after signup (community plan only)
- **Purpose**: Invite to exclusive pilot program
- **Content**:
  - Exclusive pilot program invitation
  - Benefits and social proof
  - Schedule consultation CTA
  - Limited availability urgency

## Database Integration

### Signups Table

The system creates and uses a `signups` table in the Neon database:

```sql
CREATE TABLE IF NOT EXISTS signups (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  company TEXT,
  plan TEXT DEFAULT 'community',
  source TEXT,
  agent_count TEXT,
  use_case TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Email Tracking Table

To prevent duplicate emails, the system tracks sent emails:

```sql
CREATE TABLE IF NOT EXISTS email_sent (
  id SERIAL PRIMARY KEY,
  email TEXT NOT NULL,
  template TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(email, template)
);
```

## API Routes

### `/api/signup` (Enhanced)
- **Method**: POST
- **Purpose**: Process new signups and send welcome email
- **Enhancements**:
  - Stores signup data in Neon database
  - Sends enhanced welcome email using new template
  - Logs follow-up email scheduling
  - Returns success status with storage confirmation

### `/api/email/send-followup`
- **Method**: POST
- **Purpose**: Send scheduled follow-up emails
- **Parameters**:
  - `email` - Recipient email address
  - `name` - User's full name
  - `template` - Template to use (`getting-started`, `week-one`, `pilot-offer`)
  - `company` - User's company (optional)

## Email Scheduling

### Manual API Calls
Follow-up emails can be sent manually via API:

```bash
curl -X POST https://regulator.ai/api/email/send-followup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "name": "John Doe", 
    "template": "getting-started",
    "company": "Acme Corp"
  }'
```

### Automated Scheduling (Cron)

The `scripts/send-scheduled-emails.js` script can be run via cron to automatically send follow-up emails:

```bash
# Run daily at 9 AM
0 9 * * * cd /path/to/vienna-marketing && node scripts/send-scheduled-emails.js
```

The script:
- Checks for signups eligible for each email type based on date
- Prevents duplicate sends using the `email_sent` tracking table
- Calls the follow-up API for each eligible user
- Includes rate limiting (1 second delay between emails)

## Environment Variables

Required environment variables:

- `POSTGRES_URL` - Neon database connection string
- `RESEND_API_KEY` - Resend API key for sending emails
- `BASE_URL` - Base URL for API calls (defaults to https://regulator.ai)

## Email Service (Resend)

The system uses [Resend](https://resend.com/) for transactional email delivery:

- **From Address**: `Vienna OS <hello@regulator.ai>`
- **Templates**: Inline HTML for maximum compatibility
- **Rate Limiting**: 1 second delay between sends in batch operations
- **Error Handling**: Failed sends are logged but don't stop the process

## Signup Success Page Enhancement

The signup success page (`src/app/signup/success/page.tsx`) has been enhanced with:

- **Improved Visual Design**: Modern, engaging layout with icons and gradients
- **Clear Next Steps**: 3-step getting started guide
- **Live Console Access**: Direct links with credentials for sandbox
- **Email Confirmation**: Notification about welcome email
- **Learning Journey Preview**: Timeline of upcoming emails
- **Quick Access Links**: Direct links to docs, policies, and GitHub

## Development Notes

### React Email Alternative
Due to Next.js App Router constraints with `react-dom/server`, the email templates are implemented as:
1. React components (for development/preview)
2. Inline HTML generators (for production use)

This approach ensures compatibility while maintaining the ability to preview templates during development.

### Testing
To test the email system:

1. **Signup Flow**: Submit the signup form on `/signup` 
2. **Manual Email**: Call `/api/email/send-followup` directly
3. **Scheduled Emails**: Run `scripts/send-scheduled-emails.js` manually

### Deployment
1. Ensure `RESEND_API_KEY` and `POSTGRES_URL` are set
2. Deploy the Next.js application
3. Set up cron job for automated email scheduling
4. Monitor email delivery in Resend dashboard

## Future Enhancements

- **Email Analytics**: Track open rates, clicks, and conversions
- **A/B Testing**: Test different subject lines and content
- **Segmentation**: Customize content based on use case or company size
- **Unsubscribe Handling**: Implement unsubscribe functionality
- **Email Preferences**: Allow users to customize email frequency
- **Webhooks**: Handle Resend webhooks for delivery tracking