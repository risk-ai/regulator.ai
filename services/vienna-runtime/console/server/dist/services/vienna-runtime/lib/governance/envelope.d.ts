export = EnvelopeSystem;
declare class EnvelopeSystem {
    /**
     * Create new envelope
     *
     * @param {object} options - Envelope options
     * @returns {object} Envelope
     */
    static create(options: object): object;
    /**
     * Validate envelope structure
     *
     * @param {object} envelope - Envelope to validate
     * @throws {Error} If envelope invalid
     */
    static validate(envelope: object): boolean;
    /**
     * Validate single action
     */
    static _validateAction(action: any): void;
    /**
     * Generate envelope ID
     */
    static _generateEnvelopeId(): string;
}
//# sourceMappingURL=envelope.d.ts.map