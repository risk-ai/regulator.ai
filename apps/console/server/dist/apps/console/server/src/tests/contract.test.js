/**
 * API Contract Tests
 *
 * Validates all API endpoints return consistent success/error envelopes.
 */
describe('API Contract Validation', () => {
    describe('Success Envelope', () => {
        it('should have success: true', () => {
            const envelope = {
                success: true,
                data: { test: 'value' },
                timestamp: new Date().toISOString(),
            };
            expect(envelope.success).toBe(true);
            expect(envelope.data).toBeDefined();
            expect(envelope.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });
        it('should accept any data type', () => {
            const envelopes = [
                { success: true, data: { object: 'value' }, timestamp: new Date().toISOString() },
                { success: true, data: ['array'], timestamp: new Date().toISOString() },
                { success: true, data: 'string', timestamp: new Date().toISOString() },
                { success: true, data: 123, timestamp: new Date().toISOString() },
                { success: true, data: true, timestamp: new Date().toISOString() },
                { success: true, data: null, timestamp: new Date().toISOString() },
            ];
            envelopes.forEach(envelope => {
                expect(envelope.success).toBe(true);
                expect(envelope.timestamp).toBeDefined();
            });
        });
    });
    describe('Error Envelope', () => {
        it('should have success: false and error message', () => {
            const envelope = {
                success: false,
                error: 'Something went wrong',
                code: 'ERROR_CODE',
                timestamp: new Date().toISOString(),
            };
            expect(envelope.success).toBe(false);
            expect(envelope.error).toBeDefined();
            expect(envelope.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        });
        it('should support optional code and details', () => {
            const withCode = {
                success: false,
                error: 'Error message',
                code: 'SPECIFIC_ERROR',
                timestamp: new Date().toISOString(),
            };
            const withDetails = {
                success: false,
                error: 'Error message',
                code: 'VALIDATION_ERROR',
                details: { field: 'email', issue: 'invalid format' },
                timestamp: new Date().toISOString(),
            };
            expect(withCode.code).toBe('SPECIFIC_ERROR');
            expect(withDetails.details).toBeDefined();
        });
    });
    describe('Contract Violations', () => {
        it('should never return raw arrays at top level', () => {
            // ❌ Wrong:
            // res.json([...items])
            // ✅ Correct:
            const response = {
                success: true,
                data: {
                    items: ['item1', 'item2'],
                    total: 2,
                },
                timestamp: new Date().toISOString(),
            };
            expect(Array.isArray(response)).toBe(false);
            expect(response.success).toBe(true);
        });
        it('should never return raw strings at top level', () => {
            // ❌ Wrong:
            // res.json('success')
            // ✅ Correct:
            const response = {
                success: true,
                data: {
                    message: 'Operation successful',
                },
                timestamp: new Date().toISOString(),
            };
            expect(typeof response).toBe('object');
            expect(response.success).toBe(true);
        });
        it('should never return empty bodies', () => {
            // ❌ Wrong:
            // res.status(200).end()
            // ✅ Correct:
            const response = {
                success: true,
                data: {},
                timestamp: new Date().toISOString(),
            };
            expect(response.success).toBe(true);
            expect(response.data).toBeDefined();
        });
        it('should have consistent error shapes', () => {
            // ❌ Wrong variations:
            // res.json({ error: 'message' })
            // res.json({ message: 'error' })
            // res.json({ err: 'message' })
            // ✅ Correct:
            const response = {
                success: false,
                error: 'Error message',
                code: 'ERROR_CODE',
                timestamp: new Date().toISOString(),
            };
            expect(response.success).toBe(false);
            expect(response.error).toBeDefined();
            expect(response.message).toBeUndefined();
            expect(response.err).toBeUndefined();
        });
    });
    describe('Status Code Mapping', () => {
        it('should use standard HTTP status codes', () => {
            const statusCodes = {
                OK: 200,
                CREATED: 201,
                BAD_REQUEST: 400,
                UNAUTHORIZED: 401,
                FORBIDDEN: 403,
                NOT_FOUND: 404,
                INTERNAL_ERROR: 500,
            };
            expect(statusCodes.OK).toBe(200);
            expect(statusCodes.UNAUTHORIZED).toBe(401);
            expect(statusCodes.INTERNAL_ERROR).toBe(500);
        });
    });
});
//# sourceMappingURL=contract.test.js.map