/**
 * Action Executor
 * 
 * Executes typed action envelopes.
 * Phase 2C: Minimal implementations for file operations + text summarization.
 * Phase 3A: Output collision safety via OutputPathResolver
 * Phase 3B: Fanout execution with failure isolation via FanoutExecutor
 * 
 * DESIGN:
 * - Each action type has a dedicated handler
 * - No natural language parsing
 * - Deterministic execution
 * - Verification on mutations
 * - Collision-safe output naming (Phase 3A)
 * - Per-item failure isolation for fanout (Phase 3B)
 */

const fs = require('fs/promises');
const path = require('path');
const { OutputPathResolver } = require('./output-path-resolver');
const { FanoutExecutor } = require('./fanout-executor');

class ActionExecutor {
  constructor(workspace, deadLetterQueue = null) {
    this.workspace = workspace || path.join(process.env.HOME || '~', '.openclaw', 'workspace');
    this.outputResolver = new OutputPathResolver(this.workspace);
    this.fanoutExecutor = new FanoutExecutor(this, deadLetterQueue);
  }
  
  /**
   * Execute envelope action (Phase 3B: fanout-aware)
   */
  async execute(envelope) {
    console.log('[ActionExecutor] Executing:', envelope.action_type, envelope.target || '(fanout)');
    
    // Phase 3B: Check if this is a fanout action
    if (envelope.fanout && envelope.input && Array.isArray(envelope.input)) {
      console.log('[ActionExecutor] Detected fanout action, delegating to FanoutExecutor');
      return await this.fanoutExecutor.executeFanout(envelope, envelope.input);
    }
    
    switch (envelope.action_type) {
      case 'read_file':
        return await this.readFile(envelope);
        
      case 'summarize_text':
        return await this.summarizeText(envelope);
        
      case 'write_file':
        return await this.writeFile(envelope);
        
      case 'verify_write':
        return await this.verifyWrite(envelope);
        
      case 'list_directory':
        return await this.listDirectory(envelope);
        
      case 'aggregate_summaries':
        return await this.aggregateSummaries(envelope);
        
      default:
        throw new Error(`Unsupported action type: ${envelope.action_type}`);
    }
  }
  
  /**
   * Read file contents
   */
  async readFile(envelope) {
    const fullPath = path.resolve(this.workspace, envelope.target.replace(/^\//, ''));
    
    // Security check
    if (!fullPath.startsWith(this.workspace)) {
      throw new Error('Path outside workspace not allowed');
    }
    
    const content = await fs.readFile(fullPath, 'utf-8');
    
    return {
      success: true,
      output: content,
      metadata: {
        path: envelope.target,
        size: content.length,
      },
    };
  }
  
  /**
   * Summarize text (Phase 2C stub: truncate + header)
   * TODO: Replace with LLM summarization in Phase 2D
   */
  async summarizeText(envelope) {
    const input = envelope.input || envelope.params?.text || '';
    const maxLength = envelope.params?.max_length || 500;
    
    // Simple truncation for Phase 2C demo
    let summary = input;
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength) + '...';
    }
    
    const header = `# Summary\n\nGenerated: ${new Date().toISOString()}\n\n`;
    summary = header + summary;
    
    return {
      success: true,
      output: summary,
      metadata: {
        original_length: input.length,
        summary_length: summary.length,
        truncated: input.length > maxLength,
      },
    };
  }
  
  /**
   * Write file contents (Phase 3A: collision-safe)
   */
  async writeFile(envelope) {
    const content = envelope.input || envelope.params?.content || '';
    
    // Phase 3A: Resolve collision-safe output path
    const sourcePath = envelope.params?.source_path || envelope.target;
    const purpose = envelope.params?.output_purpose || 'summary';
    
    let resolvedPath;
    let collisionMeta = {};
    
    // If target looks like it needs collision resolution (e.g., contains .summary.)
    if (this.needsCollisionResolution(envelope.target)) {
      const resolved = await this.outputResolver.resolveOutputPath({
        sourcePath,
        purpose,
        objectiveId: envelope.objective_id || 'unknown',
        envelopeId: envelope.envelope_id || 'unknown',
      });
      
      resolvedPath = resolved.finalPath;
      collisionMeta = {
        requested_path: resolved.requestedPath,
        final_path: resolved.finalPath,
        collided: resolved.collided,
        collision_index: resolved.collisionIndex,
      };
    } else {
      // Direct write without collision resolution
      resolvedPath = envelope.target;
    }
    
    const fullPath = path.resolve(this.workspace, resolvedPath.replace(/^\//, ''));
    
    // Security check
    if (!fullPath.startsWith(this.workspace)) {
      throw new Error('Path outside workspace not allowed');
    }
    
    // Ensure parent directory exists
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    
    // Write file
    await fs.writeFile(fullPath, content, 'utf-8');
    
    // Release path reservation
    if (collisionMeta.final_path) {
      await this.outputResolver.releasePath(resolvedPath);
    }
    
    return {
      success: true,
      output: null,
      metadata: {
        path: resolvedPath,
        size: content.length,
        ...collisionMeta,
      },
    };
  }
  
  /**
   * Check if path needs collision resolution
   */
  needsCollisionResolution(targetPath) {
    // Patterns that indicate generated output files
    const patterns = ['.summary', '.report', '_folder-summary', 'SUMMARY.md'];
    return patterns.some(p => targetPath.includes(p));
  }
  
  /**
   * Verify file write (Phase 3A: uses resolved path from previous write)
   */
  async verifyWrite(envelope) {
    // Phase 3A: Use final path from write metadata if available
    const targetPath = envelope.params?.final_path || envelope.target;
    
    const fullPath = path.resolve(this.workspace, targetPath.replace(/^\//, ''));
    
    // Security check
    if (!fullPath.startsWith(this.workspace)) {
      throw new Error('Path outside workspace not allowed');
    }
    
    // Check file exists
    const stats = await fs.stat(fullPath);
    
    const verified = stats.isFile() && stats.size > 0;
    
    return {
      success: verified,
      output: null,
      metadata: {
        path: targetPath,
        size: stats.size,
        verified,
      },
    };
  }
  
  /**
   * List directory contents
   */
  async listDirectory(envelope) {
    const fullPath = path.resolve(this.workspace, envelope.target.replace(/^\//, ''));
    
    // Security check
    if (!fullPath.startsWith(this.workspace)) {
      throw new Error('Path outside workspace not allowed');
    }
    
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    
    const files = entries
      .filter(e => e.isFile())
      .map(e => path.join(envelope.target, e.name));
    
    return {
      success: true,
      output: files,
      metadata: {
        path: envelope.target,
        file_count: files.length,
      },
    };
  }
  
  /**
   * Aggregate multiple summaries into index
   * (Phase 2C: Simple concatenation, Phase 2D: structured formatting)
   */
  async aggregateSummaries(envelope) {
    const summaries = envelope.input || [];
    
    if (!Array.isArray(summaries)) {
      throw new Error('aggregate_summaries requires array input');
    }
    
    const header = `# Folder Summary\n\nGenerated: ${new Date().toISOString()}\nTotal files: ${summaries.length}\n\n`;
    
    const aggregated = header + summaries.map((s, i) => {
      return `## File ${i + 1}\n\n${s}\n\n---\n\n`;
    }).join('');
    
    return {
      success: true,
      output: aggregated,
      metadata: {
        summary_count: summaries.length,
        total_length: aggregated.length,
      },
    };
  }
}

module.exports = { ActionExecutor };
