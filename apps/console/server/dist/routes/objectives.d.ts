/**
 * Objectives Routes
 *
 * Vienna's governed work visibility and operator actions.
 * Surfaces objectives, blocked work, and action paths.
 */
import { Router } from 'express';
import type { ObjectivesService } from '../services/objectivesService.js';
import type { TimelineService } from '../services/timelineService.js';
export declare function createObjectivesRouter(objectivesService: ObjectivesService, timelineService?: TimelineService): Router;
//# sourceMappingURL=objectives.d.ts.map