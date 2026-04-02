/**
 * Instruction Queue
 *
 * File-based instruction/result queue for Vienna ↔ OpenClaw communication.
 * Provides reliable bidirectional messaging without requiring HTTP endpoints.
 *
 * Design:
 * - Vienna writes instructions to queue/instructions/
 * - OpenClaw agent polls queue, processes, writes results to queue/results/
 * - Vienna polls results
 */
const fs = require('fs');
const path = require('path');
const { nanoid } = require('nanoid');
class InstructionQueue {
    constructor(options = {}) {
        this.queueDir = options.queueDir || path.join(process.env.HOME, '.openclaw', 'vienna-queue');
        this.instructionsDir = path.join(this.queueDir, 'instructions');
        this.resultsDir = path.join(this.queueDir, 'results');
        this.pollInterval = options.pollInterval || 1000; // 1 second
        this.resultTimeout = options.resultTimeout || 30000; // 30 seconds
        this._ensureDirectories();
    }
    /**
     * Ensure queue directories exist
     */
    _ensureDirectories() {
        for (const dir of [this.queueDir, this.instructionsDir, this.resultsDir]) {
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        }
    }
    /**
     * Enqueue instruction for processing
     *
     * @param {Object} instruction - Instruction envelope
     * @returns {Promise<Object>} Result envelope
     */
    async enqueueInstruction(instruction) {
        const instructionFile = path.join(this.instructionsDir, `${instruction.instruction_id}.json`);
        const resultFile = path.join(this.resultsDir, `${instruction.instruction_id}.json`);
        // Write instruction to queue
        fs.writeFileSync(instructionFile, JSON.stringify(instruction, null, 2));
        console.log(`[InstructionQueue] Enqueued: ${instruction.instruction_id}`);
        // Poll for result
        const started_at = Date.now();
        while (Date.now() - started_at < this.resultTimeout) {
            // Check if result exists
            if (fs.existsSync(resultFile)) {
                const resultJson = fs.readFileSync(resultFile, 'utf8');
                const result = JSON.parse(resultJson);
                // Clean up
                try {
                    fs.unlinkSync(instructionFile);
                    fs.unlinkSync(resultFile);
                }
                catch (error) {
                    console.warn(`[InstructionQueue] Cleanup failed:`, error.message);
                }
                console.log(`[InstructionQueue] Result received: ${instruction.instruction_id}`);
                return result;
            }
            // Wait before next poll
            await new Promise(resolve => setTimeout(resolve, this.pollInterval));
        }
        // Timeout
        try {
            fs.unlinkSync(instructionFile);
        }
        catch (error) {
            // Ignore cleanup errors
        }
        throw new Error(`Instruction timeout: ${instruction.instruction_id}`);
    }
    /**
     * Process queued instructions (agent-side)
     *
     * @param {Function} handler - Instruction handler function
     * @param {Object} options - Processing options
     */
    async processInstructions(handler, options = {}) {
        const { maxConcurrent = 1, stopSignal = null } = options;
        console.log('[InstructionQueue] Processing started');
        while (true) {
            // Check stop signal
            if (stopSignal && stopSignal.stopped) {
                console.log('[InstructionQueue] Stop signal received');
                break;
            }
            // Get pending instructions
            let files;
            try {
                files = fs.readdirSync(this.instructionsDir);
            }
            catch (error) {
                console.error('[InstructionQueue] Failed to read instructions directory:', error);
                await new Promise(resolve => setTimeout(resolve, this.pollInterval));
                continue;
            }
            const instructionFiles = files.filter(f => f.endsWith('.json')).slice(0, maxConcurrent);
            if (instructionFiles.length === 0) {
                // No instructions, wait and poll again
                await new Promise(resolve => setTimeout(resolve, this.pollInterval));
                continue;
            }
            // Process instructions
            for (const file of instructionFiles) {
                const instructionPath = path.join(this.instructionsDir, file);
                try {
                    // Read instruction
                    const instructionJson = fs.readFileSync(instructionPath, 'utf8');
                    const instruction = JSON.parse(instructionJson);
                    console.log(`[InstructionQueue] Processing: ${instruction.instruction_id}`);
                    // Execute handler
                    const result = await handler(instruction);
                    // Write result
                    const resultPath = path.join(this.resultsDir, file);
                    fs.writeFileSync(resultPath, JSON.stringify(result, null, 2));
                    console.log(`[InstructionQueue] Completed: ${instruction.instruction_id}`);
                }
                catch (error) {
                    console.error(`[InstructionQueue] Error processing ${file}:`, error);
                    // Write error result
                    try {
                        const errorResult = {
                            instruction_id: path.basename(file, '.json'),
                            status: 'failure',
                            error: error.message,
                            timestamp: new Date().toISOString()
                        };
                        const resultPath = path.join(this.resultsDir, file);
                        fs.writeFileSync(resultPath, JSON.stringify(errorResult, null, 2));
                    }
                    catch (writeError) {
                        console.error(`[InstructionQueue] Failed to write error result:`, writeError);
                    }
                }
            }
        }
        console.log('[InstructionQueue] Processing stopped');
    }
    /**
     * Clean up old instructions/results
     *
     * @param {number} maxAge - Maximum age in milliseconds
     */
    cleanup(maxAge = 300000) {
        const now = Date.now();
        for (const dir of [this.instructionsDir, this.resultsDir]) {
            try {
                const files = fs.readdirSync(dir);
                for (const file of files) {
                    const filePath = path.join(dir, file);
                    const stats = fs.statSync(filePath);
                    if (now - stats.mtimeMs > maxAge) {
                        fs.unlinkSync(filePath);
                        console.log(`[InstructionQueue] Cleaned up: ${file}`);
                    }
                }
            }
            catch (error) {
                console.error(`[InstructionQueue] Cleanup error in ${dir}:`, error);
            }
        }
    }
}
module.exports = { InstructionQueue };
//# sourceMappingURL=instruction-queue.js.map