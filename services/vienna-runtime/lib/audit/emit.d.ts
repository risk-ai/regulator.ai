export = Audit;
/**
 * Audit Event Emitter
 *
 * Emits structured audit events via adapter.
 * Phase 6.10: Also appends to audit log storage.
 */
declare class Audit {
    constructor(adapter: any, auditLog?: any);
    adapter: any;
    auditLog: any;
    /**
     * Set audit log storage (for late binding during Vienna Core init)
     *
     * @param {object} auditLog - AuditLog instance
     */
    setAuditLog(auditLog: object): void;
    /**
     * Emit audit event
     *
     * @param {object} event - Event object (or event type string)
     * @param {object} payload - Event payload (if event is string)
     */
    emit(event: object, payload?: object): Promise<void>;
    /**
     * Emit warrant issued event
     */
    warrantIssued(warrant: any): Promise<void>;
    /**
     * Emit warrant invalidated event
     */
    warrantInvalidated(warrant: any, reason: any): Promise<void>;
    /**
     * Emit warrant verified event
     */
    warrantVerified(warrantId: any, valid: any, reason?: any): Promise<void>;
}
//# sourceMappingURL=emit.d.ts.map