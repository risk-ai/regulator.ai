export = AgentTools;
/**
 * Agent Tool Set
 *
 * Tools available to agents after Phase 7.2.
 */
declare class AgentTools {
    constructor(viennaCore: any);
    viennaCore: any;
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
    getTools(): {
        read_file: any;
        propose_envelope: any;
        describe_tools: any;
    };
    /**
     * Read file (read-only, no warrant required)
     */
    _readFile(filepath: any): Promise<{
        success: boolean;
        path: any;
        content: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        path?: undefined;
        content?: undefined;
    }>;
    /**
     * Propose envelope for execution
     *
     * Agent describes desired action, Vienna validates and executes.
     */
    _proposeEnvelope(proposal: any): Promise<{
        success: boolean;
        envelope_id: any;
        envelope: any;
        message: string;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        envelope_id?: undefined;
        envelope?: undefined;
        message?: undefined;
    }>;
    /**
     * Describe available tools
     */
    _describeTools(): {
        available_tools: ({
            name: string;
            description: string;
            parameters: {
                filepath: string;
                warrant_id?: undefined;
                objective?: undefined;
                actions?: undefined;
            };
            authority: string;
        } | {
            name: string;
            description: string;
            parameters: {
                warrant_id: string;
                objective: string;
                actions: string;
                filepath?: undefined;
            };
            authority: string;
        })[];
        removed_tools: string[];
        note: string;
    };
}
//# sourceMappingURL=tools.d.ts.map