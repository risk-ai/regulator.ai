#!/usr/bin/env node
/**
 * Vienna OS Load Testing Script
 * 
 * Simulates intent submission at configurable RPS with mixed tier distribution.
 * 
 * Usage:
 *   node scripts/load-test.js --url https://api.regulator.ai --key vos_xxx --rps 100 --duration 60
 * 
 * Features:
 * - Configurable RPS (requests per second)
 * - Mixed intent tiers: T0 (60%), T1 (25%), T2 (10%), T3 (5%)
 * - Ramp-up period (10% → 100% over 10s)
 * - Latency percentiles (p50/p95/p99)
 * - JSON + human-readable output
 * - Zero external dependencies (Node.js built-in fetch)
 */

const { performance } = require('perf_hooks');

// Default configuration
const DEFAULT_CONFIG = {
  url: 'https://api.regulator.ai',
  key: null,
  rps: 100,
  duration: 60,
  rampUpDuration: 10,
  output: 'human', // 'json' or 'human'
};

// Intent templates by tier
const INTENT_TEMPLATES = {
  T0: [
    {
      action: 'check_system_health',
      description: 'Automated system health check',
      parameters: { services: ['api', 'database', 'queue'] },
    },
    {
      action: 'get_service_status',
      description: 'Retrieve service operational status',
      parameters: { service: 'api-gateway' },
    },
    {
      action: 'list_active_agents',
      description: 'List currently active agents',
      parameters: {},
    },
  ],
  T1: [
    {
      action: 'restart_service',
      description: 'Restart non-critical service',
      parameters: { service: 'worker-queue', graceful: true },
    },
    {
      action: 'deploy_code',
      description: 'Deploy code to staging',
      parameters: { service: 'api-gateway', version: '2.4.1', env: 'staging' },
    },
    {
      action: 'backup_database',
      description: 'Create database backup',
      parameters: { bucket: 'backups-staging', retention_days: 30 },
    },
  ],
  T2: [
    {
      action: 'deploy_production',
      description: 'Deploy code to production',
      parameters: { service: 'api-gateway', version: '2.4.1', env: 'production' },
    },
    {
      action: 'modify_firewall_rules',
      description: 'Update firewall configuration',
      parameters: { action: 'add', port: 8080, protocol: 'tcp' },
    },
    {
      action: 'scale_service',
      description: 'Scale service instances',
      parameters: { service: 'api-gateway', instances: 5 },
    },
  ],
  T3: [
    {
      action: 'delete_production_data',
      description: 'Delete production dataset',
      parameters: { dataset: 'user-temp-data', confirmation: 'confirmed' },
    },
    {
      action: 'emergency_shutdown',
      description: 'Emergency system shutdown',
      parameters: { reason: 'security_incident', immediate: true },
    },
  ],
};

// Tier distribution weights
const TIER_DISTRIBUTION = {
  T0: 0.6,  // 60%
  T1: 0.25, // 25%
  T2: 0.10, // 10%
  T3: 0.05, // 5%
};

