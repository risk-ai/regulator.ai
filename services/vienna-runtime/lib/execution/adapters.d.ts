/**
 * Base Adapter
 */
export class Adapter {
    execute(action: any, warrant: any, envelope: any): Promise<void>;
}
/**
 * File Adapter - Handles file operations
 */
export class FileAdapter extends Adapter {
    execute(action: any, warrant: any, envelope: any): Promise<{
        path: any;
        bytes_written: any;
        changes?: undefined;
        content?: undefined;
        deleted?: undefined;
    } | {
        path: any;
        changes: number;
        bytes_written?: undefined;
        content?: undefined;
        deleted?: undefined;
    } | {
        path: any;
        content: string;
        bytes_written?: undefined;
        changes?: undefined;
        deleted?: undefined;
    } | {
        path: any;
        deleted: boolean;
        bytes_written?: undefined;
        changes?: undefined;
        content?: undefined;
    }>;
    _resolvePath(target: any): any;
    _createBackup(filePath: any): Promise<void>;
}
/**
 * Service Adapter - Handles service operations
 */
export class ServiceAdapter extends Adapter {
    stateGraph: any;
    /**
     * Set State Graph for persistent storage (Phase 7.2)
     *
     * @param {StateGraph} stateGraph - State Graph instance
     */
    setStateGraph(stateGraph: StateGraph): void;
    execute(action: any, warrant: any, envelope: any): Promise<{
        service: any;
        status: string;
    }>;
}
/**
 * Exec Adapter - Handles command execution
 */
export class ExecAdapter extends Adapter {
    execute(action: any, warrant: any, envelope: any): Promise<{
        command: any;
        stdout: string;
        stderr: string;
        exit_code: number;
    }>;
    _resolvePath(target: any): any;
}
/**
 * Read-Only Adapter - Safe operations
 */
export class ReadOnlyAdapter extends Adapter {
    execute(action: any, warrant: any, envelope: any): Promise<{
        path: any;
        content: string;
    }>;
}
//# sourceMappingURL=adapters.d.ts.map