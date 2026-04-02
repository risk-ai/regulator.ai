/**
 * OpenClaw Bridge
 *
 * Sends structured instructions to OpenClaw Vienna agent.
 * No freeform prompts - only typed instruction envelopes.
 *
 * Design:
 * - OpenClaw is a governed endpoint
 * - Instructions are structured and bounded
 * - Risk tiers enforced
 * - Results returned via polling or webhook
 */
const { nanoid } = require('nanoid');
class OpenClawBridge {
    constructor() {
        this.endpointManager = null;
        this.stateGraph = null;
        this.instructionTypes = new Map();
        this._registerDefaultInstructionTypes();
    }
    /**
     * Set dependencies
     */
    setDependencies(endpointManager, stateGraph) {
        this.endpointManager = endpointManager;
        this.stateGraph = stateGraph;
    }
    /**
     * Register instruction type
     */
    registerInstructionType(instructionType) {
        const { instruction_type, instruction_name, risk_tier, schema } = instructionType;
        if (!instruction_type || !instruction_name || !risk_tier) {
            throw new Error('instruction_type, instruction_name, and risk_tier required');
        }
        if (!['T0', 'T1', 'T2'].includes(risk_tier)) {
            throw new Error('risk_tier must be T0, T1, or T2');
        }
        this.instructionTypes.set(instruction_type, instructionType);
    }
    /**
     * Register default instruction types
     */
    _registerDefaultInstructionTypes() {
        // T0 instructions
        this.registerInstructionType({
            instruction_type: 'query_status',
            instruction_name: 'Query OpenClaw Status',
            risk_tier: 'T0',
            schema: {}
        });
        this.registerInstructionType({
            instruction_type: 'inspect_gateway',
            instruction_name: 'Inspect OpenClaw Gateway',
            risk_tier: 'T0',
            schema: {}
        });
        this.registerInstructionType({
            instruction_type: 'check_health',
            instruction_name: 'Check OpenClaw Health',
            risk_tier: 'T0',
            schema: {}
        });
        this.registerInstructionType({
            instruction_type: 'collect_logs',
            instruction_name: 'Collect OpenClaw Logs',
            risk_tier: 'T0',
            schema: {
                service: 'string',
                lines: 'number'
            }
        });
        this.registerInstructionType({
            instruction_type: 'query_agent',
            instruction_name: 'Query OpenClaw Agent',
            risk_tier: 'T0',
            schema: {
                query: 'string'
            }
        });
        // T1 instructions
        this.registerInstructionType({
            instruction_type: 'run_workflow',
            instruction_name: 'Run OpenClaw Workflow',
            risk_tier: 'T1',
            schema: {
                workflow: 'string',
                arguments: 'object'
            }
        });
        this.registerInstructionType({
            instruction_type: 'restart_service',
            instruction_name: 'Restart OpenClaw Service',
            risk_tier: 'T1',
            schema: {
                service: 'string'
            }
        });
        this.registerInstructionType({
            instruction_type: 'recovery_action',
            instruction_name: 'OpenClaw Recovery Action',
            risk_tier: 'T1',
            schema: {
                action: 'string',
                target: 'string'
            }
        });
    }
    /**
     * Create instruction envelope
     *
     * @param {Object} params - Instruction parameters
     * @returns {Object} Instruction envelope
     */
    createInstruction(params) {
        const { instruction_type, arguments: args = {}, issued_by = 'vienna-operator-chat', warrant_id = null } = params;
        const instructionTypeDef = this.instructionTypes.get(instruction_type);
        if (!instructionTypeDef) {
            throw new Error(`Unknown instruction type: ${instruction_type}`);
        }
        const instruction_id = `instr_${nanoid(12)}`;
        const timestamp = new Date().toISOString();
        return {
            instruction_id,
            instruction_type,
            target_endpoint: 'openclaw',
            target_agent: 'openclaw-vienna-agent',
            action: instruction_type,
            arguments: args,
            risk_tier: instructionTypeDef.risk_tier,
            issued_by,
            warrant_id,
            request_id: instruction_id,
            timestamp
        };
    }
    /**
     * Dispatch instruction to OpenClaw
     *
     * @param {Object} instruction - Instruction envelope
     * @returns {Promise<Object>} Result
     */
    async dispatchInstruction(instruction) {
        if (!this.endpointManager) {
            throw new Error('EndpointManager not set');
        }
        // Dispatch via EndpointManager
        const result = await this.endpointManager.dispatchInstruction(instruction);
        return result;
    }
    /**
     * Send structured direction to OpenClaw
     *
     * @param {string} instruction_type - Instruction type
     * @param {Object} args - Arguments
     * @param {Object} options - Options
     * @returns {Promise<Object>} Result
     */
    async sendDirection(instruction_type, args = {}, options = {}) {
        const instruction = this.createInstruction({
            instruction_type,
            arguments: args,
            issued_by: options.issued_by || 'vienna-operator-chat',
            warrant_id: options.warrant_id || null
        });
        const result = await this.dispatchInstruction(instruction);
        return result;
    }
    /**
     * Query OpenClaw status
     */
    async queryStatus() {
        return await this.sendDirection('query_status');
    }
    /**
     * Inspect OpenClaw gateway
     */
    async inspectGateway() {
        return await this.sendDirection('inspect_gateway');
    }
    /**
     * Check OpenClaw health
     */
    async checkHealth() {
        return await this.sendDirection('check_health');
    }
    /**
     * Collect OpenClaw logs
     */
    async collectLogs(service, lines = 100) {
        return await this.sendDirection('collect_logs', { service, lines });
    }
    /**
     * Run OpenClaw workflow (T1)
     */
    async runWorkflow(workflow, args = {}, warrant_id = null) {
        return await this.sendDirection('run_workflow', { workflow, arguments: args }, { warrant_id });
    }
    /**
     * Restart OpenClaw service (T1)
     */
    async restartService(service, warrant_id = null) {
        return await this.sendDirection('restart_service', { service }, { warrant_id });
    }
    /**
     * List registered instruction types
     */
    listInstructionTypes() {
        return Array.from(this.instructionTypes.values()).map(type => ({
            instruction_type: type.instruction_type,
            instruction_name: type.instruction_name,
            risk_tier: type.risk_tier
        }));
    }
}
module.exports = { OpenClawBridge };
//# sourceMappingURL=openclaw-bridge.js.map