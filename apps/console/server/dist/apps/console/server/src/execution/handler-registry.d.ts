/**
 * Execution Handler Registry
 *
 * Central registry for all execution handlers
 */
import { HandlerRegistry } from './types.js';
export declare const handlerRegistry: HandlerRegistry;
export declare function getHandler(actionType: string): import("./types.js").ExecutionHandler;
export declare function registerHandler(actionType: string, handler: any): void;
export default handlerRegistry;
//# sourceMappingURL=handler-registry.d.ts.map