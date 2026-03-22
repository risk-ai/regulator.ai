/**
 * Event Timeline
 * 
 * Display recent reconciliation lifecycle events chronologically.
 */

const { getStateGraph } = require('../../lib/state/state-graph');

/**
 * Relevant event types for timeline display
 */
const TIMELINE_EVENT_TYPES = [
  'objective.reconciliation.requested',
  'objective.reconciliation.started',
  'objective.reconciliation.skipped',
  'objective.reconciliation.cooldown_entered',
  'objective.reconciliation.degraded',
  'objective.reconciliation.recovered',
  'objective.reconciliation.manual_reset',
  'objective.reconciliation.safe_mode_entered',
  'objective.reconciliation.safe_mode_released',
  'objective.execution.started',
  'objective.execution.timed_out',
  'objective.execution.completed',
  'objective.execution.failed'
];

/**
 * Format event type for display
 */
function formatEventType(eventType) {
  const parts = eventType.split('.');
  const category = parts[1]; // reconciliation or execution
  const action = parts[2]; // started, completed, etc.
  
  const categorySymbol = {
    'reconciliation': '🔄',
    'execution': '⚙️'
  }[category] || '•';
  
  return `${categorySymbol} ${action.replace(/_/g, ' ')}`;
}

/**
 * Format timestamp
 */
function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  
  // If within last hour, show relative time
  if (diffSecs < 3600) {
    if (diffSecs < 60) return `${diffSecs}s ago`;
    return `${Math.floor(diffSecs / 60)}m ago`;
  }
  
  // Otherwise show HH:MM:SS
  return date.toISOString().substring(11, 19);
}

/**
 * Render event timeline
 */
async function renderEventTimeline(options = {}) {
  const limit = options.limit || 50;
  const objectiveFilter = options.objective;
  
  const stateGraph = getStateGraph();
  await stateGraph.initialize();

  console.log('\n╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                            EVENT TIMELINE                                     ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  // Query objective history events
  const objectives = objectiveFilter 
    ? [stateGraph.getObjective(objectiveFilter)]
    : stateGraph.listObjectives();

  if (!objectives || objectives.length === 0) {
    console.log('No objectives found.\n');
    return;
  }

  // Collect all events from all objectives
  let allEvents = [];
  
  for (const obj of objectives) {
    if (!obj) continue;
    
    const history = stateGraph.listObjectiveHistory(obj.objective_id, limit);
    
    // Convert history entries to timeline events
    const events = history.map(h => ({
      objective_id: h.objective_id,
      event_type: h.reason, // reason field contains event type
      event_timestamp: h.event_timestamp,
      metadata: h.metadata,
      from_status: h.from_status,
      to_status: h.to_status
    }));
    
    allEvents = allEvents.concat(events);
  }

  // Filter to timeline-relevant events and sort chronologically (most recent first)
  const timelineEvents = allEvents
    .filter(e => TIMELINE_EVENT_TYPES.includes(e.event_type) || e.event_type.startsWith('objective.'))
    .sort((a, b) => new Date(b.event_timestamp) - new Date(a.event_timestamp))
    .slice(0, limit);

  if (timelineEvents.length === 0) {
    console.log('No timeline events found.\n');
    return;
  }

  // Table header
  console.log('┌──────────┬─────────────────────┬──────────────────────────┬──────────────────────┐');
  console.log('│ TIME     │ OBJECTIVE           │ EVENT                    │ DETAILS              │');
  console.log('├──────────┼─────────────────────┼──────────────────────────┼──────────────────────┤');

  // Table rows
  timelineEvents.forEach(event => {
    const time = formatTimestamp(event.event_timestamp).padEnd(8);
    const objective_id = event.objective_id.padEnd(19).substring(0, 19);
    const eventType = formatEventType(event.event_type).padEnd(24).substring(0, 24);
    
    // Build details string
    let details = '';
    if (event.metadata && event.metadata.generation) {
      details += `gen:${event.metadata.generation} `;
    }
    if (event.metadata && event.metadata.execution_id) {
      details += `exec:${event.metadata.execution_id.substring(0, 8)} `;
    }
    if (event.metadata && event.metadata.skip_reason) {
      details += event.metadata.skip_reason;
    }
    details = details.trim().padEnd(20).substring(0, 20);
    
    console.log(`│ ${time} │ ${objective_id} │ ${eventType} │ ${details} │`);
  });

  console.log('└──────────┴─────────────────────┴──────────────────────────┴──────────────────────┘\n');
  
  if (objectiveFilter) {
    console.log(`Showing timeline for: ${objectiveFilter}\n`);
  } else {
    console.log(`Showing ${timelineEvents.length} most recent events across ${objectives.length} objective(s)\n`);
  }
}

module.exports = { renderEventTimeline };

// CLI entry point
if (require.main === module) {
  const objectiveFilter = process.argv[2];
  const options = objectiveFilter ? { objective: objectiveFilter } : {};
  
  renderEventTimeline(options).catch(err => {
    console.error('Error rendering event timeline:', err);
    process.exit(1);
  });
}
