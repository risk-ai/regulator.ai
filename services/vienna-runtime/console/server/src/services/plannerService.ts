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

import { IntentParser, type ParsedIntent } from './intentParser.js';
import { WorkspaceResolver, type FileResolutionResult } from './workspaceResolver.js';

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

export class PlannerService {
  private intentParser: IntentParser;
  private workspaceResolver: WorkspaceResolver;

  constructor() {
    this.intentParser = new IntentParser();
    this.workspaceResolver = new WorkspaceResolver();
  }

  /**
   * Generate execution plan from command + attachments
   */
  async planCommand(request: {
    objective_id: string;
    command: string;
    attachments: string[];
    operator: string;
  }): Promise<ExecutionPlan> {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Parse intent
    const intent = this.intentParser.parse(request.command);
    
    console.log('[PlannerService] Parsed intent:', {
      planId,
      objectiveId: request.objective_id,
      intent: intent.intent,
      targetType: intent.targetType,
      query: intent.query,
    });
    
    // Resolve workspace file if needed
    let resolution: FileResolutionResult | undefined;
    let resolvedPath: string | undefined;
    
    if (intent.query && intent.targetType !== 'current_file') {
      resolution = await this.workspaceResolver.resolve(intent.query);
      
      console.log('[PlannerService] File resolution:', {
        query: intent.query,
        status: resolution.status,
      });
      
      // Handle resolution results
      if (resolution.status === 'not_found') {
        throw new Error(`File not found: "${intent.query}". Searched in workspace but found no matches.`);
      }
      
      if (resolution.status === 'ambiguous') {
        const matches = resolution.matches.map(m => `  - ${m.relativePath}`).join('\n');
        throw new Error(
          `Multiple files match "${intent.query}":\n${matches}\n\nPlease specify the full path or unique filename.`
        );
      }
      
      if (resolution.status === 'resolved') {
        resolvedPath = resolution.relativePath;
        console.log('[PlannerService] Resolved to:', resolvedPath);
      }
    }
    
    // Determine final target
    let targetPath: string | undefined;
    
    if (resolvedPath) {
      // Use resolved path from workspace
      targetPath = resolvedPath;
    } else if (request.attachments.length > 0) {
      // Use manual attachment
      targetPath = request.attachments[0];
    } else if (intent.targetType === 'current_file') {
      // Expect current file from context (handled by caller)
      throw new Error('Please attach the current file or specify a filename.');
    }
    
    // Generate actions based on intent
    const { actions, expectedOutputs } = await this.generateActions(intent, targetPath, request.attachments);
    
    return {
      plan_id: planId,
      objective_id: request.objective_id,
      command_type: intent.intent,
      intent,
      resolution,
      actions,
      inputs: {
        attachments: request.attachments,
        explicit_paths: this.extractPaths(request.command),
        resolvedPath,
      },
      expected_outputs: expectedOutputs,
    };
  }
  
  /**
   * Generate actions based on intent
   */
  private async generateActions(
    intent: ParsedIntent,
    targetPath: string | undefined,
    attachments: string[]
  ): Promise<{
    actions: PlanAction[];
    expectedOutputs: string[];
  }> {
    switch (intent.intent) {
      case 'summarize_file':
        return this.planSummarizeFile(targetPath, attachments);
        
      case 'summarize_folder':
        return this.planSummarizeFolder(targetPath, attachments);
        
      case 'explain_file':
        return this.planExplainFile(targetPath, attachments);
        
      case 'open_file':
      case 'read_file':
        return this.planReadFile(targetPath, attachments);
        
      case 'analyze_file':
        return this.planAnalyzeFile(targetPath, attachments);
        
      case 'find_file':
        return this.planFindFile(intent.query);
        
      default:
        throw new Error(
          `Command not supported: "${intent.raw}"\n\n` +
          `Supported actions: summarize, explain, open, read, analyze, find\n` +
          `Supported targets: files and folders\n\n` +
          `Examples:\n` +
          `  - summarize package-lock.json\n` +
          `  - explain src/server.ts\n` +
          `  - find plannerService.ts\n` +
          `  - summarize this folder`
        );
    }
  }
  
  /**
   * Extract explicit file paths from command text
   */
  private extractPaths(command: string): string[] {
    // Simple regex for workspace paths: /path/to/file.ext or path/to/file.ext
    const pathPattern = /[\w\-\.\/]+\.\w+/g;
    const matches = command.match(pathPattern);
    return matches || [];
  }
  