class LoadTester {
  constructor(config) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.results = {
      requestsSent: 0,
      requestsSuccess: 0,
      requestsError: 0,
      latencies: [],
      errors: [],
      startTime: null,
      endTime: null,
    };
    this.isRunning = false;
  }

  /**
   * Generate a random intent based on tier distribution
   */
  generateIntent() {
    // Select tier based on distribution
    const random = Math.random();
    let tier;
    let cumulativeWeight = 0;
    
    for (const [t, weight] of Object.entries(TIER_DISTRIBUTION)) {
      cumulativeWeight += weight;
      if (random <= cumulativeWeight) {
        tier = t;
        break;
      }
    }
    
    // Select random template from tier
    const templates = INTENT_TEMPLATES[tier];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    // Add metadata
    return {
      ...template,
      source: 'load-test',
      simulation: true, // Use simulation mode to avoid side effects
      metadata: {
        load_test_id: `lt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        tier: tier,
        timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Send a single intent request
   */
  async sendIntent() {
    const intent = this.generateIntent();
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${this.config.url}/api/v1/intent`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.key}`,
          'User-Agent': 'vienna-load-test/1.0.0',
        },
        body: JSON.stringify(intent),
      });
      
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      this.results.requestsSent++;
      this.results.latencies.push(latency);
      
      if (response.ok) {
        this.results.requestsSuccess++;
      } else {
        this.results.requestsError++;
        const errorBody = await response.text().catch(() => 'Unknown error');
        this.results.errors.push({
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
          latency,
        });
      }
      
    } catch (error) {
      const endTime = performance.now();
      const latency = endTime - startTime;
      
      this.results.requestsSent++;
      this.results.requestsError++;
      this.results.latencies.push(latency);
      this.results.errors.push({
        error: error.message,
        latency,
      });
    }
  }

  /**
   * Calculate latency percentiles
   */
  calculatePercentiles() {
    if (this.results.latencies.length === 0) return { p50: 0, p95: 0, p99: 0 };
    
    const sorted = [...this.results.latencies].sort((a, b) => a - b);
    const len = sorted.length;
    
    return {
      p50: sorted[Math.floor(len * 0.5)] || 0,
      p95: sorted[Math.floor(len * 0.95)] || 0,
      p99: sorted[Math.floor(len * 0.99)] || 0,
    };
  }

  /**
   * Calculate current RPS based on ramp-up schedule
   */
  getCurrentRPS(elapsedSeconds) {
    if (elapsedSeconds >= this.config.rampUpDuration) {
      return this.config.rps;
    }
    
    // Linear ramp from 10% to 100%
    const rampProgress = elapsedSeconds / this.config.rampUpDuration;
    const minRPS = this.config.rps * 0.1;
    return Math.floor(minRPS + (this.config.rps - minRPS) * rampProgress);
  }

  /**
   * Run the load test
   */
  async run() {
    console.log(`🚀 Starting Vienna OS load test...`);
    console.log(`   Target: ${this.config.url}`);
    console.log(`   RPS: ${this.config.rps} (ramp-up: ${this.config.rampUpDuration}s)`);
    console.log(`   Duration: ${this.config.duration}s`);
    console.log(`   Tier distribution: T0(60%), T1(25%), T2(10%), T3(5%)`);
    console.log('');

    this.isRunning = true;
    this.results.startTime = Date.now();
    
    // Track timing
    const testStartTime = performance.now();
    let requestsScheduled = 0;
    
    while (this.isRunning) {
      const elapsedSeconds = (performance.now() - testStartTime) / 1000;
      
      // Check if test duration exceeded
      if (elapsedSeconds >= this.config.duration) {
        this.isRunning = false;
        break;
      }
      
      const currentRPS = this.getCurrentRPS(elapsedSeconds);
      const targetRequests = Math.floor(elapsedSeconds * currentRPS);
      
      // Send requests to catch up to target
      while (requestsScheduled < targetRequests && this.isRunning) {
        // Fire and forget - don't await individual requests
        this.sendIntent().catch(() => {}); // Errors are tracked internally
        requestsScheduled++;
        
        // Small delay to prevent overwhelming the event loop
        await new Promise(resolve => setTimeout(resolve, 1));
      }
      
      // Sleep briefly before next iteration
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Wait a bit for pending requests to complete
    console.log('⏳ Waiting for pending requests to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    this.results.endTime = Date.now();
    
    return this.generateReport();
  }

  /**
   * Generate test results report
   */
  generateReport() {
    const duration = (this.results.endTime - this.results.startTime) / 1000;
    const actualRPS = this.results.requestsSent / duration;
    const successRate = this.results.requestsSuccess / this.results.requestsSent;
    const errorRate = this.results.requestsError / this.results.requestsSent;
    const percentiles = this.calculatePercentiles();
    
    const report = {
      summary: {
        duration_seconds: Math.round(duration * 100) / 100,
        requests_sent: this.results.requestsSent,
        requests_success: this.results.requestsSuccess,
        requests_error: this.results.requestsError,
        success_rate: Math.round(successRate * 10000) / 100, // percentage with 2 decimals
        error_rate: Math.round(errorRate * 10000) / 100,
        actual_rps: Math.round(actualRPS * 100) / 100,
        target_rps: this.config.rps,
      },
      latency: {
        p50_ms: Math.round(percentiles.p50 * 100) / 100,
        p95_ms: Math.round(percentiles.p95 * 100) / 100,
        p99_ms: Math.round(percentiles.p99 * 100) / 100,
        average_ms: this.results.latencies.length > 0 ? 
          Math.round((this.results.latencies.reduce((a, b) => a + b, 0) / this.results.latencies.length) * 100) / 100 : 0,
      },
      errors: this.results.errors.slice(0, 10), // First 10 errors
      config: {
        url: this.config.url,
        rps: this.config.rps,
        duration: this.config.duration,
        ramp_up_duration: this.config.rampUpDuration,
      },
      timestamp: new Date().toISOString(),
    };
    
    if (this.config.output === 'json') {
      console.log(JSON.stringify(report, null, 2));
    } else {
      this.printHumanReport(report);
    }
    
    return report;
  }

  /**
   * Print human-readable report
   */
  printHumanReport(report) {
    console.log('\n📊 Load Test Results');
    console.log('═══════════════════');
    
    console.log('\n🎯 Summary:');
    console.log(`   Duration:       ${report.summary.duration_seconds}s`);
    console.log(`   Requests:       ${report.summary.requests_sent} (${report.summary.actual_rps} RPS actual vs ${report.summary.target_rps} target)`);
    console.log(`   Success:        ${report.summary.requests_success} (${report.summary.success_rate}%)`);
    console.log(`   Errors:         ${report.summary.requests_error} (${report.summary.error_rate}%)`);
    
    console.log('\n⚡ Latency:');
    console.log(`   p50:            ${report.latency.p50_ms}ms`);
    console.log(`   p95:            ${report.latency.p95_ms}ms`);
    console.log(`   p99:            ${report.latency.p99_ms}ms`);
    console.log(`   Average:        ${report.latency.average_ms}ms`);
    
    // Performance assessment
    console.log('\n🎭 Assessment:');
    if (report.latency.p99_ms < 500) {
      console.log(`   ✅ p99 latency: ${report.latency.p99_ms}ms (target: <500ms)`);
    } else {
      console.log(`   ❌ p99 latency: ${report.latency.p99_ms}ms exceeds 500ms target`);
    }
    
    if (report.summary.success_rate >= 99.5) {
      console.log(`   ✅ Success rate: ${report.summary.success_rate}% (excellent)`);
    } else if (report.summary.success_rate >= 99.0) {
      console.log(`   ⚠️  Success rate: ${report.summary.success_rate}% (acceptable)`);
    } else {
      console.log(`   ❌ Success rate: ${report.summary.success_rate}% (needs attention)`);
    }
    
    if (report.errors.length > 0) {
      console.log('\n❗ Sample Errors:');
      report.errors.slice(0, 5).forEach((error, i) => {
        if (error.status) {
          console.log(`   ${i+1}. HTTP ${error.status} ${error.statusText} (${error.latency.toFixed(1)}ms)`);
        } else {
          console.log(`   ${i+1}. ${error.error} (${error.latency.toFixed(1)}ms)`);
        }
      });
    }
    
    console.log('');
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const config = {};
  
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i];
    const value = args[i + 1];
    
    switch (key) {
      case '--url':
        config.url = value;
        break;
      case '--key':
        config.key = value;
        break;
      case '--rps':
        config.rps = parseInt(value, 10);
        break;
      case '--duration':
        config.duration = parseInt(value, 10);
        break;
      case '--ramp-up':
        config.rampUpDuration = parseInt(value, 10);
        break;
      case '--output':
        config.output = value;
        break;
      case '--help':
        printUsage();
        process.exit(0);
        break;
      default:
        if (key.startsWith('--')) {
          console.error(`Unknown option: ${key}`);
          process.exit(1);
        }
    }
  }
  
  return config;
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
Vienna OS Load Testing Script

Usage:
  node scripts/load-test.js [OPTIONS]

Options:
  --url URL         API base URL (default: https://api.regulator.ai)
  --key KEY         Vienna OS API key (required)
  --rps NUMBER      Target requests per second (default: 100)
  --duration SECS   Test duration in seconds (default: 60)
  --ramp-up SECS    Ramp-up duration in seconds (default: 10)
  --output FORMAT   Output format: 'human' or 'json' (default: human)
  --help            Show this help

Examples:
  node scripts/load-test.js --key vos_abc123 --rps 50 --duration 30
  node scripts/load-test.js --url http://localhost:3100 --key dev_key --output json

Environment Variables:
  VIENNA_API_KEY    API key (alternative to --key)
  VIENNA_API_URL    API base URL (alternative to --url)
`);
}

/**
 * Main execution
 */
async function main() {
  const config = parseArgs();
  
  // Use environment variables as fallbacks
  if (!config.key) config.key = process.env.VIENNA_API_KEY;
  if (!config.url) config.url = process.env.VIENNA_API_URL || DEFAULT_CONFIG.url;
  
  if (!config.key) {
    console.error('❌ Error: API key is required');
    console.error('   Use --key option or set VIENNA_API_KEY environment variable');
    process.exit(1);
  }
  
  const tester = new LoadTester(config);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n⏹️  Stopping load test...');
    tester.isRunning = false;
  });
  
  try {
    await tester.run();
    process.exit(0);
  } catch (error) {
    console.error('❌ Load test failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { LoadTester };