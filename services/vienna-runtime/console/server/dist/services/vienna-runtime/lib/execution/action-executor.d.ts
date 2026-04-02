export class ActionExecutor {
    constructor(workspace: any, deadLetterQueue?: any);
    workspace: any;
    outputResolver: OutputPathResolver;
    fanoutExecutor: FanoutExecutor;
    /**
     * Execute envelope action (Phase 3B: fanout-aware)
     */
    execute(envelope: any): Promise<object>;
    /**
     * Read file contents
     */
    readFile(envelope: any): Promise<{
        success: boolean;
        output: string;
        metadata: {
            path: any;
            size: number;
        };
    }>;
    /**
     * Summarize text (Phase 2C stub: truncate + header)
     * TODO: Replace with LLM summarization in Phase 2D
     */
    summarizeText(envelope: any): Promise<{
        success: boolean;
        output: any;
        metadata: {
            original_length: any;
            summary_length: any;
            truncated: boolean;
        };
    }>;
    /**
     * Write file contents (Phase 3A: collision-safe)
     */
    writeFile(envelope: any): Promise<{
        success: boolean;
        output: any;
        metadata: {
            path: any;
            size: any;
        };
    }>;
    /**
     * Check if path needs collision resolution
     */
    needsCollisionResolution(targetPath: any): boolean;
    /**
     * Verify file write (Phase 3A: uses resolved path from previous write)
     */
    verifyWrite(envelope: any): Promise<{
        success: boolean;
        output: any;
        metadata: {
            path: any;
            size: number;
            verified: boolean;
        };
    }>;
    /**
     * List directory contents
     */
    listDirectory(envelope: any): Promise<{
        success: boolean;
        output: string[];
        metadata: {
            path: any;
            file_count: number;
        };
    }>;
    /**
     * Aggregate multiple summaries into index
     * (Phase 2C: Simple concatenation, Phase 2D: structured formatting)
     */
    aggregateSummaries(envelope: any): Promise<{
        success: boolean;
        output: string;
        metadata: {
            summary_count: number;
            total_length: number;
        };
    }>;
}
import { OutputPathResolver } from "./output-path-resolver";
import { FanoutExecutor } from "./fanout-executor";
//# sourceMappingURL=action-executor.d.ts.map