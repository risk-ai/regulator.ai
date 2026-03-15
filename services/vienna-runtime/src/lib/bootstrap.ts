/**
 * Vienna Runtime Bootstrap and Seed
 * 
 * Auto-seeds development database on first boot
 */

import { getDatabase } from '../adapters/db/client';
import { InvestigationRepository } from '../adapters/db/repositories/investigations';
import { IncidentRepository } from '../adapters/db/repositories/incidents';
import { ArtifactRepository } from '../adapters/db/repositories/artifacts';

export function bootstrap(): void {
  const db = getDatabase();
  
  // Check if already seeded
  const countStmt = db.prepare('SELECT COUNT(*) as count FROM investigations');
  const result = countStmt.get() as { count: number };
  
  if (result.count > 0) {
    console.log('[Vienna Bootstrap] Database already seeded');
    return;
  }
  
  console.log('[Vienna Bootstrap] Seeding development data...');
  
  const investRepo = new InvestigationRepository();
  const incidentRepo = new IncidentRepository();
  const artifactRepo = new ArtifactRepository();
  
  // Seed Investigation 1
  const inv1 = investRepo.create({
    id: 'inv_001',
    name: 'Trading Gateway Timeout Investigation',
    description: 'Investigating sporadic timeout errors in Kalshi trading gateway during market hours',
    status: 'investigating',
    created_by: 'vienna',
  });
  
  // Seed Investigation 2
  const inv2 = investRepo.create({
    id: 'inv_002',
    name: 'Objective Reconciliation Loop Audit',
    description: 'Reviewing watchdog reconciliation patterns for service objective violations',
    status: 'open',
    created_by: 'vienna',
  });
  
  // Seed Incident 1
  const inc1 = incidentRepo.create({
    id: 'inc_001',
    title: 'Kalshi API rate limit exceeded',
    description: 'Trading service hit rate limit during market open, blocked 15 trade attempts',
    severity: 'high',
    status: 'mitigated',
    detected_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
  });
  
  // Seed Incident 2
  const inc2 = incidentRepo.create({
    id: 'inc_002',
    title: 'Runtime database connection pool exhaustion',
    description: 'Vienna runtime hit max connections during bulk artifact ingestion',
    severity: 'medium',
    status: 'investigating',
    detected_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
  });
  
  // Link Investigation 1 → Incident 1
  investRepo.linkIncident(inv1.id, inc1.id);
  
  // Seed Artifact 1
  artifactRepo.create({
    id: 'art_001',
    artifact_type: 'intent_trace',
    content_type: 'application/json',
    size_bytes: 4096,
    storage_path: 'artifacts/traces/intent_trace_20260310_001.json',
    investigation_id: inv1.id,
    created_by: 'vienna',
  });
  
  // Seed Artifact 2
  artifactRepo.create({
    id: 'art_002',
    artifact_type: 'investigation_notes',
    content_type: 'text/markdown',
    size_bytes: 2048,
    storage_path: 'artifacts/notes/inv_001_notes.md',
    investigation_id: inv1.id,
    created_by: 'vienna',
  });
  
  console.log('[Vienna Bootstrap] Seeded:');
  console.log(`  - ${2} investigations`);
  console.log(`  - ${2} incidents`);
  console.log(`  - ${2} artifacts`);
  console.log(`  - ${1} investigation-incident link`);
}
