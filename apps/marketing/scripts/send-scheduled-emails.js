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
    // Calculate dates for different email schedules
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - (24 * 60 * 60 * 1000));
    const sevenDaysAgo = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
    const fourteenDaysAgo = new Date(now.getTime() - (14 * 24 * 60 * 60 * 1000));

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

    // Find signups eligible for getting-started email (1 day old)
    const gettingStartedCandidates = await sql`
      SELECT s.email, s.name, s.company
      FROM signups s
      LEFT JOIN email_sent es ON s.email = es.email AND es.template = 'getting-started'
      WHERE s.created_at::date = ${oneDayAgo.toISOString().split('T')[0]}::date
        AND es.email IS NULL
    `;

    // Find signups eligible for week-one email (7 days old)
    const weekOneCandidates = await sql`
      SELECT s.email, s.name, s.company
      FROM signups s
      LEFT JOIN email_sent es ON s.email = es.email AND es.template = 'week-one'
      WHERE s.created_at::date = ${sevenDaysAgo.toISOString().split('T')[0]}::date
        AND es.email IS NULL
    `;

    // Find signups eligible for pilot-offer email (14 days old, community plan)
    const pilotOfferCandidates = await sql`
      SELECT s.email, s.name, s.company
      FROM signups s
      LEFT JOIN email_sent es ON s.email = es.email AND es.template = 'pilot-offer'
      WHERE s.created_at::date = ${fourteenDaysAgo.toISOString().split('T')[0]}::date
        AND s.plan = 'community'
        AND es.email IS NULL
    `;

    console.log(`[EmailScheduler] Found candidates:`);
    console.log(`  - Getting Started: ${gettingStartedCandidates.length}`);
    console.log(`  - Week One: ${weekOneCandidates.length}`);
    console.log(`  - Pilot Offer: ${pilotOfferCandidates.length}`);

    // Send getting-started emails
    for (const signup of gettingStartedCandidates) {
      await sendFollowupEmail(signup, 'getting-started', sql);
    }

    // Send week-one emails
    for (const signup of weekOneCandidates) {
      await sendFollowupEmail(signup, 'week-one', sql);
    }

    // Send pilot-offer emails
    for (const signup of pilotOfferCandidates) {
      await sendFollowupEmail(signup, 'pilot-offer', sql);
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
        company: signup.company
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