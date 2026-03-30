export = ServiceHealthDetector;
declare class ServiceHealthDetector extends Detector {
    stateGraph: any;
    assessSeverity(service: any): string;
    assessConfidence(service: any): 0.85 | 0.75 | 0.6 | 0.95;
}
import { Detector } from "../detector-framework.js";
//# sourceMappingURL=service-health-detector.d.ts.map