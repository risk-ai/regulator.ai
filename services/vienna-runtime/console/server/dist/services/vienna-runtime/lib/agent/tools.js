/**
 * Agent Tools (Phase 7.2)
 *
 * Restricted tool set for agents.
 * Agents can READ and PROPOSE, but cannot MUTATE directly.
 */
const EnvelopeSystem = require('../governance/envelope');
/**
 * Agent Tool Set
 *
 * Tools available to agents after Phase 7.2.
 */
class AgentTools {
    constructor(viennaCore) {
        this.viennaCore = viennaCore;
    }
    /**
     * Get restricted tool set for agent
     *
     * Agents receive:
     * - Read-only operations (read_file, list_files, etc.)
     * - Envelope proposal tool (propose_envelope)
     *
     * Agents DO NOT receive:
     * - write_file (removed)
     * - edit_file (removed)
     * - exec_command (removed)
     * - restart_service (removed)
     */
    getTools() {
        return {
            // Read-only operations (safe)
            read_file: this._readFile.bind(this),
            // Envelope proposal (agent authority boundary)
            propose_envelope: this._proposeEnvelope.bind(this),
            // Metadata (safe)
            describe_tools: this._describeTools.bind(this)
        };
    }
    /**
     * Read file (read-only, no warrant required)
     */
    async _readFile(filepath) {
        const fs = require('fs').promises;
        const path = require('path');
        const absolutePath = filepath.startsWith('~')
            ? filepath.replace('~', process.env.HOME)
            : path.resolve(filepath);
        try {
            const content = await fs.readFile(absolutePath, 'utf8');
            return {
                success: true,
                path: absolutePath,
                content
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Propose envelope for execution
     *
     * Agent describes desired action, Vienna validates and executes.
     */
    async _proposeEnvelope(proposal) {
        try {
            const { warrant_id, objective, actions } = proposal;
            // Create envelope
            const envelope = EnvelopeSystem.create({
                warrant_id,
                objective,
                actions,
                proposed_by: 'agent'
            });
            return {
                success: true,
                envelope_id: envelope.envelope_id,
                envelope,
                message: 'Envelope created. Execute via ViennaCore.executor.execute(envelope)'
            };
        }
        catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * Describe available tools
     */
    _describeTools() {
        return {
            available_tools: [
                {
                    name: 'read_file',
                    description: 'Read file contents (read-only)',
                    parameters: { filepath: 'string' },
                    authority: 'read-only'
                },
                {
                    name: 'propose_envelope',
                    description: 'Propose envelope for execution via Vienna Core executor',
                    parameters: {
                        warrant_id: 'string (required)',
                        objective: 'string (required)',
                        actions: 'array of {type, target, ...} (required)'
                    },
                    authority: 'proposal-only'
                }
            ],
            removed_tools: [
                'write_file (removed - use propose_envelope)',
                'edit_file (removed - use propose_envelope)',
                'exec_command (removed - use propose_envelope)',
                'restart_service (removed - use propose_envelope)'
            ],
            note: 'Agents propose envelopes. Vienna validates and executes.'
        };
    }
}
module.exports = AgentTools;
//# sourceMappingURL=tools.js.map