/**
 * Planner Service
 *
 * Phase 2D: Workspace-Aware Command Planning
 *
 * Converts natural language commands into structured execution plans.
 *
 * Architecture:
 * 1. Parse intent (action + target)
 * 2. Resolve workspace files (if needed)
 * 3. Generate execution plan
 * 4. Return structured actions
 *
 * Supported intents:
 * - summarize_file
 * - summarize_folder
 * - explain_file
 * - open_file
 * - read_file
 * - analyze_file
 * - find_file
 */
import { type ParsedIntent } from './intentParser.js';
import { type FileResolutionResult } from './workspaceResolver.js';
export interface PlanAction {
    type: string;
    target?: string;
    params?: Record<string, any>;
    fanout?: boolean;
}
export interface ExecutionPlan {
    plan_id: string;
    objective_id: string;
    command_type: string;
    intent: ParsedIntent;
    resolution?: FileResolutionResult;
    actions: PlanAction[];
    inputs: {
        attachments: string[];
        explicit_paths: string[];
        resolvedPath?: string;
    };
    expected_outputs: string[];
}
export declare class PlannerService {
    private intentParser;
    private workspaceResolver;
    constructor();
    /**
     * Generate execution plan from command + attachments
     */
    planCommand(request: {
        objective_id: string;
        command: string;
        attachments: string[];
        operator: string;
    }): Promise<ExecutionPlan>;
    /**
     * Generate actions based on intent
     */
    private generateActions;
    /**
     * Extract explicit file paths from command text
     */
    private extractPaths;
    /**
     * Plan: Summarize single file
     */
    private planSummarizeFile;
    /**
     * Plan: Summarize all files in folder
     */
    private planSummarizeFolder;
    /**
     * Plan: Explain file (similar to summarize but more detailed)
     */
    private planExplainFile;
    /**
     * Plan: Read/open file (return contents)
     */
    private planReadFile;
    /**
     * Plan: Analyze file (deeper inspection)
     */
    private planAnalyzeFile;
    /**
     * Plan: Find file (search workspace)
     */
    private planFindFile;
}
//# sourceMappingURL=plannerService.d.ts.map