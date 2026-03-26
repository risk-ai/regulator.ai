import { NextResponse } from "next/server";

/**
 * Try API — Simulated governance pipeline for the /try interactive demo.
 * No backend needed — generates deterministic, realistic pipeline results locally.
 */

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function jitter(base: number, range: number): number {
  return base + Math.round((Math.random() - 0.5) * range);
}

function sha256Fake(): string {
  const chars = "abcdef0123456789";
  return Array.from({ length: 64 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function now(): string {
  return new Date().toISOString();
}

interface PolicyRule {
  rule_id: string;
  name: string;
  conditions: string;
  matched: boolean;
  result?: string;
}

interface PipelineStep {
  step: string;
  label: string;
  status: "success" | "denied" | "skipped";
  duration_ms: number;
  detail: string;
  timestamp: string;
}

interface Warrant {
  warrant_id: string;
  issued_at: string;
  expires_at: string;
  ttl_seconds: number;
  scope: Record<string, unknown>;
  constraints: Record<string, unknown>;
  signature_hash: string;
  issuer: string;
  verified: boolean;
}

interface AuditEntry {
  timestamp: string;
  event: string;
  detail: string;
  immutable: true;
}

interface PipelineResult {
  execution_id: string;
  scenario: string;
  outcome: "approved" | "denied" | "auto-approved";
  tier: string;
  pipeline: PipelineStep[];
  warrant: Warrant | null;
  audit_trail: AuditEntry[];
  policy_rules: PolicyRule[];
  total_duration_ms: number;
}

function buildAudit(pipeline: PipelineStep[]): AuditEntry[] {
  return pipeline
    .filter((s) => s.status !== "skipped")
    .map((s) => ({
      timestamp: s.timestamp,
      event: s.step,
      detail: s.detail,
      immutable: true as const,
    }));
}

function scenarioWireTransfer(): PipelineResult {
  const executionId = uuid();
  const warrantId = uuid();
  const ts = now();
  const pipeline: PipelineStep[] = [
    { step: "intent_received", label: "Intent Received", status: "success", duration_ms: jitter(3, 2), detail: "Agent 'finance-bot-7' requests wire_transfer of $75,000 to account ****4821", timestamp: ts },
    { step: "policy_engine", label: "Policy Engine", status: "success", duration_ms: jitter(14, 6), detail: "Matched rule 'high-value-transfer' — amount $75,000 exceeds $10,000 threshold", timestamp: ts },
    { step: "risk_assessment", label: "Risk Assessment", status: "success", duration_ms: jitter(8, 4), detail: "Risk tier elevated to T2 — multi-party approval required for financial transactions >$10K", timestamp: ts },
    { step: "approval_gate", label: "Approval Gate", status: "success", duration_ms: jitter(1200, 400), detail: "T2 multi-party approval: approved by treasury-lead (1.1s) + compliance-officer (0.3s)", timestamp: ts },
    { step: "warrant_issued", label: "Warrant Issued", status: "success", duration_ms: jitter(5, 2), detail: `Warrant ${warrantId.slice(0, 8)}… issued — scoped to amount ≤$75,000, single-use, 120s TTL`, timestamp: ts },
    { step: "execution", label: "Execution", status: "success", duration_ms: jitter(45, 15), detail: "Wire transfer executed: $75,000 → account ****4821 via SWIFT network", timestamp: ts },
    { step: "verification", label: "Verification", status: "success", duration_ms: jitter(6, 3), detail: "Post-execution verification: amount matches warrant scope ($75,000 ≤ $75,000) ✓", timestamp: ts },
    { step: "audit_logged", label: "Audit Logged", status: "success", duration_ms: jitter(2, 1), detail: "Immutable audit entry appended — tamper-evident hash chain updated", timestamp: ts },
  ];
  const totalMs = pipeline.reduce((sum, s) => sum + s.duration_ms, 0);

  return {
    execution_id: executionId,
    scenario: "wire_transfer",
    outcome: "approved",
    tier: "T2",
    pipeline,
    warrant: {
      warrant_id: warrantId,
      issued_at: ts,
      expires_at: new Date(Date.now() + 120000).toISOString(),
      ttl_seconds: 120,
      scope: { action: "wire_transfer", max_amount: 75000, currency: "USD", destination: "****4821" },
      constraints: { single_use: true, requires_verification: true, network: "SWIFT" },
      signature_hash: sha256Fake(),
      issuer: "vienna-os://policy-engine/v1",
      verified: true,
    },
    audit_trail: buildAudit(pipeline),
    policy_rules: [
      { rule_id: "FIN-001", name: "high-value-transfer", conditions: "amount > $10,000", matched: true, result: "Elevate to T2" },
      { rule_id: "FIN-002", name: "cross-border-check", conditions: "destination.country != origin.country", matched: false },
      { rule_id: "FIN-003", name: "sanctioned-entity", conditions: "destination in sanctions_list", matched: false },
      { rule_id: "GOV-001", name: "multi-party-approval", conditions: "tier >= T2", matched: true, result: "Require 2+ approvers" },
      { rule_id: "AUD-001", name: "mandatory-audit", conditions: "always", matched: true, result: "Append to ledger" },
    ],
    total_duration_ms: totalMs,
  };
}

function scenarioProductionDeploy(): PipelineResult {
  const executionId = uuid();
  const warrantId = uuid();
  const ts = now();
  const hour = new Date().getHours();
  const afterHours = hour >= 18 || hour < 6;

  const pipeline: PipelineStep[] = [
    { step: "intent_received", label: "Intent Received", status: "success", duration_ms: jitter(2, 1), detail: "Agent 'devops-agent-3' requests deploy to production (service: api-gateway v2.4.1)", timestamp: ts },
    { step: "policy_engine", label: "Policy Engine", status: "success", duration_ms: jitter(11, 4), detail: `Matched rule 'prod-deploy-gate'${afterHours ? " + 'after-hours-escalation' (current hour: " + hour + ")" : " — within business hours, standard flow"}`, timestamp: ts },
    { step: "risk_assessment", label: "Risk Assessment", status: "success", duration_ms: jitter(7, 3), detail: afterHours ? "Risk tier escalated to T1+ — after-hours deployment requires senior approval" : "Risk tier: T1 — production deployment requires single approval", timestamp: ts },
    { step: "approval_gate", label: "Approval Gate", status: "success", duration_ms: jitter(800, 300), detail: afterHours ? "T1+ approval: approved by on-call-lead (0.6s) + engineering-director (0.4s)" : "T1 approval: approved by deploy-approver (0.7s)", timestamp: ts },
    { step: "warrant_issued", label: "Warrant Issued", status: "success", duration_ms: jitter(4, 2), detail: `Warrant ${warrantId.slice(0, 8)}… issued — scoped to service 'api-gateway', rollback required within 300s`, timestamp: ts },
    { step: "execution", label: "Execution", status: "success", duration_ms: jitter(2800, 800), detail: "Deployment executed: api-gateway v2.4.1 → production (3 replicas, rolling update)", timestamp: ts },
    { step: "verification", label: "Verification", status: "success", duration_ms: jitter(12, 5), detail: "Health checks passed (3/3 replicas healthy), rollback window active for 300s", timestamp: ts },
    { step: "audit_logged", label: "Audit Logged", status: "success", duration_ms: jitter(2, 1), detail: "Immutable audit entry appended — deployment artifact hash recorded", timestamp: ts },
  ];
  const totalMs = pipeline.reduce((sum, s) => sum + s.duration_ms, 0);

  return {
    execution_id: executionId,
    scenario: "production_deploy",
    outcome: "approved",
    tier: afterHours ? "T1+" : "T1",
    pipeline,
    warrant: {
      warrant_id: warrantId,
      issued_at: ts,
      expires_at: new Date(Date.now() + 300000).toISOString(),
      ttl_seconds: 300,
      scope: { action: "deploy", service: "api-gateway", version: "2.4.1", environment: "production" },
      constraints: { rollback_required: true, rollback_window_seconds: 300, max_replicas: 3, strategy: "rolling" },
      signature_hash: sha256Fake(),
      issuer: "vienna-os://policy-engine/v1",
      verified: true,
    },
    audit_trail: buildAudit(pipeline),
    policy_rules: [
      { rule_id: "DEV-001", name: "prod-deploy-gate", conditions: "environment == 'production'", matched: true, result: "Require T1 approval" },
      { rule_id: "DEV-002", name: "after-hours-escalation", conditions: "hour >= 18 || hour < 6", matched: afterHours, result: afterHours ? "Escalate to T1+" : undefined },
      { rule_id: "DEV-003", name: "rollback-constraint", conditions: "environment == 'production'", matched: true, result: "Mandate rollback window" },
      { rule_id: "DEV-004", name: "canary-required", conditions: "replicas > 10", matched: false },
      { rule_id: "AUD-001", name: "mandatory-audit", conditions: "always", matched: true, result: "Append to ledger" },
    ],
    total_duration_ms: totalMs,
  };
}

function scenarioPatientRecord(): PipelineResult {
  const executionId = uuid();
  const warrantId = uuid();
  const ts = now();
  const patientId = "PT-" + Math.floor(100000 + Math.random() * 900000);

  const pipeline: PipelineStep[] = [
    { step: "intent_received", label: "Intent Received", status: "success", duration_ms: jitter(3, 1), detail: `Agent 'ehr-agent-12' requests update to patient record ${patientId} (medication change)`, timestamp: ts },
    { step: "policy_engine", label: "Policy Engine", status: "success", duration_ms: jitter(16, 5), detail: "Matched rule 'phi-access-control' — HIPAA-regulated data requires T1 + scoped warrant", timestamp: ts },
    { step: "risk_assessment", label: "Risk Assessment", status: "success", duration_ms: jitter(9, 3), detail: "Risk tier: T1 — PHI modification with HIPAA compliance requirements", timestamp: ts },
    { step: "approval_gate", label: "Approval Gate", status: "success", duration_ms: jitter(600, 200), detail: "T1 approval: approved by attending-physician (0.5s) — HIPAA consent verified", timestamp: ts },
    { step: "warrant_issued", label: "Warrant Issued", status: "success", duration_ms: jitter(4, 2), detail: `Warrant ${warrantId.slice(0, 8)}… issued — scoped to patient ${patientId} ONLY, 60s TTL, no bulk access`, timestamp: ts },
    { step: "execution", label: "Execution", status: "success", duration_ms: jitter(22, 8), detail: `Patient ${patientId} record updated: medication list modified (encrypted at rest)`, timestamp: ts },
    { step: "verification", label: "Verification", status: "success", duration_ms: jitter(5, 2), detail: `Verification: warrant scope confirmed (single patient ${patientId}), TTL within bounds ✓`, timestamp: ts },
    { step: "audit_logged", label: "Audit Logged", status: "success", duration_ms: jitter(3, 1), detail: "HIPAA audit entry appended — access log includes agent ID, timestamp, fields modified", timestamp: ts },
  ];
  const totalMs = pipeline.reduce((sum, s) => sum + s.duration_ms, 0);

  return {
    execution_id: executionId,
    scenario: "patient_record_update",
    outcome: "approved",
    tier: "T1",
    pipeline,
    warrant: {
      warrant_id: warrantId,
      issued_at: ts,
      expires_at: new Date(Date.now() + 60000).toISOString(),
      ttl_seconds: 60,
      scope: { action: "update_record", patient_id: patientId, fields: ["medications"], facility: "memorial-general" },
      constraints: { single_patient_only: true, no_bulk_access: true, hipaa_compliant: true, encryption: "AES-256-GCM" },
      signature_hash: sha256Fake(),
      issuer: "vienna-os://policy-engine/v1",
      verified: true,
    },
    audit_trail: buildAudit(pipeline),
    policy_rules: [
      { rule_id: "HIP-001", name: "phi-access-control", conditions: "data_type == 'PHI'", matched: true, result: "Require T1 + HIPAA scoping" },
      { rule_id: "HIP-002", name: "minimum-necessary", conditions: "PHI access", matched: true, result: "Scope to specific fields only" },
      { rule_id: "HIP-003", name: "bulk-access-block", conditions: "record_count > 1", matched: false },
      { rule_id: "HIP-004", name: "consent-verification", conditions: "PHI modification", matched: true, result: "Verify patient consent on file" },
      { rule_id: "AUD-001", name: "mandatory-audit", conditions: "always", matched: true, result: "Append to HIPAA audit ledger" },
    ],
    total_duration_ms: totalMs,
  };
}

function scenarioDenied(): PipelineResult {
  const executionId = uuid();
  const ts = now();

  const pipeline: PipelineStep[] = [
    { step: "intent_received", label: "Intent Received", status: "success", duration_ms: jitter(2, 1), detail: "Agent 'analytics-bot-9' requests access to resource '/admin/users/export' (bulk user data)", timestamp: ts },
    { step: "policy_engine", label: "Policy Engine", status: "denied", duration_ms: jitter(18, 5), detail: "DENIED — agent 'analytics-bot-9' scope is 'analytics:read', requested resource requires 'admin:export'", timestamp: ts },
    { step: "risk_assessment", label: "Risk Assessment", status: "denied", duration_ms: jitter(4, 2), detail: "Scope violation detected — trust score reduced from 0.85 → 0.62 for agent 'analytics-bot-9'", timestamp: ts },
    { step: "approval_gate", label: "Approval Gate", status: "skipped", duration_ms: 0, detail: "Skipped — action denied at policy evaluation", timestamp: ts },
    { step: "warrant_issued", label: "Warrant Issued", status: "skipped", duration_ms: 0, detail: "No warrant issued — action denied", timestamp: ts },
    { step: "execution", label: "Execution", status: "skipped", duration_ms: 0, detail: "Execution blocked — policy violation", timestamp: ts },
    { step: "verification", label: "Verification", status: "skipped", duration_ms: 0, detail: "N/A", timestamp: ts },
    { step: "audit_logged", label: "Audit Logged", status: "success", duration_ms: jitter(2, 1), detail: "ALERT: Scope violation logged — security team notified, agent flagged for review", timestamp: ts },
  ];
  const totalMs = pipeline.reduce((sum, s) => sum + s.duration_ms, 0);

  return {
    execution_id: executionId,
    scenario: "denied_scope_creep",
    outcome: "denied",
    tier: "DENIED",
    pipeline,
    warrant: null,
    audit_trail: buildAudit(pipeline),
    policy_rules: [
      { rule_id: "SEC-001", name: "scope-boundary-check", conditions: "requested_scope ⊆ agent_scope", matched: true, result: "VIOLATION — scope mismatch detected" },
      { rule_id: "SEC-002", name: "trust-score-penalty", conditions: "scope_violation == true", matched: true, result: "Reduce trust score by 0.23" },
      { rule_id: "SEC-003", name: "alert-security-team", conditions: "scope_violation == true", matched: true, result: "Dispatch alert to security channel" },
      { rule_id: "SEC-004", name: "auto-quarantine", conditions: "trust_score < 0.5", matched: false },
      { rule_id: "AUD-001", name: "mandatory-audit", conditions: "always", matched: true, result: "Append violation to ledger" },
    ],
    total_duration_ms: totalMs,
  };
}

function scenarioAutoApproved(): PipelineResult {
  const executionId = uuid();
  const warrantId = uuid();
  const ts = now();

  const pipeline: PipelineStep[] = [
    { step: "intent_received", label: "Intent Received", status: "success", duration_ms: jitter(2, 1), detail: "Agent 'dashboard-agent-1' requests read on '/metrics/revenue/q4' (read-only query)", timestamp: ts },
    { step: "policy_engine", label: "Policy Engine", status: "success", duration_ms: jitter(6, 3), detail: "Matched rule 'read-only-auto-approve' — T0 action, no approval required", timestamp: ts },
    { step: "risk_assessment", label: "Risk Assessment", status: "success", duration_ms: jitter(3, 1), detail: "Risk tier: T0 — read-only, no side effects, auto-approval eligible", timestamp: ts },
    { step: "approval_gate", label: "Approval Gate", status: "success", duration_ms: jitter(1, 1), detail: "Auto-approved — T0 actions bypass approval gate (0ms human latency)", timestamp: ts },
    { step: "warrant_issued", label: "Warrant Issued", status: "success", duration_ms: jitter(2, 1), detail: `Ephemeral warrant ${warrantId.slice(0, 8)}… — read-only, 30s TTL, single-use`, timestamp: ts },
    { step: "execution", label: "Execution", status: "success", duration_ms: jitter(8, 3), detail: "Query executed: SELECT revenue FROM metrics WHERE quarter = 'Q4' (12 rows returned)", timestamp: ts },
    { step: "verification", label: "Verification", status: "success", duration_ms: jitter(2, 1), detail: "Read-only verification: no mutations detected ✓", timestamp: ts },
    { step: "audit_logged", label: "Audit Logged", status: "success", duration_ms: jitter(1, 1), detail: "Lightweight audit entry appended (T0 compact format)", timestamp: ts },
  ];
  const totalMs = pipeline.reduce((sum, s) => sum + s.duration_ms, 0);

  return {
    execution_id: executionId,
    scenario: "auto_approved_read",
    outcome: "auto-approved",
    tier: "T0",
    pipeline,
    warrant: {
      warrant_id: warrantId,
      issued_at: ts,
      expires_at: new Date(Date.now() + 30000).toISOString(),
      ttl_seconds: 30,
      scope: { action: "read", resource: "/metrics/revenue/q4", fields: ["revenue", "quarter"] },
      constraints: { read_only: true, single_use: true, no_mutations: true },
      signature_hash: sha256Fake(),
      issuer: "vienna-os://policy-engine/v1",
      verified: true,
    },
    audit_trail: buildAudit(pipeline),
    policy_rules: [
      { rule_id: "ACC-001", name: "read-only-auto-approve", conditions: "action == 'read' && no_side_effects", matched: true, result: "Auto-approve (T0)" },
      { rule_id: "ACC-002", name: "sensitive-data-check", conditions: "resource in sensitive_list", matched: false },
      { rule_id: "AUD-001", name: "mandatory-audit", conditions: "always", matched: true, result: "Append to ledger (compact)" },
    ],
    total_duration_ms: totalMs,
  };
}

function scenarioCustom(body: {
  action_name?: string;
  agent_id?: string;
  amount?: number;
  parameters?: Record<string, string>;
}): PipelineResult {
  const executionId = uuid();
  const ts = now();
  const actionName = body.action_name || "unknown_action";
  const agentId = body.agent_id || "custom-agent";
  const amount = body.amount || 0;
  const hour = new Date().getHours();

  // Evaluate against simulated policies
  let tier = "T1";
  let outcome: "approved" | "denied" | "auto-approved" = "approved";
  let policyDetail = "Standard T1 approval flow";
  let approvalDetail = "T1 approval: approved by designated-approver (0.8s)";
  const matchedRules: PolicyRule[] = [];
  let denyReason = "";

  // Check: untrusted agent → deny
  if (agentId === "untrusted-agent") {
    outcome = "denied";
    tier = "DENIED";
    denyReason = `Agent '${agentId}' is not in the authorized agent registry — action denied`;
    matchedRules.push({ rule_id: "SEC-001", name: "agent-registry-check", conditions: "agent_id in authorized_agents", matched: true, result: "DENIED — agent not registered" });
  }
  // Check: destructive action → T2
  else if (/delete|drop/i.test(actionName)) {
    tier = "T2";
    policyDetail = `Matched rule 'irreversible-action' — '${actionName}' contains destructive keyword`;
    approvalDetail = "T2 multi-party approval: approved by data-owner (0.9s) + compliance-officer (0.5s)";
    matchedRules.push({ rule_id: "SEC-005", name: "irreversible-action", conditions: "action contains 'delete' or 'drop'", matched: true, result: "Elevate to T2, flag irreversible" });
  }
  // Check: amount > $10K → T2
  else if (amount > 10000) {
    tier = "T2";
    policyDetail = `Matched rule 'high-value-threshold' — amount $${amount.toLocaleString()} exceeds $10,000`;
    approvalDetail = "T2 multi-party approval: approved by treasury-lead (1.0s) + manager (0.4s)";
    matchedRules.push({ rule_id: "FIN-001", name: "high-value-threshold", conditions: "amount > $10,000", matched: true, result: "Elevate to T2" });
  }
  // Check: deploy after hours → T1+
  else if (/deploy/i.test(actionName) && (hour >= 18 || hour < 6)) {
    tier = "T1+";
    policyDetail = `Matched rule 'after-hours-deploy' — deploy at hour ${hour}, requires escalation`;
    approvalDetail = "T1+ approval: approved by on-call-lead (0.7s)";
    matchedRules.push({ rule_id: "DEV-002", name: "after-hours-deploy", conditions: "action contains 'deploy' && (hour >= 18 || hour < 6)", matched: true, result: "Escalate to T1+" });
  }
  // Check: read-only → T0 auto-approve
  else if (/read|get|list|query|fetch/i.test(actionName) && amount === 0) {
    tier = "T0";
    outcome = "auto-approved";
    policyDetail = `Matched rule 'read-only-auto-approve' — '${actionName}' is non-mutating`;
    matchedRules.push({ rule_id: "ACC-001", name: "read-only-auto-approve", conditions: "action is read-only && no financial impact", matched: true, result: "Auto-approve (T0)" });
  }

  // Default rules
  matchedRules.push({ rule_id: "GOV-010", name: "default-governance", conditions: "all actions", matched: true, result: `Apply ${tier} governance` });
  matchedRules.push({ rule_id: "AUD-001", name: "mandatory-audit", conditions: "always", matched: true, result: "Append to ledger" });

  const denied = outcome === "denied";
  const warrantId = denied ? null : uuid();

  const pipeline: PipelineStep[] = [
    { step: "intent_received", label: "Intent Received", status: "success", duration_ms: jitter(3, 1), detail: `Agent '${agentId}' requests '${actionName}'${amount ? ` (amount: $${amount.toLocaleString()})` : ""}`, timestamp: ts },
    { step: "policy_engine", label: "Policy Engine", status: denied ? "denied" : "success", duration_ms: jitter(13, 5), detail: denied ? denyReason : policyDetail, timestamp: ts },
    { step: "risk_assessment", label: "Risk Assessment", status: denied ? "denied" : "success", duration_ms: jitter(7, 3), detail: denied ? "Action denied at policy — no risk assessment needed" : `Risk tier: ${tier}`, timestamp: ts },
    { step: "approval_gate", label: "Approval Gate", status: denied ? "skipped" : "success", duration_ms: denied ? 0 : (outcome === "auto-approved" ? jitter(1, 1) : jitter(900, 300)), detail: denied ? "Skipped — action denied" : (outcome === "auto-approved" ? "Auto-approved — T0 bypass" : approvalDetail), timestamp: ts },
    { step: "warrant_issued", label: "Warrant Issued", status: denied ? "skipped" : "success", duration_ms: denied ? 0 : jitter(4, 2), detail: denied ? "No warrant issued" : `Warrant ${warrantId!.slice(0, 8)}… issued`, timestamp: ts },
    { step: "execution", label: "Execution", status: denied ? "skipped" : "success", duration_ms: denied ? 0 : jitter(30, 15), detail: denied ? "Execution blocked" : `'${actionName}' executed successfully`, timestamp: ts },
    { step: "verification", label: "Verification", status: denied ? "skipped" : "success", duration_ms: denied ? 0 : jitter(5, 2), detail: denied ? "N/A" : "Post-execution verification passed ✓", timestamp: ts },
    { step: "audit_logged", label: "Audit Logged", status: "success", duration_ms: jitter(2, 1), detail: denied ? "Denial event logged — agent flagged" : "Audit entry appended", timestamp: ts },
  ];
  const totalMs = pipeline.reduce((sum, s) => sum + s.duration_ms, 0);

  return {
    execution_id: executionId,
    scenario: "custom",
    outcome,
    tier,
    pipeline,
    warrant: warrantId
      ? {
          warrant_id: warrantId,
          issued_at: ts,
          expires_at: new Date(Date.now() + 120000).toISOString(),
          ttl_seconds: 120,
          scope: { action: actionName, agent: agentId, ...(amount ? { max_amount: amount } : {}), ...(body.parameters || {}) },
          constraints: { single_use: true, requires_verification: true, ...(tier === "T2" ? { multi_party_approved: true } : {}) },
          signature_hash: sha256Fake(),
          issuer: "vienna-os://policy-engine/v1",
          verified: true,
        }
      : null,
    audit_trail: buildAudit(pipeline),
    policy_rules: matchedRules,
    total_duration_ms: totalMs,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { scenario } = body;

    let result: PipelineResult;

    switch (scenario) {
      case "wire_transfer":
        result = scenarioWireTransfer();
        break;
      case "production_deploy":
        result = scenarioProductionDeploy();
        break;
      case "patient_record":
        result = scenarioPatientRecord();
        break;
      case "denied_scope_creep":
        result = scenarioDenied();
        break;
      case "auto_approved_read":
        result = scenarioAutoApproved();
        break;
      case "custom":
        result = scenarioCustom(body);
        break;
      default:
        return NextResponse.json({ error: "Unknown scenario" }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Try API error:", error);
    return NextResponse.json(
      { error: "Pipeline simulation failed", code: "SIM_ERROR" },
      { status: 500 }
    );
  }
}
