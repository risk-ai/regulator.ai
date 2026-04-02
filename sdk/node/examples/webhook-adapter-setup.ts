/**
 * Example: Create and Configure an HTTP Adapter
 *
 * This example demonstrates how to create adapters for external services,
 * configure authentication, and use them in Vienna OS intents.
 */

import { ViennaClient } from '../src';

// Initialize the client
const vienna = new ViennaClient({
  baseUrl: process.env.VIENNA_BASE_URL || 'https://console.regulator.ai',
  agentId: process.env.VIENNA_AGENT_ID || 'webhook-setup-agent',
  apiKey: process.env.VIENNA_API_KEY, // vos_...
});

async function createSlackAdapter() {
  console.log('🔌 Creating Slack webhook adapter...\n');

  try {
    const adapter = await vienna.createAdapterConfig({
      name: 'slack-notifications',
      description: 'Send notifications to Slack channels',
      type: 'webhook',
      base_url: 'https://hooks.slack.com/services',
      auth_mode: 'bearer',
      credentials: {
        token: process.env.SLACK_BOT_TOKEN || 'xoxb-your-slack-bot-token'
      },
      headers: {
        'Content-Type': 'application/json'
      },
      timeout_ms: 15000,
      retry_config: {
        max_retries: 2,
        backoff_ms: 500
      }
    });

    console.log('✅ Slack adapter created:', {
      id: adapter.id,
      name: adapter.name,
      status: adapter.status
    });

    return adapter.id;
  } catch (error) {
    console.error('❌ Failed to create Slack adapter:', error);
    throw error;
  }
}

async function createGitHubAdapter() {
  console.log('🔌 Creating GitHub API adapter...\n');

  try {
    const adapter = await vienna.createAdapterConfig({
      name: 'github-api',
      description: 'GitHub API integration for repository management',
      type: 'http',
      base_url: 'https://api.github.com',
      auth_mode: 'bearer',
      credentials: {
        token: process.env.GITHUB_TOKEN || 'ghp_your_github_token'
      },
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ViennaOS-Agent/1.0'
      },
      timeout_ms: 30000,
      retry_config: {
        max_retries: 3,
        backoff_ms: 1000
      }
    });

    console.log('✅ GitHub adapter created:', {
      id: adapter.id,
      name: adapter.name,
      status: adapter.status
    });

    return adapter.id;
  } catch (error) {
    console.error('❌ Failed to create GitHub adapter:', error);
    throw error;
  }
}

async function testAdapter(adapterId: string, testPayload: any) {
  console.log(`🧪 Testing adapter ${adapterId}...\n`);

  try {
    const testResult = await vienna.testAdapterConfig(adapterId, testPayload);
    
    if (testResult.success) {
      console.log('✅ Adapter test successful');
      console.log('Response time:', testResult.response_time_ms + 'ms');
    } else {
      console.log('❌ Adapter test failed:', testResult.error);
    }

    return testResult.success;
  } catch (error) {
    console.error('❌ Failed to test adapter:', error);
    return false;
  }
}

async function useAdapterInIntent(adapterId: string, action: any) {
  console.log('📝 Submitting intent with adapter...\n');

  try {
    const result = await vienna.submitIntent({
      action: 'http_request',
      adapter_id: adapterId,
      payload: action
    });

    console.log('Intent result:', {
      pipeline: result.pipeline,
      warrant_id: result.warrant?.id,
      risk_tier: result.risk_tier
    });

    return result;
  } catch (error) {
    console.error('❌ Failed to submit intent:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 Vienna OS Webhook Adapter Setup Example\n');
    console.log('This example shows how to create and configure adapters for external services.\n');

    // Step 1: Create adapters
    const slackAdapterId = await createSlackAdapter();
    const githubAdapterId = await createGitHubAdapter();

    console.log('\n📋 Adapters created successfully!\n');

    // Step 2: Test the adapters
    console.log('🧪 Testing adapters...\n');

    // Test Slack adapter with a simple message
    const slackTestPayload = {
      path: process.env.SLACK_WEBHOOK_PATH || '/T1234567890/B0987654321/test',
      method: 'POST',
      body: {
        text: 'Vienna OS adapter test message',
        channel: '#general'
      }
    };

    const slackTestSuccess = await testAdapter(slackAdapterId, slackTestPayload);

    // Test GitHub adapter with user info
    const githubTestPayload = {
      path: '/user',
      method: 'GET'
    };

    const githubTestSuccess = await testAdapter(githubAdapterId, githubTestPayload);

    if (!slackTestSuccess || !githubTestSuccess) {
      console.log('\n⚠️  Some adapter tests failed. Check your credentials.');
      console.log('Continuing with intent submission examples...\n');
    }

    // Step 3: Use adapters in real intents
    console.log('\n🎯 Using adapters in Vienna OS intents...\n');

    // Example 1: Send a deployment notification to Slack
    if (slackTestSuccess) {
      console.log('📢 Sending deployment notification...');
      await useAdapterInIntent(slackAdapterId, {
        path: process.env.SLACK_WEBHOOK_PATH || '/T1234567890/B0987654321/notifications',
        method: 'POST',
        body: {
          text: '🚀 New deployment initiated through Vienna OS governance',
          blocks: [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: '*Deployment Status*: Approved and Executing\n*Service*: user-service\n*Version*: v2.4.1'
              }
            }
          ]
        }
      });
    }

    // Example 2: Create a GitHub issue
    if (githubTestSuccess && process.env.GITHUB_REPO) {
      console.log('📝 Creating GitHub issue...');
      await useAdapterInIntent(githubAdapterId, {
        path: `/repos/${process.env.GITHUB_REPO}/issues`,
        method: 'POST',
        body: {
          title: 'Automated deployment report',
          body: 'This issue was automatically created by Vienna OS after a successful deployment.',
          labels: ['automation', 'deployment', 'vienna-os']
        }
      });
    }

    console.log('\n✅ Webhook adapter setup complete!');
    console.log('\n📚 Next steps:');
    console.log('  1. Configure your environment variables for real credentials');
    console.log('  2. Set up monitoring for adapter health');
    console.log('  3. Create policies to govern adapter usage');
    console.log('  4. Implement error handling and retry logic');

  } catch (error) {
    console.error('\n💥 Setup failed:', error);
    process.exit(1);
  }
}

// Run with proper error handling
main().catch(console.error);

/*
 * Environment Variables Required:
 * 
 * VIENNA_API_KEY=vos_your_api_key_here
 * VIENNA_AGENT_ID=your_agent_id
 * SLACK_BOT_TOKEN=xoxb_your_slack_bot_token
 * SLACK_WEBHOOK_PATH=/T123/B456/your_webhook_path
 * GITHUB_TOKEN=ghp_your_github_personal_access_token
 * GITHUB_REPO=owner/repository-name
 * 
 * Optional:
 * VIENNA_BASE_URL=https://console.regulator.ai (default)
 */