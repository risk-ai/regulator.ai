#!/usr/bin/env node
/**
 * Vienna OS Email Scheduler
 * 
 * This script sends scheduled follow-up emails based on signup dates.
 * Should be run via cron job, e.g.:
 *   0 9 * * * node /path/to/send-scheduled-emails.js
 * 
 * Requires POSTGRES_URL and RESEND_API_KEY environment variables.
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

async function sendScheduledEmails() {
  const neonUrl = process.env.POSTGRES_URL;
  
  if (!neonUrl) {
    console.error('POSTGRES_URL environment variable not set');
    process.exit(1);
  }

  const sql = neon(neonUrl);
  
  try {
    // Calculate dates for Vienna OS email drip sequence
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - (3 * 24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));

    console.log(`[EmailScheduler] Running at ${now.toISOString()}`);

    // Create email_sent tracking table if it doesn't exist
    await sql`
      CREATE TABLE IF NOT EXISTS email_sent (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL,
        template TEXT NOT NULL,
        sent_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(email, template)
      )
    `;

    // Find signups eligible for use-case-deep-dive email (3 days old)
    const useCaseCandidates = await sql`
      SELECT s.email, s.name, s.company, s.plan, s.use_case
      FROM signups s
      LEFT JOIN email_sent es ON s.email = es.email AND es.template = 'use-case-deep-dive'
      WHERE s.created_at::date = ${threeDaysAgo.toISOString().split('T')[0]}::date
        AND es.email IS NULL
    `;

    // Find signups eligible for roi-urgency email (7 days old)
    const roiUrgencyCandidates = await sql`
      SELECT s.email, s.name, s.company, s.plan, s.use_case
      FROM signups s
      LEFT JOIN email_sent es ON s.email = es.email AND es.template = 'roi-urgency'
      WHERE s.created_at::date = ${sevenDaysAgo.toISOString().split('T')[0]}::date
        AND es.email IS NULL
    `;

    console.log(`[EmailScheduler] Found candidates:`);
    console.log(`  - Use Case Deep Dive (Day 3): ${useCaseCandidates.length}`);
    console.log(`  - ROI & Urgency (Day 7): ${roiUrgencyCandidates.length}`);

    // Send use-case-deep-dive emails (Day 3)
    for (const signup of useCaseCandidates) {
      await sendFollowupEmail(signup, 'use-case-deep-dive', sql);
    }

    // Send roi-urgency emails (Day 7)
    for (const signup of roiUrgencyCandidates) {
      await sendFollowupEmail(signup, 'roi-urgency', sql);
    }

    console.log(`[EmailScheduler] Completed successfully`);

  } catch (error) {
    console.error('[EmailScheduler] Error:', error);
    process.exit(1);
  }
}

async function sendFollowupEmail(signup, template, sql) {
  try {
    const response = await fetch(`${process.env.BASE_URL || 'https://regulator.ai'}/api/email/send-followup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: signup.email,
        name: signup.name,
        template: template,
        company: signup.company,
        plan: signup.plan,
        useCase: signup.use_case
      })
    });

    if (response.ok) {
      // Track that we sent this email
      await sql`
        INSERT INTO email_sent (email, template) 
        VALUES (${signup.email}, ${template})
        ON CONFLICT (email, template) DO NOTHING
      `;
      
      console.log(`[EmailScheduler] Sent ${template} email to ${signup.email}`);
    } else {
      const error = await response.text();
      console.error(`[EmailScheduler] Failed to send ${template} email to ${signup.email}:`, error);
    }

    // Add delay between emails to be nice to Resend
    await new Promise(resolve => setTimeout(resolve, 1000));

  } catch (error) {
    console.error(`[EmailScheduler] Error sending ${template} email to ${signup.email}:`, error);
  }
}

// Run the scheduler
sendScheduledEmails();