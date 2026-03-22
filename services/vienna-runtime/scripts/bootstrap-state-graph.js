#!/usr/bin/env node
/**
 * Bootstrap State Graph
 * 
 * Seeds State Graph with initial Vienna OS state:
 * - Known services (OpenClaw gateway, Vienna backend/frontend, Ollama)
 * - Providers (Anthropic, Ollama)
 * - Initial runtime context
 * 
 * Environment: Respects VIENNA_ENV (default: prod)
 * Usage: VIENNA_ENV=test node bootstrap-state-graph.js
 */

const { getStateGraph } = require('../lib/state/state-graph');

async function bootstrap() {
  const env = process.env.VIENNA_ENV || 'prod';
  console.log(`Bootstrapping State Graph (environment: ${env})...`);

  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  const now = new Date().toISOString();

  // ============================================================
  // SERVICES
  // ============================================================

  console.log('\nSeeding services...');

  const services = [
    {
      service_id: 'openclaw-gateway',
      service_name: 'OpenClaw Gateway',
      service_type: 'daemon',
      status: 'unknown',
      last_check_at: now,
      metadata: { port: 18789, description: 'OpenClaw systemd service' }
    },
    {
      service_id: 'vienna-backend',
      service_name: 'Vienna Backend',
      service_type: 'api',
      status: 'unknown',
      last_check_at: now,
      metadata: { port: 3100, description: 'Vienna OS backend API' }
    },
    {
      service_id: 'vienna-frontend',
      service_name: 'Vienna Frontend',
      service_type: 'api',
      status: 'unknown',
      last_check_at: now,
      metadata: { port: 5174, description: 'Vienna OS dashboard UI' }
    },
    {
      service_id: 'ollama',
      service_name: 'Ollama Local LLM',
      service_type: 'api',
      status: 'unknown',
      last_check_at: now,
      metadata: { port: 11434, description: 'Local LLM fallback provider' }
    },
    {
      service_id: 'tailscale',
      service_name: 'Tailscale VPN',
      service_type: 'daemon',
      status: 'unknown',
      last_check_at: now,
      metadata: { 
        description: 'Tailscale authentication and networking',
        required_for: ['openclaw-gateway', 'vienna-frontend']
      }
    }
  ];

  for (const service of services) {
    // Check if exists
    const existing = stateGraph.getService(service.service_id);
    if (existing) {
      console.log(`  ✓ ${service.service_id} (already exists)`);
    } else {
      stateGraph.createService(service);
      console.log(`  + ${service.service_id}`);
    }
  }

  // ============================================================
  // PROVIDERS
  // ============================================================

  console.log('\nSeeding providers...');

  const providers = [
    {
      provider_id: 'anthropic-main',
      provider_name: 'Anthropic (Production)',
      provider_type: 'llm',
      status: 'active',
      last_health_check: now,
      credentials_status: 'valid',
      metadata: {
        models: ['claude-sonnet-4-5', 'claude-opus-4', 'claude-haiku-4-5'],
        tier: 'production',
        description: 'Primary cloud LLM provider'
      }
    },
    {
      provider_id: 'ollama-local',
      provider_name: 'Ollama (Local Fallback)',
      provider_type: 'llm',
      status: 'active',
      last_health_check: now,
      credentials_status: 'valid',
      metadata: {
        models: ['qwen2.5:0.5b'],
        tier: 'fallback',
        description: 'Local LLM fallback when cloud providers fail'
      }
    }
  ];

  for (const provider of providers) {
    const existing = stateGraph.getProvider(provider.provider_id);
    if (existing) {
      console.log(`  ✓ ${provider.provider_id} (already exists)`);
    } else {
      stateGraph.createProvider(provider);
      console.log(`  + ${provider.provider_id}`);
    }
  }

  // ============================================================
  // RUNTIME CONTEXT
  // ============================================================

  console.log('\nSeeding runtime context...');

  const runtimeContext = [
    {
      context_key: 'vienna_version',
      context_value: '0.1.0',
      context_type: 'config',
      metadata: { description: 'Vienna OS version' }
    },
    {
      context_key: 'phase_current',
      context_value: '7.1',
      context_type: 'status',
      metadata: { description: 'Current development phase' }
    },
    {
      context_key: 'runtime_environment',
      context_value: 'production',
      context_type: 'config',
      metadata: { description: 'Current runtime environment (prod/test)' }
    }
  ];

  for (const ctx of runtimeContext) {
    const existing = stateGraph.getRuntimeContext(ctx.context_key);
    if (existing) {
      console.log(`  ✓ ${ctx.context_key} (already exists)`);
    } else {
      stateGraph.setRuntimeContext(ctx.context_key, ctx.context_value, ctx);
      console.log(`  + ${ctx.context_key} = ${ctx.context_value}`);
    }
  }

  // ============================================================
  // FAILURE POLICIES (Phase 10.2)
  // ============================================================

  console.log('\nSeeding failure policies...');

  const { createDefaultPolicy } = require('../lib/core/failure-policy-schema');
  const defaultPolicy = createDefaultPolicy();

  const existingPolicy = stateGraph.getFailurePolicy(defaultPolicy.policy_id);
  if (existingPolicy) {
    console.log(`  ✓ ${defaultPolicy.policy_id} (already exists)`);
  } else {
    stateGraph.createFailurePolicy(defaultPolicy);
    console.log(`  + ${defaultPolicy.policy_id}`);
    console.log(`    - Max consecutive failures: ${defaultPolicy.max_consecutive_failures}`);
    console.log(`    - Cooldown: ${defaultPolicy.cooldown.mode} (${defaultPolicy.cooldown.base_seconds}s base)`);
    console.log(`    - Degraded after: ${defaultPolicy.degraded.enter_after_consecutive_failures} failures`);
  }

  // ============================================================
  // OBJECTIVES
  // ============================================================

  console.log('\nSeeding objectives...');

  const objectives = [
    {
      objective_id: 'vienna-os-stability',
      objective_name: 'Maintain Vienna OS Stability',
      objective_type: 'project',
      status: 'active',
      priority: 'critical',
      assigned_to: 'vienna',
      progress_pct: 85,
      started_at: '2026-01-01T00:00:00Z',
      metadata: {
        description: 'Ensure Vienna OS runtime remains stable and responsive',
        components: ['gateway', 'backend', 'frontend', 'providers', 'governance']
      }
    },
    {
      objective_id: 'phase-7-governance',
      objective_name: 'Phase 7: Governance Enforcement',
      objective_type: 'milestone',
      status: 'active',
      priority: 'high',
      assigned_to: 'vienna',
      progress_pct: 70,
      started_at: '2026-03-10T00:00:00Z',
      metadata: {
        description: 'Complete governance boundary enforcement',
        phases: ['7.1 State Graph', '7.2 Executor', '7.3 Queue', '7.4 Safety']
      }
    }
  ];

  for (const objective of objectives) {
    const existing = stateGraph.getObjective(objective.objective_id);
    if (existing) {
      console.log(`  ✓ ${objective.objective_id} (already exists)`);
    } else {
      stateGraph.createObjective(objective);
      console.log(`  + ${objective.objective_id}`);
    }
  }

  stateGraph.close();

  console.log('\n✅ State Graph bootstrap complete.');
  console.log(`Environment: ${env}`);
  console.log(`Database: ${stateGraph.dbPath}`);
}

bootstrap().catch(err => {
  console.error('❌ Bootstrap failed:', err.message);
  process.exit(1);
});
