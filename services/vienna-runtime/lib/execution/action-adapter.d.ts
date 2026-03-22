export class ActionAdapter {
    actionExecutor: ActionExecutor;
    /**
     * Execute action (adapter interface)
     */
    execute(action: any, warrant: any, envelope: any): Promise<{
        success: any;
        output: any;
        metadata: any;
    }>;
}
import { ActionExecutor } from "./action-executor";
//# sourceMappingURL=action-adapter.d.ts.map