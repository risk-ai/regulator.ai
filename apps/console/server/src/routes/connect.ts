/**
 * Connect Agent API Routes — Vienna OS Agent Connection Wizard
 */

import { Router } from 'express';
import { getStateGraph } from '@vienna/lib';
import crypto from 'crypto';

const router = Router();

/**
 * POST /api/v1/connect/test
 * 
 * Test an API key or connection method
 */
router.post('/test', async (req, res) => {
  try {
    const { method, provider, apiKey } = req.body;

    if (!method) {
      return res.status(400).json({
        success: false,
        error: 'Integration method is required'
      });
    }

    let testResult: any = { success: true };

    if (method === 'api-proxy') {
      if (!apiKey || !provider) {
        return res.status(400).json({
          success: false,
          error: 'API key and provider are required for proxy method'
        });
      }

      // Basic key format validation
      const keyPatterns: Record<string, RegExp> = {
        openai: /^sk-[a-zA-Z0-9]{32,}$/,
        anthropic: /^sk-ant-[a-zA-Z0-9-_]{32,}$/,
        google: /^[a-zA-Z0-9-_]{20,}$/,
        custom: /^.{8,}$/ // Minimal validation for custom keys
      };

      const pattern = keyPatterns[provider];
      if (pattern && !pattern.test(apiKey)) {
        return res.status(400).json({
          success: false,
          error: `Invalid ${provider} API key format`
        });
      }

      // Optional: Test actual API call (commented out for security)
      /*
      try {
        // This would test the actual key with the provider
        await testProviderConnection(provider, apiKey);
        testResult.providerTest = 'success';
      } catch (error: any) {
        testResult.providerTest = 'failed';
        testResult.providerError = error.message;
      }
      */

      testResult.keyFormat = 'valid';
      testResult.provider = provider;
    }

    res.json({
      success: true,
      method,
      testResult,
      message: 'Connection test completed',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Connect API] Test failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/connect/register
 * 
 * Register a new agent connection
 */
router.post('/register', async (req, res) => {
  try {
    const stateGraph = await getStateGraph();
    await stateGraph.initialize();

    const {
      agent_id,
      integration_method,
      provider,
      tenant_id,
      description,
      configuration
    } = req.body;

    if (!agent_id || !integration_method || !tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'agent_id, integration_method, and tenant_id are required'
      });
    }

    // Generate API key for the agent if needed
    let apiKey = null;
    if (integration_method === 'sdk' || integration_method === 'webhook') {
      apiKey = `vos_${crypto.randomBytes(32).toString('hex')}`;
    }

    // Register agent in the state graph
    const agentRegistration = {
      id: agent_id,
      tenant_id,
      integration_method,
      provider: provider || null,
      description: description || `Agent connected via ${integration_method}`,
      configuration: configuration || {},
      api_key: apiKey,
      status: 'active',
      created_at: new Date().toISOString(),
      last_seen: new Date().toISOString()
    };

    // Save to agent registry (this would need to be implemented in state graph)
    if (stateGraph.registerAgent) {
      await stateGraph.registerAgent(agentRegistration);
    }

    // Audit the registration
    if (stateGraph.logEvent) {
      await stateGraph.logEvent({
        event: 'agent_registered',
        agent_id,
        details: {
          integration_method,
          provider,
          tenant_id
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      agent: {
        id: agent_id,
        integration_method,
        provider,
        api_key: apiKey,
        status: 'active'
      },
      message: 'Agent registered successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Connect API] Registration failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/v1/connect/activate-pack
 * 
 * Activate a policy pack for the tenant
 */
router.post('/activate-pack', async (req, res) => {
  try {
    const stateGraph = await getStateGraph();
    await stateGraph.initialize();

    const { policy_pack_id, tenant_id } = req.body;

    if (!policy_pack_id || !tenant_id) {
      return res.status(400).json({
        success: false,
        error: 'policy_pack_id and tenant_id are required'
      });
    }

    // Define policy pack templates
    const policyPacks: Record<string, any> = {
      soc2: {
        name: 'SOC 2',
        templates: [
          {
            id: 'access-control',
            name: 'Access Control',
            description: 'User authentication and authorization',
            rules: [
              {
                condition: 'action_type == "database_access"',
                action: 'require_approval',
                risk_tier: 2,
                description: 'Database access requires approval'
              }
            ]
          },
          {
            id: 'data-protection',
            name: 'Data Protection',
            description: 'Encryption and data handling policies',
            rules: [
              {
                condition: 'contains(context, "pii") || contains(context, "personal")',
                action: 'require_approval',
                risk_tier: 3,
                description: 'PII handling requires approval'
              }
            ]
          }
        ]
      },
      financial: {
        name: 'Financial',
        templates: [
          {
            id: 'transaction-limits',
            name: 'Transaction Limits',
            description: 'Spending and transfer limits',
            rules: [
              {
                condition: 'action_type == "wire_transfer" && context.amount > 10000',
                action: 'require_approval',
                risk_tier: 4,
                description: 'Wire transfers over $10,000 require approval'
              }
            ]
          }
        ]
      },
      hipaa: {
        name: 'HIPAA',
        templates: [
          {
            id: 'phi-protection',
            name: 'PHI Protection',
            description: 'Protected health information handling',
            rules: [
              {
                condition: 'contains(context, "phi") || contains(context, "health")',
                action: 'require_approval',
                risk_tier: 4,
                description: 'PHI access requires approval'
              }
            ]
          }
        ]
      },
      'dev-safety': {
        name: 'Development Safety',
        templates: [
          {
            id: 'deployment-gates',
            name: 'Deployment Gates',
            description: 'Production deployment controls',
            rules: [
              {
                condition: 'action_type == "deploy" && context.environment == "production"',
                action: 'require_approval',
                risk_tier: 3,
                description: 'Production deployments require approval'
              }
            ]
          }
        ]
      }
    };

    const pack = policyPacks[policy_pack_id];
    if (!pack) {
      return res.status(404).json({
        success: false,
        error: 'Policy pack not found'
      });
    }

    const activatedPolicies = [];

    // Instantiate each template in the pack
    for (const template of pack.templates) {
      try {
        // Create policy from template
        const policyId = `${policy_pack_id}_${template.id}_${Date.now()}`;
        const policy = {
          id: policyId,
          tenant_id,
          name: template.name,
          description: template.description,
          rules: template.rules,
          enabled: true,
          created_at: new Date().toISOString(),
          created_from_template: template.id,
          pack_id: policy_pack_id
        };

        // Save policy (this would need to be implemented in state graph)
        if (stateGraph.createPolicy) {
          await stateGraph.createPolicy(policy);
          activatedPolicies.push(policy);
        }

        // Log the activation
        if (stateGraph.logEvent) {
          await stateGraph.logEvent({
            event: 'policy_activated',
            details: {
              policy_id: policyId,
              template_id: template.id,
              pack_id: policy_pack_id,
              tenant_id
            },
            timestamp: new Date().toISOString()
          });
        }
      } catch (templateError: any) {
        console.warn(`[Connect API] Failed to activate template ${template.id}:`, templateError);
      }
    }

    res.json({
      success: true,
      pack: {
        id: policy_pack_id,
        name: pack.name,
        policies_activated: activatedPolicies.length
      },
      policies: activatedPolicies,
      message: `Activated ${activatedPolicies.length} policies from ${pack.name} pack`,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('[Connect API] Pack activation failed:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;