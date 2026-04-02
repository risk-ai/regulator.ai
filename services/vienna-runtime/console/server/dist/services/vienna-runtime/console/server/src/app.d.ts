/**
 * Vienna Console Server
 *
 * Express application setup.
 * Mounts all routes and middleware.
 */
import { Express } from 'express';
import { ViennaRuntimeService } from './services/viennaRuntime.js';
import { ChatService } from './services/chatService.js';
import { DashboardBootstrapService } from './services/dashboardBootstrapService.js';
import { ObjectivesService } from './services/objectivesService.js';
import { AuthService } from './services/authService.js';
import { TimelineService } from './services/timelineService.js';
import { RuntimeStatsService } from './services/runtimeStatsService.js';
import { ProviderHealthService } from './services/providerHealthService.js';
import { SystemNowService } from './services/systemNowService.js';
export declare function createApp(viennaRuntime: ViennaRuntimeService, chatService: ChatService, bootstrapService: DashboardBootstrapService, objectivesService: ObjectivesService, authService: AuthService, timelineService?: TimelineService, runtimeStatsService?: RuntimeStatsService, providerHealthService?: ProviderHealthService, systemNowService?: SystemNowService): Express;
//# sourceMappingURL=app.d.ts.map