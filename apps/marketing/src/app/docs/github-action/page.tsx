/**
 * GitHub Action Documentation — Vienna OS
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GitHub Action - Vienna OS Docs',
  description: 'Use the Vienna OS GitHub Action to govern deployments in your CI/CD pipeline',
};

export default function GitHubActionDocsPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <div className="prose prose-invert max-w-none">
        <h1>Vienna OS GitHub Action</h1>
        
        <p className="lead">
          Integrate Vienna OS governance directly into your GitHub workflows. 
          The Vienna OS GitHub Action allows you to govern deployments, releases, and other 
          critical operations through your existing CI/CD pipeline.
        </p>

        <h2>Quick Start</h2>

        <p>Add the Vienna OS governance check to your workflow:</p>

        <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
          <code>{`name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Vienna OS Governance Check
        uses: vienna-os/governance-action@v1
        with:
          api-key: \${{ secrets.VIENNA_API_KEY }}
          action: 'deploy'
          environment: 'production'
          agent-id: 'github-ci'

      - name: Deploy Application
        run: |
          echo "Deploying to production..."
          # Your deployment commands here`}
          </code>
        </pre>

        <h2>Setup Instructions</h2>

        <h3>1. Get Your Vienna OS API Key</h3>
        
        <ol>
          <li>Log into your Vienna OS console at <a href="https://console.regulator.ai">console.regulator.ai</a></li>
          <li>Navigate to <strong>Settings → API Keys</strong></li>
          <li>Create a new API key with <code>execution:submit</code> permissions</li>
          <li>Copy the generated API key</li>
        </ol>

        <h3>2. Add API Key to GitHub Secrets</h3>

        <ol>
          <li>Go to your repository's <strong>Settings → Secrets and Variables → Actions</strong></li>
          <li>Click <strong>New repository secret</strong></li>
          <li>Name: <code>VIENNA_API_KEY</code></li>
          <li>Value: Your Vienna OS API key</li>
          <li>Click <strong>Add secret</strong></li>
        </ol>

        <h3>3. Add the Action to Your Workflow</h3>

        <p>Reference the action in your <code>.github/workflows/*.yml</code> file:</p>

        <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
          <code>{`- name: Vienna OS Governance Check
  uses: vienna-os/governance-action@v1
  with:
    api-key: \${{ secrets.VIENNA_API_KEY }}
    action: 'deploy'              # The action being governed
    environment: 'production'     # Target environment
    agent-id: 'github-ci'         # Optional: agent identifier`}
          </code>
        </pre>

        <h2>Configuration Options</h2>

        <div className="grid grid-cols-1 gap-4 my-8">
          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-purple-400">api-key</h4>
            <p className="text-sm text-gray-400 mt-1">Required</p>
            <p>Your Vienna OS API key. Store this as a GitHub secret.</p>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-purple-400">action</h4>
            <p className="text-sm text-gray-400 mt-1">Required (default: "deploy")</p>
            <p>The action type being governed. Examples: <code>deploy</code>, <code>release</code>, <code>migrate</code>, <code>rollback</code></p>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-purple-400">environment</h4>
            <p className="text-sm text-gray-400 mt-1">Optional (default: "production")</p>
            <p>Target environment. Examples: <code>production</code>, <code>staging</code>, <code>development</code></p>
          </div>

          <div className="border border-gray-700 rounded-lg p-4">
            <h4 className="font-semibold text-purple-400">agent-id</h4>
            <p className="text-sm text-gray-400 mt-1">Optional (default: "github-actions")</p>
            <p>Identifier for the agent performing the action. Used for governance policies and audit trails.</p>
          </div>
        </div>

        <h2>Governance Responses</h2>

        <p>The Vienna OS GitHub Action can return different governance modes:</p>

        <h3>✅ Allowed</h3>
        <p>The action is approved and the workflow continues normally.</p>

        <h3>⏳ Approval Required</h3>
        <p>The action requires manual approval. The workflow will fail with a warning message containing an approval ID. Check your Vienna OS console or Slack for approval options.</p>

        <h3>🚨 Blocked</h3>
        <p>The action is blocked by governance policies. The workflow fails with an error message.</p>

        <h2>Advanced Examples</h2>

        <h3>Environment-Specific Governance</h3>

        <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
          <code>{`name: Multi-Environment Deploy

on:
  workflow_dispatch:
    inputs:
      environment:
        description: 'Target environment'
        required: true
        type: choice
        options:
          - staging
          - production

jobs:
  governance-check:
    runs-on: ubuntu-latest
    outputs:
      governance-mode: \${{ steps.vienna.outputs.governance-mode }}
    steps:
      - name: Vienna OS Governance Check
        id: vienna
        uses: vienna-os/governance-action@v1
        with:
          api-key: \${{ secrets.VIENNA_API_KEY }}
          action: 'deploy'
          environment: \${{ github.event.inputs.environment }}
          agent-id: \${{ github.actor }}

  deploy:
    needs: governance-check
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: |
          echo "Governance mode: \${{ needs.governance-check.outputs.governance-mode }}"
          echo "Deploying to \${{ github.event.inputs.environment }}..."
          # Deployment logic here`}
          </code>
        </pre>

        <h3>Database Migration Governance</h3>

        <pre className="bg-gray-900 p-4 rounded-lg overflow-x-auto">
          <code>{`name: Database Migration

on:
  workflow_dispatch:
    inputs:
      migration_name:
        description: 'Migration name'
        required: true

jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Vienna OS Migration Governance
        uses: vienna-os/governance-action@v1
        with:
          api-key: \${{ secrets.VIENNA_API_KEY }}
          action: 'database_migration'
          environment: 'production'
          agent-id: 'db-migrator'

      - name: Run Migration
        run: |
          echo "Running migration: \${{ github.event.inputs.migration_name }}"
          # Migration commands here`}
          </code>
        </pre>

        <h2>Monitoring and Audit</h2>

        <p>All GitHub Actions governed by Vienna OS are logged in your governance console:</p>

        <ul>
          <li><strong>Execution History</strong> — View all governance checks from GitHub Actions</li>
          <li><strong>Audit Trail</strong> — Complete record of approvals, denials, and policy decisions</li>
          <li><strong>Metrics Dashboard</strong> — Track governance effectiveness across your CI/CD pipeline</li>
          <li><strong>Slack Notifications</strong> — Get real-time alerts for approvals and policy violations</li>
        </ul>

        <h2>Troubleshooting</h2>

        <h3>Action Fails with "Invalid API Key"</h3>
        <ul>
          <li>Verify the API key is correctly stored in GitHub Secrets</li>
          <li>Ensure the API key has <code>execution:submit</code> permissions</li>
          <li>Check that the secret name matches exactly: <code>VIENNA_API_KEY</code></li>
        </ul>

        <h3>Action Fails with "Blocked by Governance"</h3>
        <ul>
          <li>Review your governance policies in the Vienna OS console</li>
          <li>Check if the action type, environment, or agent is restricted</li>
          <li>Contact your governance administrator for policy adjustments</li>
        </ul>

        <h3>Approval Required but No Notification</h3>
        <ul>
          <li>Verify Slack integration is configured in Vienna OS</li>
          <li>Check that approval notifications are enabled for your tenant</li>
          <li>Look for the approval in the Vienna OS console under <strong>Approvals → Pending</strong></li>
        </ul>

        <h2>Next Steps</h2>

        <ul>
          <li><a href="/docs/getting-started">Getting Started Guide</a> — Set up Vienna OS</li>
          <li><a href="/docs/integration-guide">Integration Guide</a> — Configure Slack notifications</li>
          <li><a href="/docs/api-reference">API Reference</a> — Advanced integration options</li>
        </ul>

        <div className="border-t border-gray-700 mt-12 pt-8">
          <p className="text-sm text-gray-400">
            Need help? Contact support at <a href="mailto:support@regulator.ai" className="text-purple-400">support@regulator.ai</a> or 
            join our <a href="/community" className="text-purple-400">developer community</a>.
          </p>
        </div>
      </div>
    </div>
  );
}