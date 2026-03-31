#!/usr/bin/env node
/**
 * Vienna OS Email Drip Scheduler
 * 
 * This script sends the Vienna OS welcome email drip sequence:
 * - Day 3: Use Case Deep Dive  
 * - Day 7: ROI & Urgency
 * 
 * Should be run via cron job, e.g.:
 *   # Run every day at 9:00 AM
 *   0 9 * * * node /path/to/email-drip-scheduler.js
 * 
 * Requires DATABASE_URL and RESEND_API_KEY environment variables.
 */

require('dotenv').config();
const { neon } = require('@neondatabase/serverless');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

async function runDripScheduler() {
  const neonUrl = process.env.DATABASE_URL;
  
  if (!neonUrl) {
    console.error('[DripScheduler] DATABASE_URL environment variable not set');
    process.exit(1);
  }

  if (!process.env.RESEND_API_KEY) {
    console.error('[DripScheduler] RESEND_API_KEY environment variable not set');
    process.exit(1);
  }

  const sql = neon(neonUrl);
  
  try {
    const now = new Date();
    console.log(`[DripScheduler] Running at ${now.toISOString()}`);

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

    // Process Day 3 emails (Use Case Deep Dive)
    await processDripEmail(sql, 3, 'use-case-deep-dive', '/api/email/drip/day3');
    
    // Process Day 7 emails (ROI & Urgency)  
    await processDripEmail(sql, 7, 'roi-urgency', '/api/email/drip/day7');

    console.log(`[DripScheduler] Completed successfully at ${new Date().toISOString()}`);

  } catch (error) {
    console.error('[DripScheduler] Error:', error);
    process.exit(1);
  }
}

async function processDripEmail(sql, dayOffset, templateName, apiPath) {
  try {
    const targetDate = new Date(Date.now() - (dayOffset * 24 * 60 * 60 * 1000));
    const dateStr = targetDate.toISOString().split('T')[0];
    
    console.log(`[DripScheduler] Processing Day ${dayOffset} emails for ${dateStr}`);

    // Find eligible signups
    const candidates = await sql`
      SELECT s.email, s.name, s.company, s.plan, s.use_case
      FROM signups s
      LEFT JOIN email_sent es ON s.email = es.email AND es.template = ${templateName}
      WHERE s.created_at::date = ${dateStr}::date
        AND es.email IS NULL
        AND s.email IS NOT NULL
        AND s.name IS NOT NULL
      ORDER BY s.created_at ASC
    `;

    if (candidates.length === 0) {
      console.log(`[DripScheduler] No candidates found for Day ${dayOffset}`);
      return;
    }

    console.log(`[DripScheduler] Found ${candidates.length} candidates for Day ${dayOffset}`);

    // Send emails in batches to avoid overwhelming Resend
    const BATCH_SIZE = 10;
    const batches = [];
    
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      batches.push(candidates.slice(i, i + BATCH_SIZE));
    }

    let totalSent = 0;
    let totalFailed = 0;

    for (const batch of batches) {
      try {
        const response = await fetch(`${BASE_URL}${apiPath}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emails: batch.map(signup => ({
              email: signup.email,
              name: signup.name,
              company: signup.company,
              plan: signup.plan,
              useCase: signup.use_case
            }))
          })
        });

        if (response.ok) {
          const result = await response.json();
          totalSent += result.summary.sent;
          totalFailed += result.summary.failed;
          
          // Mark successful emails as sent
          for (const emailResult of result.results) {
            if (emailResult.success) {
              await sql`
                INSERT INTO email_sent (email, template) 
                VALUES (${emailResult.email}, ${templateName})
                ON CONFLICT (email, template) DO NOTHING
              `;
            }
          }
          
          console.log(`[DripScheduler] Day ${dayOffset} batch: ${result.summary.sent} sent, ${result.summary.failed} failed`);
        } else {
          const error = await response.text();
          console.error(`[DripScheduler] Day ${dayOffset} API error:`, error);
          totalFailed += batch.length;
        }

        // Rate limiting: wait between batches
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }

      } catch (batchError) {
        console.error(`[DripScheduler] Error processing Day ${dayOffset} batch:`, batchError);
        totalFailed += batch.length;
      }
    }

    console.log(`[DripScheduler] Day ${dayOffset} complete: ${totalSent} sent, ${totalFailed} failed`);

  } catch (error) {
    console.error(`[DripScheduler] Error processing Day ${dayOffset}:`, error);
  }
}

// Run the scheduler
if (require.main === module) {
  runDripScheduler();
}

module.exports = { runDripScheduler };