/**
 * Example: Batch Intent Submission
 *
 * Efficiently submit multiple intents with concurrency control,
 * error isolation, and summary reporting.
 */

import { ViennaClient } from '../src';
import type { Intent, IntentResult } from '../src/types';
import { ViennaError } from '../src/errors';

const vienna = new ViennaClient({
  baseUrl: process.env.VIENNA_BASE_URL || 'https://console.regulator.ai',
  agentId: process.env.VIENNA_AGENT_ID || 'batch-agent',
  apiKey: process.env.VIENNA_API_KEY,
});

// ─── Batch Configuration ────────────────────────────────────────

interface BatchConfig {
  concurrency: number;      // Max parallel submissions (respect rate limits)
  stopOnBlock: boolean;     // Stop batch if any intent is blocked by policy
  delayBetweenMs: number;   // Delay between submissions (rate limit friendly)
}

interface BatchResult {
  total: number;
  succeeded: number;
  blocked: number;
  failed: number;
  results: Array<{
    intent: Intent;
    result?: IntentResult;
    error?: string;
    durationMs: number;
  }>;
}

const DEFAULT_BATCH: BatchConfig = {
  concurrency: 5,
  stopOnBlock: false,
  delayBetweenMs: 100,
};

// ─── Batch Executor ─────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function submitBatch(
  intents: Intent[],
  config: BatchConfig = DEFAULT_BATCH,
): Promise<BatchResult> {
  const batch: BatchResult = {
    total: intents.length,
    succeeded: 0,
    blocked: 0,
    failed: 0,
    results: [],
  };

  // Process in chunks for concurrency control
  for (let i = 0; i < intents.length; i += config.concurrency) {
    const chunk = intents.slice(i, i + config.concurrency);

    const chunkResults = await Promise.allSettled(
      chunk.map(async (intent, idx) => {
        // Stagger within chunk
        if (idx > 0 && config.delayBetweenMs > 0) {
          await sleep(idx * config.delayBetweenMs);
        }

        const start = Date.now();
        try {
          const result = await vienna.submitIntent(intent);
          return { intent, result, durationMs: Date.now() - start };
        } catch (error) {
          return {
            intent,
            error: error instanceof Error ? error.message : String(error),
            durationMs: Date.now() - start,
          };
        }
      }),
    );

    for (const settled of chunkResults) {
      if (settled.status === 'fulfilled') {
        const r = settled.value;
        if (r.error) {
          batch.failed++;
          batch.results.push({ intent: r.intent, error: r.error, durationMs: r.durationMs });
        } else if (r.result?.pipeline === 'blocked') {
          batch.blocked++;
          batch.results.push({ intent: r.intent, result: r.result, durationMs: r.durationMs });
          if (config.stopOnBlock) {
            console.warn(`[Batch] Stopped: intent blocked by policy`);
            return batch;
          }
        } else {
          batch.succeeded++;
          batch.results.push({ intent: r.intent, result: r.result, durationMs: r.durationMs });
        }
      } else {
        batch.failed++;
        batch.results.push({
          intent: chunk[0], // Best effort
          error: settled.reason?.message || 'Unknown error',
          durationMs: 0,
        });
      }
    }

    // Delay between chunks
    if (i + config.concurrency < intents.length) {
      await sleep(config.delayBetweenMs);
    }
  }

  return batch;
}

// ─── Usage ──────────────────────────────────────────────────────

async function main() {
  // Build a batch of intents
  const services = ['api-gateway', 'worker-pool', 'scheduler', 'notifier', 'cache'];
  const intents: Intent[] = services.map(service => ({
    action: 'restart_service',
    payload: { service, reason: 'scheduled-maintenance' },
  }));

  console.log(`Submitting ${intents.length} intents (concurrency: 3)...\n`);

  const result = await submitBatch(intents, {
    concurrency: 3,
    stopOnBlock: false,
    delayBetweenMs: 200,
  });

  // Summary
  console.log('=== Batch Summary ===');
  console.log(`Total: ${result.total}`);
  console.log(`Succeeded: ${result.succeeded}`);
  console.log(`Blocked: ${result.blocked}`);
  console.log(`Failed: ${result.failed}`);

  console.log('\n=== Details ===');
  for (const r of result.results) {
    const icon = r.error ? '❌' : r.result?.pipeline === 'blocked' ? '🚫' : '✅';
    const status = r.error || r.result?.pipeline || 'unknown';
    console.log(`${icon} ${r.intent.action} (${r.intent.payload?.service}): ${status} [${r.durationMs}ms]`);
  }
}

main().catch(console.error);
