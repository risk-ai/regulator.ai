/**
 * Provider Health Service Tests
 * Phase 5D: Provider Health Truthfulness - Validation
 *
 * Tests health transition logic and truthfulness principles
 */
import { ProviderHealthService } from '../providerHealthService.js';
describe('ProviderHealthService', () => {
    let service;
    beforeEach(() => {
        service = new ProviderHealthService();
    });
    describe('Health Transitions', () => {
        /**
         * Test: Startup unknown state
         * Providers should start as 'unknown' with no execution history
         */
        test('providers start in unknown state', async () => {
            const health = await service.getProviderHealth('test-provider');
            expect(health).not.toBeNull();
            expect(health.status).toBe('unknown');
            expect(health.metrics.requestCount).toBe(0);
            expect(health.lastSuccessAt).toBeNull();
            expect(health.lastFailureAt).toBeNull();
        });
        /**
         * Test: Unknown → Healthy transition
         * After successful executions, provider should become healthy
         */
        test('transitions from unknown to healthy after successes', async () => {
            const provider = 'test-provider';
            // Record successful executions
            for (let i = 0; i < 5; i++) {
                service.recordExecution({
                    provider,
                    success: true,
                    durationMs: 1000,
                    timeout: false,
                });
            }
            const health = await service.getProviderHealth(provider);
            expect(health.status).toBe('healthy');
            expect(health.metrics.successRate).toBe(100);
            expect(health.metrics.requestCount).toBe(5);
            expect(health.lastSuccessAt).not.toBeNull();
        });
        /**
         * Test: Healthy → Degraded transition
         * When success rate drops below 80%, provider becomes degraded
         */
        test('transitions from healthy to degraded when success rate drops', async () => {
            const provider = 'test-provider';
            // Start with healthy state (5 successes)
            for (let i = 0; i < 5; i++) {
                service.recordExecution({
                    provider,
                    success: true,
                    durationMs: 1000,
                    timeout: false,
                });
            }
            let health = await service.getProviderHealth(provider);
            expect(health.status).toBe('healthy');
            // Add failures to drop success rate to ~71% (5 success, 2 failures)
            for (let i = 0; i < 2; i++) {
                service.recordExecution({
                    provider,
                    success: false,
                    durationMs: 500,
                    timeout: false,
                    errorMessage: 'Test failure',
                });
            }
            health = await service.getProviderHealth(provider);
            expect(health.status).toBe('degraded');
            expect(health.metrics.successRate).toBeGreaterThan(50);
            expect(health.metrics.successRate).toBeLessThan(80);
            expect(health.lastErrorMessage).toBe('Test failure');
        });
        /**
         * Test: Degraded → Unavailable transition
         * When success rate drops below 50%, provider becomes unavailable
         */
        test('transitions from degraded to unavailable on high failure rate', async () => {
            const provider = 'test-provider';
            // Start with degraded state (6 success, 2 failures = 75%)
            for (let i = 0; i < 6; i++) {
                service.recordExecution({
                    provider,
                    success: true,
                    durationMs: 1000,
                    timeout: false,
                });
            }
            for (let i = 0; i < 2; i++) {
                service.recordExecution({
                    provider,
                    success: false,
                    durationMs: 500,
                    timeout: false,
                });
            }
            let health = await service.getProviderHealth(provider);
            expect(health.status).toBe('degraded');
            // Add more failures to push below 50% (6 success, 7 failures = 46%)
            for (let i = 0; i < 5; i++) {
                service.recordExecution({
                    provider,
                    success: false,
                    durationMs: 500,
                    timeout: true,
                    errorMessage: 'Timeout',
                });
            }
            health = await service.getProviderHealth(provider);
            expect(health.status).toBe('unavailable');
            expect(health.metrics.successRate).toBeLessThan(50);
            expect(health.metrics.timeoutCount).toBeGreaterThan(0);
        });
        /**
         * Test: Unavailable → Healthy recovery
         * Provider can recover to healthy after consistent successes
         */
        test('recovers from unavailable to healthy with consistent successes', async () => {
            const provider = 'test-provider';
            // Start unavailable (2 success, 5 failures = 29%)
            for (let i = 0; i < 2; i++) {
                service.recordExecution({
                    provider,
                    success: true,
                    durationMs: 1000,
                    timeout: false,
                });
            }
            for (let i = 0; i < 5; i++) {
                service.recordExecution({
                    provider,
                    success: false,
                    durationMs: 500,
                    timeout: false,
                });
            }
            let health = await service.getProviderHealth(provider);
            expect(health.status).toBe('unavailable');
            // Add many successes to recover (20 more successes = 22/27 = 81%)
            for (let i = 0; i < 20; i++) {
                service.recordExecution({
                    provider,
                    success: true,
                    durationMs: 1000,
                    timeout: false,
                });
            }
            health = await service.getProviderHealth(provider);
            expect(health.status).toBe('healthy');
            expect(health.metrics.successRate).toBeGreaterThan(80);
        });
        /**
         * Test: Stale telemetry visibility
         * Provider shows unknown status when data is stale
         */
        test('shows unknown status for stale telemetry', async () => {
            const provider = 'test-provider';
            // Record old successful execution (simulate stale data by setting timestamp far in past)
            const staleTelemetry = service; // Access private for testing
            staleTelemetry.executionHistory.set(provider, [
                {
                    timestamp: Date.now() - 10 * 60 * 1000, // 10 minutes ago (beyond 5min threshold)
                    provider,
                    success: true,
                    durationMs: 1000,
                    timeout: false,
                },
            ]);
            const health = await service.getProviderHealth(provider);
            // Should show unknown due to stale telemetry
            expect(health.staleTelemetry).toBe(true);
            expect(health.status).toBe('unknown');
        });
    });
    describe('Execution Tracking', () => {
        test('tracks active executions', async () => {
            const provider = 'test-provider';
            service.recordExecutionStart(provider);
            service.recordExecutionStart(provider);
            service.recordExecutionStart(provider);
            const health = await service.getProviderHealth(provider);
            expect(health.activeExecutions).toBe(3);
            service.recordExecutionEnd(provider);
            service.recordExecutionEnd(provider);
            const updatedHealth = await service.getProviderHealth(provider);
            expect(updatedHealth.activeExecutions).toBe(1);
        });
        test('records execution metrics correctly', () => {
            const provider = 'test-provider';
            service.recordExecution({
                provider,
                success: true,
                durationMs: 1500,
                timeout: false,
            });
            service.recordExecution({
                provider,
                success: false,
                durationMs: 500,
                timeout: true,
                errorMessage: 'Connection timeout',
            });
            const health = service.getProviderHealth(provider);
            expect(health).resolves.toMatchObject({
                metrics: {
                    requestCount: 2,
                    failureCount: 1,
                    timeoutCount: 1,
                    successRate: 50,
                },
            });
        });
    });
    describe('Transition History', () => {
        test('tracks health transitions', async () => {
            const provider = 'test-provider';
            // Unknown → Healthy
            for (let i = 0; i < 5; i++) {
                service.recordExecution({
                    provider,
                    success: true,
                    durationMs: 1000,
                    timeout: false,
                });
            }
            let health = await service.getProviderHealth(provider);
            expect(health.transitions.length).toBeGreaterThan(0);
            expect(health.transitions[0].to).toBe('healthy');
            // Healthy → Degraded
            for (let i = 0; i < 2; i++) {
                service.recordExecution({
                    provider,
                    success: false,
                    durationMs: 500,
                    timeout: false,
                });
            }
            health = await service.getProviderHealth(provider);
            const degradedTransition = health.transitions.find(t => t.to === 'degraded');
            expect(degradedTransition).toBeDefined();
            expect(degradedTransition.from).toBe('healthy');
        });
        test('limits transition history to max size', async () => {
            const provider = 'test-provider';
            const service = new ProviderHealthService();
            // Force many transitions by alternating success/failure patterns
            for (let cycle = 0; cycle < 30; cycle++) {
                // Go healthy
                for (let i = 0; i < 10; i++) {
                    service.recordExecution({
                        provider,
                        success: true,
                        durationMs: 1000,
                        timeout: false,
                    });
                }
                // Go unavailable
                for (let i = 0; i < 10; i++) {
                    service.recordExecution({
                        provider,
                        success: false,
                        durationMs: 500,
                        timeout: false,
                    });
                }
            }
            const health = await service.getProviderHealth(provider);
            // Should only return last 10 transitions (as per component requirement)
            expect(health.transitions.length).toBeLessThanOrEqual(10);
        });
    });
    describe('Truthfulness Principles', () => {
        test('never shows healthy from missing data', async () => {
            const provider = 'never-used';
            const health = await service.getProviderHealth(provider);
            expect(health.status).not.toBe('healthy');
            expect(health.status).toBe('unknown');
        });
        test('shows degraded when reachable but unhealthy', async () => {
            const provider = 'test-provider';
            // Mix of success and failures (75% success rate)
            for (let i = 0; i < 3; i++) {
                service.recordExecution({
                    provider,
                    success: true,
                    durationMs: 1000,
                    timeout: false,
                });
            }
            service.recordExecution({
                provider,
                success: false,
                durationMs: 500,
                timeout: false,
            });
            const health = await service.getProviderHealth(provider);
            expect(health.status).toBe('degraded');
            expect(health.lastSuccessAt).not.toBeNull(); // Reachable
            expect(health.lastFailureAt).not.toBeNull(); // But unhealthy
        });
    });
});
//# sourceMappingURL=providerHealthService.test.js.map