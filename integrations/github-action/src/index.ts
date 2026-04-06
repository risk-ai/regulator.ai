/**
 * Vienna OS GitHub Action — Governed CI/CD
 * 
 * Submits a governance intent to Vienna OS before proceeding.
 * If the intent is approved (T0/T1 auto-approve, T2/T3 wait for human),
 * the action succeeds and outputs the warrant ID + OWS token.
 * If denied, the action fails — blocking the pipeline.
 * 
 * Usage in workflow:
 * 
 *   - name: Request deployment warrant
 *     uses: vienna-os/govern-action@v1
 *     id: govern
 *     with:
 *       vienna-url: https://console.regulator.ai
 *       api-key: ${{ secrets.VIENNA_API_KEY }}
 *       action: deploy.production
 *       context: '{"environment": "production", "branch": "${{ github.ref_name }}", "sha": "${{ github.sha }}"}'
 * 
 *   - name: Deploy (only if governed)
 *     if: steps.govern.outputs.status == 'approved'
 *     run: ./deploy.sh
 *     env:
 *       WARRANT_ID: ${{ steps.govern.outputs.warrant-id }}
 *       OWS_TOKEN: ${{ steps.govern.outputs.ows-token }}
 */

import * as core from '@actions/core';

interface IntentResponse {
  success: boolean;
  intent_id?: string;
  status?: string;
  risk_tier?: string;
  warrant_id?: string;
  warrant?: {
    warrant_id: string;
    expires_at: string;
    [key: string]: unknown;
  };
  approval_id?: string;
  message?: string;
  error?: string;
}

async function run(): Promise<void> {
  try {
    const viennaUrl = core.getInput('vienna-url', { required: true }).replace(/\/$/, '');
    const apiKey = core.getInput('api-key', { required: true });
    const action = core.getInput('action', { required: true });
    const agentId = core.getInput('agent-id') || 'github-actions';
    const riskTierOverride = core.getInput('risk-tier') || undefined;
    const contextStr = core.getInput('context') || '{}';
    const timeoutSeconds = parseInt(core.getInput('timeout') || '300', 10);
    const failOnDeny = core.getInput('fail-on-deny') !== 'false';

    let context: Record<string, unknown> = {};
    try {
      context = JSON.parse(contextStr);
    } catch {
      core.warning(`Failed to parse context JSON, using empty object`);
    }

    // Add GitHub context
    context.github_repository = process.env.GITHUB_REPOSITORY;
    context.github_sha = process.env.GITHUB_SHA;
    context.github_ref = process.env.GITHUB_REF;
    context.github_actor = process.env.GITHUB_ACTOR;
    context.github_workflow = process.env.GITHUB_WORKFLOW;
    context.github_run_id = process.env.GITHUB_RUN_ID;

    core.info(`🛡️ Vienna OS: Submitting governance intent`);
    core.info(`   Action: ${action}`);
    core.info(`   Agent: ${agentId}`);
    core.info(`   URL: ${viennaUrl}`);

    // Submit intent
    const submitResponse = await fetch(`${viennaUrl}/api/v1/intents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'vienna-os-github-action/1.0',
      },
      body: JSON.stringify({
        agent_id: agentId,
        action,
        params: context,
        metadata: {
          source: 'github-action',
          risk_tier: riskTierOverride,
          ...context,
        },
      }),
    });

    if (!submitResponse.ok) {
      const errorText = await submitResponse.text();
      throw new Error(`Vienna OS API error (${submitResponse.status}): ${errorText}`);
    }

    const result: IntentResponse = await submitResponse.json();

    if (!result.success) {
      throw new Error(`Intent submission failed: ${result.error || 'Unknown error'}`);
    }

    const intentId = result.intent_id || '';
    const riskTier = result.risk_tier || 'unknown';
    const status = result.status || 'unknown';

    core.info(`   Intent ID: ${intentId}`);
    core.info(`   Risk Tier: ${riskTier}`);
    core.info(`   Status: ${status}`);

    core.setOutput('intent-id', intentId);
    core.setOutput('risk-tier', riskTier);

    // Handle immediate decisions (T0/T1 auto-approve)
    if (status === 'approved') {
      const warrantId = result.warrant_id || result.warrant?.warrant_id || '';
      core.info(`✅ Governance approved — Warrant: ${warrantId}`);
      core.setOutput('status', 'approved');
      core.setOutput('warrant-id', warrantId);

      // Try to get OWS token
      try {
        const owsResponse = await fetch(`${viennaUrl}/api/v1/ows/issue`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ warrant_id: warrantId }),
        });
        if (owsResponse.ok) {
          const owsResult = await owsResponse.json();
          if (owsResult.data?.token) {
            core.setOutput('ows-token', owsResult.data.token);
            core.info(`   OWS Token: ${owsResult.data.token.slice(0, 30)}...`);
          }
        }
      } catch {
        core.debug('OWS token generation skipped');
      }

      return;
    }

    // Handle denial
    if (status === 'denied') {
      const message = `❌ Governance denied: ${result.message || 'No reason provided'}`;
      core.setOutput('status', 'denied');

      if (failOnDeny) {
        core.setFailed(message);
      } else {
        core.warning(message);
      }
      return;
    }

    // Handle pending (T2/T3 — wait for human approval)
    if (status === 'pending') {
      core.info(`⏳ Waiting for human approval (timeout: ${timeoutSeconds}s)...`);
      core.info(`   Approve at: ${viennaUrl}/approvals`);

      const deadline = Date.now() + timeoutSeconds * 1000;
      const pollInterval = 5000; // 5 seconds

      while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, pollInterval));

        const pollResponse = await fetch(`${viennaUrl}/api/v1/intents/${intentId}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
        });

        if (!pollResponse.ok) continue;

        const pollResult: IntentResponse = await pollResponse.json();
        const currentStatus = pollResult.status;

        if (currentStatus === 'approved') {
          const warrantId = pollResult.warrant_id || '';
          core.info(`✅ Approved by human reviewer — Warrant: ${warrantId}`);
          core.setOutput('status', 'approved');
          core.setOutput('warrant-id', warrantId);
          return;
        }

        if (currentStatus === 'denied') {
          const message = `❌ Denied by reviewer: ${pollResult.message || 'No reason'}`;
          core.setOutput('status', 'denied');
          if (failOnDeny) {
            core.setFailed(message);
          } else {
            core.warning(message);
          }
          return;
        }

        const remaining = Math.ceil((deadline - Date.now()) / 1000);
        core.info(`   Still pending... ${remaining}s remaining`);
      }

      // Timeout
      const message = `⏰ Approval timeout after ${timeoutSeconds}s`;
      core.setOutput('status', 'timeout');

      if (failOnDeny) {
        core.setFailed(message);
      } else {
        core.warning(message);
      }
    }

  } catch (error) {
    core.setFailed(`Vienna OS governance check failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

run();
