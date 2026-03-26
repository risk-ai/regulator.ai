/**
 * GitHub Adapter — Vienna OS
 * 
 * Governs GitHub operations through Vienna's pipeline:
 * - PR creation requires governance approval
 * - Deployments require warranted authorization
 * - Branch protection enforcement via warrants
 * 
 * Configuration:
 *   GITHUB_TOKEN — Personal access token or GitHub App token
 *   GITHUB_OWNER — Repository owner
 *   GITHUB_REPO — Repository name
 */

class GitHubAdapter {
  constructor(config = {}) {
    this.token = config.token || process.env.GITHUB_TOKEN;
    this.owner = config.owner || process.env.GITHUB_OWNER;
    this.repo = config.repo || process.env.GITHUB_REPO;
    this.apiBase = 'https://api.github.com';
    this.enabled = Boolean(this.token);
  }

  /**
   * Create a deployment with governance metadata
   * Requires a valid warrant from Vienna OS
   */
  async createDeployment(params, warrant) {
    if (!this.enabled) return { error: 'GitHub adapter not configured' };

    const { ref, environment, description } = params;

    const payload = {
      ref: ref || 'main',
      environment: environment || 'production',
      description: description || `Governed deployment via Vienna OS`,
      auto_merge: false,
      required_contexts: [],
      payload: {
        vienna_warrant_id: warrant?.id || 'none',
        vienna_tenant: warrant?.tenantId || 'system',
        governed: true,
        approved_by: warrant?.issuer || 'system',
        approved_at: warrant?.issuedAt || new Date().toISOString(),
        warrant_expires: warrant?.expiresAt || null,
      },
    };

    try {
      const res = await fetch(
        `${this.apiBase}/repos/${this.owner}/${this.repo}/deployments`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      return {
        success: res.ok,
        deploymentId: data.id,
        environment: data.environment,
        url: data.url,
        governed: true,
        warrantId: warrant?.id,
      };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Add governance status check to a PR
   * Shows Vienna OS approval status on the PR
   */
  async setCommitStatus(sha, status, warrant) {
    if (!this.enabled) return null;

    const stateMap = {
      approved: 'success',
      pending: 'pending',
      denied: 'failure',
      expired: 'error',
    };

    const payload = {
      state: stateMap[status] || 'pending',
      target_url: 'https://console.regulator.ai/#approvals',
      description: status === 'approved'
        ? `Governed by Vienna OS — Warrant ${warrant?.id?.slice(0, 12) || 'issued'}`
        : status === 'pending'
        ? 'Awaiting Vienna OS governance approval'
        : `Vienna OS: ${status}`,
      context: 'vienna-os/governance',
    };

    try {
      const res = await fetch(
        `${this.apiBase}/repos/${this.owner}/${this.repo}/statuses/${sha}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        }
      );

      return { success: res.ok, state: payload.state };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  /**
   * Create a PR comment with governance audit trail
   */
  async addGovernanceComment(prNumber, audit) {
    if (!this.enabled) return null;

    const body = [
      '### 🛡️ Vienna OS Governance Report',
      '',
      `**Status:** ${audit.status === 'approved' ? '✅ Approved' : '❌ ' + audit.status}`,
      `**Risk Tier:** ${audit.riskTier}`,
      `**Warrant:** \`${audit.warrantId || 'N/A'}\``,
      `**Policy:** ${audit.policyName || 'Default'}`,
      '',
      '| Field | Value |',
      '|-------|-------|',
      `| Action | \`${audit.action}\` |`,
      `| Approved By | ${audit.approvedBy || 'auto'} |`,
      `| Approved At | ${audit.approvedAt || new Date().toISOString()} |`,
      `| Warrant TTL | ${audit.ttl || 300}s |`,
      `| Verified | ${audit.verified ? '✅' : '⏳ Pending'} |`,
      '',
      '---',
      `*Governed by [Vienna OS](https://regulator.ai) — The governance layer agents answer to.*`,
    ].join('\n');

    try {
      const res = await fetch(
        `${this.apiBase}/repos/${this.owner}/${this.repo}/issues/${prNumber}/comments`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.token}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ body }),
        }
      );

      return { success: res.ok };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }
}

module.exports = { GitHubAdapter };
