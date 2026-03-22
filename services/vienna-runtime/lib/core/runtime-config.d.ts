/**
 * Get current runtime environment
 *
 * @returns {string} 'prod' | 'test'
 */
export function getRuntimeEnvironment(): string;
/**
 * Get runtime base directory for current environment
 *
 * @returns {string} Path to runtime directory
 */
export function getRuntimeDir(): string;
/**
 * Get runtime file path for current environment
 *
 * @param {string} filename - File name (e.g., 'execution-queue.jsonl')
 * @returns {string} Full path to runtime file
 */
export function getRuntimePath(filename: string): string;
/**
 * Get archive directory
 *
 * @returns {string} Path to archive directory
 */
export function getArchiveDir(): string;
export namespace REPLAY_LOG_CONFIG {
    let maxSizeBytes: number;
    let maxFiles: number;
    let rotationEnabled: boolean;
}
export namespace DLQ_CONFIG {
    let maxSizeBytes_1: number;
    export { maxSizeBytes_1 as maxSizeBytes };
    let maxFiles_1: number;
    export { maxFiles_1 as maxFiles };
    let rotationEnabled_1: boolean;
    export { rotationEnabled_1 as rotationEnabled };
}
//# sourceMappingURL=runtime-config.d.ts.map