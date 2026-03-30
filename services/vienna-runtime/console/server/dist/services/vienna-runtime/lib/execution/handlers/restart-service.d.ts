/**
 * Restart a system service via systemctl
 * @param {import('../action-types').SystemServiceRestartAction} action
 * @returns {Promise<import('../action-result').ActionResult>}
 */
export function restartService(action: import("../action-types").SystemServiceRestartAction): Promise<import("../action-result").ActionResult>;
export const ALLOWED_SERVICES: Set<string>;
//# sourceMappingURL=restart-service.d.ts.map