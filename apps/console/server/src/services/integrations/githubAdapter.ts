/**
 * GitHub Integration Adapter — Vienna OS
 * 
 * Creates PR comments with governance status and updates commit statuses.
 */

import type { IntegrationAdapter, IntegrationEvent, ConfigSchema } from './types.js';

const RISK_TIER_EMOJI: Record<string, string> = {
  T0: '🟢', T1: '🟡', T2: '🔴', T3: '🟣',
};

const STATUS_MAP: Record<string, 'pending' | 'success' | 'failure' | 'error'> = {
  approval_required: 'pending',
  approval_resolved: 'success',
  action_executed: 'success',
  action_failed: 'failure',
  policy_violation: 'error',
  alert: 'error',
};

function buildCommentBody(event: IntegrationEvent): string {
  const { type, data } = event;
  const tierEmoji = data.risk_tier ? (RISK_TIER_EMOJI[data.risk_tier] || '⚪') : '';
  
  const lines: string[] = [];
  lines.push(`## ⚡ Vienna Governance: ${formatEventType(type)}`);
  lines.push('');

  if (data.summary) lines.push(`> ${data.summary}`);
  lines.push('');

  lines.push('| Field | Value |');
  lines.push('|-------|-------|');
  if (data.risk_tier) lines.push(`| Risk Tier | ${tierEmoji} **${data.risk_tier}** |`);
  if (data.agent_id) lines.push(`| Agent | \`${data.agent_id}\` |`);
  if (data.action_type) lines.push(`| Action | \`${data.action_type}\` |`);
  if (data.intent_id) lines.push(`| Intent | \`${data.intent_id.slice(0, 12)}\` |`);
  if (data.approval_id) lines.push(`| Approval | \`${data.approval_id.slice(0, 12)}\` |`);
  lines.push(`| Timestamp | ${new Date(data.timestamp).toISOString()} |`);

  if (data.details && Object.keys(data.details).length > 0) {
    lines.push('');
    lines.push('<details><summary>Details</summary>');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(data.details, null, 2));
    lines.push('```');
    lines.push('</details>');
  }

  lines.push('');
  lines.push('---');
  lines.push('*Posted by Vienna OS Governance Engine*');

  return lines.join('\n');
}

function formatEventType(type: string): string {
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

async function githubApi(path: string, token: string, options?: RequestInit): Promise<{ ok: boolean; status: number; data: any }> {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

export const githubAdapter: IntegrationAdapter = {
  type: 'github',

  validateConfig(config) {
    const errors: string[] = [];
    if (!config.token) errors.push('GitHub token is required');
    if (!config.owner) errors.push('Repository owner is required');
    if (!config.repo) errors.push('Repository name is required');
    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  },

  async sendNotification(event, config) {
    const { token, owner, repo } = config;
    const prNumber = event.data.details?.pr_number;
    const commitSha = event.data.details?.commit_sha;

    const results: any[] = [];

    // Post PR comment if we have a PR number
    if (prNumber) {
      const body = buildCommentBody(event);
      const result = await githubApi(
        `/repos/${owner}/${repo}/issues/${prNumber}/comments`,
        token,
        { method: 'POST', body: JSON.stringify({ body }) }
      );
      results.push({ action: 'comment', ...result });
      if (!result.ok) {
        return { success: false, error: `PR comment failed: ${result.status}`, response: result.data };
      }
    }

    // Update commit status if we have a SHA
    if (commitSha) {
      const state = STATUS_MAP[event.type] || 'pending';
      const result = await githubApi(
        `/repos/${owner}/${repo}/statuses/${commitSha}`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            state,
            target_url: config.console_url || undefined,
            description: event.data.summary || formatEventType(event.type),
            context: 'vienna-os/governance',
          }),
        }
      );
      results.push({ action: 'status', ...result });
      if (!result.ok) {
        return { success: false, error: `Commit status failed: ${result.status}`, response: result.data };
      }
    }

    // If neither PR nor commit, create an issue comment or just log
    if (!prNumber && !commitSha) {
      return { success: true, response: { message: 'No PR number or commit SHA in event, notification skipped' } };
    }

    return { success: true, response: { results } };
  },

  async testConnection(config) {
    const validation = this.validateConfig(config);
    if (!validation.valid) return { success: false, message: validation.errors!.join(', ') };

    const result = await githubApi(`/repos/${config.owner}/${config.repo}`, config.token);
    
    if (!result.ok) {
      if (result.status === 401) return { success: false, message: 'Invalid GitHub token' };
      if (result.status === 404) return { success: false, message: `Repository ${config.owner}/${config.repo} not found or no access` };
      return { success: false, message: `GitHub API returned ${result.status}` };
    }

    return { success: true, message: `Connected to ${result.data.full_name} (${result.data.visibility})` };
  },
};

export const githubConfigSchema: ConfigSchema = {
  type: 'github',
  label: 'GitHub',
  description: 'Post PR comments and update commit statuses for governance events',
  icon: '🐙',
  fields: [
    { key: 'token', label: 'Personal Access Token', type: 'password', required: true, placeholder: 'ghp_...', help: 'Needs repo scope for status/comments' },
    { key: 'owner', label: 'Repository Owner', type: 'text', required: true, placeholder: 'my-org' },
    { key: 'repo', label: 'Repository Name', type: 'text', required: true, placeholder: 'my-repo' },
    { key: 'console_url', label: 'Console URL', type: 'url', required: false, placeholder: 'https://vienna.yourcompany.com', help: 'Link from commit status to Vienna console' },
  ],
};
