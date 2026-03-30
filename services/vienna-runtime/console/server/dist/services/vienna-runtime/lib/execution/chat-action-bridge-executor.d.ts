/**
 * ChatActionBridge — Executes typed actions only
 */
export class ChatActionBridge {
    handlers: {
        system_service_restart: typeof restartService;
        sleep: typeof sleep;
        health_check: typeof healthCheck;
    };
    /**
     * Execute a typed action descriptor
     * @param {import('./action-types').ActionDescriptor} action
     * @returns {Promise<import('./action-result').ActionResult>}
     */
    execute(action: import("./action-types").ActionDescriptor): Promise<import("./action-result").ActionResult>;
    /**
     * Get list of supported action types (for introspection)
     * @returns {string[]}
     */
    getSupportedActions(): string[];
}
export const actionBridge: ChatActionBridge;
import { restartService } from "./handlers/restart-service";
import { sleep } from "./handlers/sleep";
import { healthCheck } from "./handlers/health-check";
//# sourceMappingURL=chat-action-bridge-executor.d.ts.map