  /**
   * Plan: Summarize single file
   */
  private planSummarizeFile(
    targetPath: string | undefined,
    attachments: string[]
  ): {
    actions: PlanAction[];
    expectedOutputs: string[];
  } {
    if (!targetPath) {
      throw new Error(
        'No file specified for summarization.\n\n' +
        'Try:\n' +
        '  - "summarize package-lock.json"\n' +
        '  - "summarize this file" (with file attached)\n' +
        '  - Attach a file and type "summarize this file"'
      );
    }
    
    const filePath = targetPath;
    const summaryPath = filePath.replace(/(\.\w+)$/, '.summary$1');
    
    const actions: PlanAction[] = [
      {
        type: 'read_file',
        target: filePath,
      },
      {
        type: 'summarize_text',
        params: {
          max_length: 500,
        },
      },
      {
        type: 'write_file',
        target: summaryPath,
      },
      {
        type: 'verify_write',
        target: summaryPath,
      },
    ];
    
    return {
      actions,
      expectedOutputs: [summaryPath],
    };
  }
  
  /**
   * Plan: Summarize all files in folder
   */
  private planSummarizeFolder(
    targetPath: string | undefined,
    attachments: string[]
  ): {
    actions: PlanAction[];
    expectedOutputs: string[];
  } {
    if (!targetPath && attachments.length === 0) {
      throw new Error(
        'No folder specified for summarization.\n\n' +
        'Try: "summarize this folder" (from file tree panel)'
      );
    }
    
    const folderPath = targetPath || attachments[0];
    const summaryIndexPath = `${folderPath}/SUMMARY.md`;
    
    const actions: PlanAction[] = [
      {
        type: 'list_directory',
        target: folderPath,
      },
      {
        type: 'read_file',
        fanout: true, // Execute for each file found
      },
      {
        type: 'summarize_text',
        fanout: true,
        params: {
          max_length: 200,
        },
      },
      {
        type: 'aggregate_summaries',
      },
      {
        type: 'write_file',
        target: summaryIndexPath,
      },
      {
        type: 'verify_write',
        target: summaryIndexPath,
      },
    ];
    
    return {
      actions,
      expectedOutputs: [summaryIndexPath],
    };
  }
  
  /**
   * Plan: Explain file (similar to summarize but more detailed)
   */
  private planExplainFile(
    targetPath: string | undefined,
    attachments: string[]
  ): {
    actions: PlanAction[];
    expectedOutputs: string[];
  } {
    if (!targetPath) {
      throw new Error('No file specified for explanation. Try: "explain src/server.ts"');
    }
    
    const filePath = targetPath;
    const explanationPath = filePath.replace(/(\.\w+)$/, '.explanation.md');
    
    const actions: PlanAction[] = [
      {
        type: 'read_file',
        target: filePath,
      },
      {
        type: 'explain_code',
        params: {
          detail_level: 'high',
        },
      },
      {
        type: 'write_file',
        target: explanationPath,
      },
      {
        type: 'verify_write',
        target: explanationPath,
      },
    ];
    
    return {
      actions,
      expectedOutputs: [explanationPath],
    };
  }
  
  /**
   * Plan: Read/open file (return contents)
   */
  private planReadFile(
    targetPath: string | undefined,
    attachments: string[]
  ): {
    actions: PlanAction[];
    expectedOutputs: string[];
  } {
    if (!targetPath) {
      throw new Error('No file specified. Try: "open src/server.ts"');
    }
    
    const filePath = targetPath;
    
    const actions: PlanAction[] = [
      {
        type: 'read_file',
        target: filePath,
      },
      {
        type: 'return_content',
      },
    ];
    
    return {
      actions,
      expectedOutputs: [filePath],
    };
  }
  
  /**
   * Plan: Analyze file (deeper inspection)
   */
  private planAnalyzeFile(
    targetPath: string | undefined,
    attachments: string[]
  ): {
    actions: PlanAction[];
    expectedOutputs: string[];
  } {
    if (!targetPath) {
      throw new Error('No file specified for analysis. Try: "analyze src/server.ts"');
    }
    
    const filePath = targetPath;
    const analysisPath = filePath.replace(/(\.\w+)$/, '.analysis.md');
    
    const actions: PlanAction[] = [
      {
        type: 'read_file',
        target: filePath,
      },
      {
        type: 'analyze_code',
        params: {
          checks: ['complexity', 'dependencies', 'patterns', 'security'],
        },
      },
      {
        type: 'write_file',
        target: analysisPath,
      },
      {
        type: 'verify_write',
        target: analysisPath,
      },
    ];
    
    return {
      actions,
      expectedOutputs: [analysisPath],
    };
  }
  
  /**
   * Plan: Find file (search workspace)
   */
  private planFindFile(
    query: string | undefined
  ): {
    actions: PlanAction[];
    expectedOutputs: string[];
  } {
    if (!query) {
      throw new Error('No filename specified. Try: "find package-lock.json"');
    }
    
    const actions: PlanAction[] = [
      {
        type: 'search_workspace',
        params: {
          query,
          fuzzy: true,
        },
      },
      {
        type: 'return_results',
      },
    ];
    
    return {
      actions,
      expectedOutputs: ['search_results'],
    };
  }
}
