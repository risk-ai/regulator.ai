export = VerificationOverdueDetector;
declare class VerificationOverdueDetector extends Detector {
    stateGraph: any;
    assessSeverity(overdueSeconds: any, timeoutMs: any): string;
}
import { Detector } from "../detector-framework.js";
//# sourceMappingURL=verification-overdue-detector.d.ts.map