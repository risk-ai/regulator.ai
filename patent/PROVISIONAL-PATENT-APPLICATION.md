# PROVISIONAL PATENT APPLICATION

## UNITED STATES PATENT AND TRADEMARK OFFICE

---

### TITLE OF INVENTION

**System and Method for Governed Execution of Autonomous Actions Using Cryptographically Constrained Authorization**

---

### INVENTOR(S)

**Maxwell Anderson**
1150 Tarpon Center Drive, Apt 709,
Venice, Florida, 34285
Citizenship: United States

---

### APPLICANT

Maxwell Anderson
1150 Tarpon Center Drive, Apt 709,
Venice, Florida, 34285

---

## SPECIFICATION

### FIELD OF THE INVENTION

The present invention relates generally to computer security and artificial intelligence systems, and more specifically to systems and methods for governing the execution of autonomous AI agent actions through a cryptographic execution control system comprising machine-verifiable capability tokens enforced at an execution isolation boundary, with post-execution trace verification against pre-authorized constraints.

### BACKGROUND OF THE INVENTION

The rapid proliferation of autonomous AI agent systems—software entities capable of reasoning, planning, and taking real-world actions—has created an unprecedented governance challenge. Modern AI agent frameworks (including but not limited to LangChain, CrewAI, AutoGen, Google Agent Development Kit, and OpenAI Agents SDK) enable agents to execute code, manage infrastructure, conduct financial transactions, access sensitive data, and interact with external services with minimal or no human oversight.

Current approaches to AI agent governance suffer from significant limitations:

1. **No pre-execution authorization.** Existing systems detect problems after execution rather than preventing unauthorized actions before they occur. Agents execute freely, and monitoring systems observe outcomes retrospectively.

2. **Binary access control.** Traditional Role-Based Access Control (RBAC) and OAuth-based systems provide binary allow/deny decisions without gradation for risk levels, temporal constraints, or scope limitations specific to a single action.

3. **No cryptographic proof of authorization.** Existing approval workflows (human-in-the-loop, supervisor approval) lack tamper-evident, verifiable proof that a specific action was authorized by a specific authority under specific constraints. Audit trails rely on mutable database records rather than cryptographic attestation.

4. **No execution isolation.** In existing systems, the AI agent itself invokes APIs, executes commands, and accesses resources directly. No architectural boundary prevents a compromised, jailbroken, or manipulated agent from bypassing governance controls, because the agent possesses the execution capability itself.

5. **No post-execution scope verification.** Even when authorization is granted, no existing system verifies that the executed action matched the authorized scope by comparing a structured execution trace against the pre-authorized constraints. An agent authorized to "deploy service A" could deploy service B without detection.

6. **Framework lock-in.** Existing governance tools are tightly coupled to specific agent frameworks, requiring separate governance implementations for each framework used within an enterprise.

What is needed is a framework-agnostic governance control plane that interposes a cryptographic execution control system between agent intent and action execution, providing risk-tiered authorization, cryptographically bound capability tokens with scope constraints, an execution isolation layer that prevents agent-side invocation, post-execution trace verification, and an immutable audit trail.

### SUMMARY OF THE INVENTION

In certain embodiments, the system is implemented as an operating layer referred to as "Vienna OS," representing a governed execution runtime for autonomous systems.

The present invention provides a governed execution system for untrusted autonomous execution actors (including but not limited to AI agents, automated scripts, API clients, and autonomous devices) comprising:

(a) An **Intent Gateway** that receives structured action proposals ("intents") from untrusted autonomous execution actors across heterogeneous agent frameworks, normalizing them into a canonical format for governance evaluation;

(b) A **Policy Engine** that evaluates each intent against a configurable set of governance policies, including condition-based rules, natural language-defined policies, and AI-suggested policies derived from behavioral pattern analysis;

(c) A **Risk Classification System** that assigns each intent to one of a plurality of risk tiers (T0 through T3 in the preferred embodiment), each tier having progressively stricter authorization requirements, including the number of human approvers required, the maximum capability token time-to-live, and the verification depth;

(d) A **Warrant Authority** that issues cryptographically bound capability tokens ("warrants") using one or more digital signature schemes (HMAC-SHA256, asymmetric signatures such as RSA or ECDSA, JWT-based tokens, or hardware-backed keys via TPM or HSM), each warrant constituting a bounded execution authority that specifies: the authorized action scope, parameter constraints, time-to-live, the identity of the authorizing party, a chain of approval identifiers (for multi-party authorization), and a rollback plan (for high-risk tiers);

(e) An **Execution Isolation Layer** comprising a trusted execution intermediary ("Execution Router") that performs authorized actions on behalf of the requesting agent—critically, the agent itself is architecturally prevented from invoking execution endpoints directly, and enforcement occurs via cryptographic validation at the execution boundary, not merely through policy or convention;

(f) A **Verification Engine** that performs post-execution trace analysis by comparing a structured execution trace (comprising resource access logs, parameter values, timing data, and output artifacts) against the pre-authorized constraints encoded in the warrant, detecting scope drift, timing violations, and output deviations;

(g) An **Immutable Audit Ledger** that records every step of the governance lifecycle with tamper-evident entries, including warrant signatures, approval chains, execution traces, and verification outcomes;

(h) A **Behavioral Anomaly Detection System** that maintains per-agent statistical baselines and detects deviations exceeding configurable thresholds (e.g., 2 standard deviations), including velocity anomalies, scope anomalies, error rate spikes, temporal anomalies, and action pattern breaks;

(i) A **Chaos Simulation Engine** that validates governance policy effectiveness by simulating adversarial agent behaviors including intent flooding, scope escalation, budget exhaustion, expired warrant exploitation, and parameter tampering.

### DETAILED DESCRIPTION OF THE PREFERRED EMBODIMENT

#### 1. System Architecture Overview

The governed execution system ("Vienna OS" in the preferred embodiment) operates as a middleware layer positioned between untrusted autonomous execution actors (hereinafter "execution actors," encompassing AI agent runtimes, automated scripts, API clients, and autonomous devices) and execution endpoints. The system is framework-agnostic, communicating with agents through a standardized REST API and client SDKs.

The system implements a **cryptographic execution control architecture** in which:
- Agents may only propose actions (intents); they cannot invoke execution endpoints
- All execution is performed by a trusted execution intermediary that validates a machine-verifiable authorization token at the execution boundary
- Post-execution verification compares the actual execution trace against pre-authorized constraints
- Every authorization and execution event is cryptographically attested in an immutable ledger

This architecture is distinguished from conventional authorization systems (OAuth, RBAC, API keys) in that authorization is not merely a gate check at the point of request, but a **cryptographically bound capability token that constrains the execution itself**, and the execution is performed by an independent trusted intermediary rather than the requesting entity.

**FIG. 1** illustrates the high-level system architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    AI Agent Runtime                          │
│  (LangChain, CrewAI, AutoGen, OpenClaw, custom, etc.)      │
│                                                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Agent can ONLY: propose intents via Intent API      │    │
│  │  Agent CANNOT: invoke execution endpoints directly   │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────┬──────────────────────────────────────┘
                       │ Intent (structured action proposal)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              CRYPTOGRAPHIC EXECUTION CONTROL LAYER            │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │
│  │  Intent   │→ │  Policy  │→ │  Risk    │→ │  Approval  │  │
│  │  Gateway  │  │  Engine  │  │ Classify │  │   Gate     │  │
│  └──────────┘  └──────────┘  └──────────┘  └──────┬─────┘  │
│                                                     │        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────▼─────┐  │
│  │  Audit   │← │  Verify  │← │ Execute  │← │  Warrant   │  │
│  │  Ledger  │  │  Engine  │  │  Router  │  │ Authority  │  │
│  └──────────┘  └──────────┘  └──────────┘  └────────────┘  │
│                                                               │
│  ┌──────────────────┐  ┌────────────────────────────────┐   │
│  │ Anomaly Detector │  │ Chaos Simulation Engine        │   │
│  └──────────────────┘  └────────────────────────────────┘   │
│                                                               │
│  ════════════════ EXECUTION ISOLATION BOUNDARY ════════════  │
└──────────────────────┬──────────────────────────────────────┘
                       │ Warranted Execution (verified token)
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Execution Endpoints                              │
│  (APIs, databases, infrastructure, external services)        │
└─────────────────────────────────────────────────────────────┘
```

The architecture illustrated in FIG. 1 is exemplary and not limiting; variations in component arrangement, communication protocols, and implementation details may be employed without departing from the scope of the invention.

#### 2. Intent Gateway

The Intent Gateway receives action proposals from AI agents. Unlike traditional API gateways that forward requests, the Intent Gateway intercepts and normalizes agent action proposals into a canonical intent format:

```json
{
  "intent_id": "int_20260326_143207_a7c3f1",
  "agent_id": "langchain-agent-01",
  "framework": "langchain",
  "action": "deploy_service",
  "params": {
    "service": "api-gateway",
    "version": "2.4.1",
    "environment": "production"
  },
  "objective": "Deploy API gateway v2.4.1 to production",
  "timestamp": "2026-03-26T14:32:07Z"
}
```

The gateway validates the intent structure, authenticates the requesting agent (via API key with HMAC request signing), and assigns a unique intent identifier for lifecycle tracking. Critically, the Intent Gateway is the **only interface available to agents**—no alternative path to execution endpoints exists within the system architecture.

#### 3. Policy Engine with Natural Language Input

The Policy Engine evaluates intents against a configurable rule set. In the preferred embodiment, policies may be defined through three mechanisms:

**(a) Structured rules:** JSON-encoded conditions with operators (equals, greater-than, contains, matches, etc.) and actions (approve, deny, escalate, throttle).

**(b) Natural language input:** A natural language processing module converts human-readable policy descriptions into structured rules. For example, the input "Block wire transfers over $10,000 after hours" is parsed into:

```json
{
  "name": "after-hours-high-value-block",
  "conditions": [
    { "field": "action", "operator": "contains", "value": "wire_transfer" },
    { "field": "amount", "operator": "gt", "value": 10000 },
    { "field": "time.hour", "operator": "gte", "value": 18 }
  ],
  "action_on_match": "deny"
}
```

**(c) AI-suggested policies:** A pattern analysis engine monitors action logs and suggests governance rules based on detected patterns, including: after-hours activity spikes, high-frequency agent behavior, repeated denials (scope creep), ungoverned high-risk actions, approver bottlenecks, and missing post-execution verification.

The Policy Engine supports policy versioning (draft vs. published states), evaluation caching (to avoid redundant evaluation of identical intents), and conflict detection (warning when multiple policies would produce contradictory results for the same action).

#### 4. Risk Classification System

Each intent is assigned to a risk tier based on the action type, parameters, and contextual factors:

| Tier | Classification | Approval Requirement | Maximum Warrant TTL |
|------|---------------|---------------------|-------------------|
| T0 | Informational | Automatic (no approval) | 60 minutes |
| T1 | Low Risk | Policy-based automatic | 30 minutes |
| T2 | Medium Risk | Single human approval | 15 minutes |
| T3 | High Risk | Multi-party approval (≥2) | 5 minutes |

The risk classification considers:
- Action category (read, write, deploy, delete, financial)
- Parameter values (amount thresholds, scope breadth)
- Temporal context (business hours vs. after-hours)
- Agent trust score (derived from behavioral history)
- Escalation patterns (e.g., `rm -rf` in any parameter escalates to T3)

The inverse relationship between risk tier and warrant TTL is a key design principle: higher-risk actions receive shorter-lived authorization, limiting the window of potential damage.

#### 5. Cryptographic Warrant Authority — Capability Token Issuance

The Warrant Authority is the core novel component of the invention. Upon approval (automatic for T0/T1, human for T2/T3), it issues a **cryptographically bound capability token** ("warrant")—a machine-verifiable authorization token that constitutes bounded execution authority over a specific scope for a specific duration.

The warrant is distinguished from conventional authorization tokens (OAuth access tokens, API keys, JWTs used for identity) in that it:
- **Binds scope constraints cryptographically**: the authorized actions, parameter bounds, and resource limits are integral to the cryptographic signature, not merely metadata
- **Constitutes execution authority**: the warrant is not merely proof of identity or permission, but the mechanism by which execution is unlocked at the isolation boundary
- **Is verified at the execution boundary**: the Execution Router validates the warrant immediately before performing any action, making it impossible to execute without a valid token

```json
{
  "warrant_id": "wrt_20260326_143207_a7c3f1",
  "version": 2,
  "issued_by": "operator:jane",
  "issued_at": "2026-03-26T14:32:07Z",
  "expires_at": "2026-03-26T14:37:07Z",
  "risk_tier": "T2",
  
  "truth_snapshot_id": "snap_abc123",
  "truth_snapshot_hash": "sha256:9f86d08...",
  "plan_id": "plan_xyz",
  "approval_ids": ["apr_001", "apr_002"],
  
  "objective": "Deploy API gateway v2.4.1 to production",
  "allowed_actions": ["deploy_service"],
  "forbidden_actions": ["delete_service", "modify_database"],
  "constraints": {
    "service": { "allowed": ["api-gateway"] },
    "replicas": { "max": 3 },
    "rollback_window": { "min": 300 }
  },
  
  "justification": "Scheduled release per sprint plan",
  "rollback_plan": "Revert to v2.3.9 via blue-green switch",
  
  "signature": "hmac-sha256:7f3a2b1ce8d44a9fb2c1...",
  "signature_algorithm": "hmac-sha256"
}
```

**Warrant Signing Process:**

The signature is computed over a canonical representation of all authorization-relevant fields:

```
payload = warrant_id | issued_by | issued_at | expires_at | risk_tier |
          truth_snapshot_id | truth_snapshot_hash | plan_id |
          JSON(approval_ids) | objective | JSON(allowed_actions) |
          JSON(forbidden_actions) | JSON(constraints)

signature = Sign(signing_key, payload, algorithm)
```

Any modification to any authorization-relevant field invalidates the signature. The signing key is held exclusively by the Warrant Authority and is never exposed to agents or operators.

**Alternative Cryptographic Implementations:**

The warrant signing mechanism is not limited to a single algorithm. The system supports multiple signature schemes to accommodate varying security requirements and deployment environments:

1. **HMAC-SHA256 (symmetric):** The preferred embodiment uses HMAC-SHA256 for high-performance signing and verification in single-deployment environments where the Warrant Authority and Execution Router share a key securely.

2. **Asymmetric signatures (RSA, ECDSA, Ed25519):** For distributed deployments where the Execution Router operates on separate infrastructure from the Warrant Authority, asymmetric signing enables verification without sharing the private signing key. The Warrant Authority signs with its private key; Execution Routers verify with the corresponding public key.

3. **JWT-based tokens:** The warrant may be encoded as a JSON Web Token (JWT) with custom claims corresponding to the warrant fields. This enables interoperability with existing identity and authorization infrastructure that supports JWT verification.

4. **Hardware-backed keys (TPM, HSM):** For high-security deployments, the signing key may be stored in a Trusted Platform Module (TPM) or Hardware Security Module (HSM), ensuring the key material is never exposed in software memory. The Warrant Authority issues signing requests to the hardware module, which returns the signature without exposing the key.

5. **Distributed signing (threshold signatures):** For T3 (highest risk) warrants requiring multi-party authorization, the system may employ threshold signature schemes (e.g., Shamir's Secret Sharing, multi-party ECDSA) where no single party possesses the complete signing key. A quorum of k-of-n approvers must contribute key shares to produce a valid warrant signature.

**Key warrant properties:**

- **Cryptographically bound scope:** The warrant explicitly enumerates allowed actions and parameter constraints, and these constraints are integral to the cryptographic signature—not merely advisory metadata.
- **Time-limited:** Each warrant has a TTL inversely proportional to its risk tier. Expired warrants are automatically invalidated.
- **Single-use or limited-use:** Warrants may specify usage limits.
- **Tamper-evident:** Cryptographic signature detects any post-issuance modification. Tamper detection triggers a critical security event.
- **Auditable chain:** For T3 warrants, the full chain of approval identifiers is embedded, enabling forensic reconstruction of the authorization decision.

#### 6. Execution Isolation Layer

The **Execution Isolation Layer** is a fundamental architectural component that enforces the separation between agent reasoning and action execution. This is not merely a software convention or policy—it is an **architectural enforcement boundary** that prevents agent-side invocation of execution endpoints.

**Isolation Enforcement Mechanisms:**

1. **Network-level isolation:** In the preferred embodiment, AI agent runtimes operate in a network segment that has no direct connectivity to execution endpoints (APIs, databases, infrastructure controllers). The only network path available to agents is the Intent API endpoint exposed by the Intent Gateway. Execution endpoints are reachable only from the Execution Router's network segment.

2. **Credential isolation:** Execution credentials (API keys, database passwords, service account tokens, SSH keys) are held exclusively by the Execution Router. Agents never possess, observe, or transit execution credentials. The agent authentication mechanism (Intent API key) is entirely separate from execution credentials.

3. **API surface restriction:** The Intent Gateway exposes a limited API surface to agents: submit intent, query intent status, and receive execution results. No endpoint for direct action invocation exists in the agent-facing API.

**Why this matters:**

In conventional AI agent systems, a compromised or jailbroken agent can bypass governance controls because the agent itself holds execution credentials and has network access to execution endpoints. In the present invention, even a fully compromised agent—one whose reasoning has been manipulated through prompt injection, jailbreaking, or adversarial inputs—cannot execute unauthorized actions because:
- It has no execution credentials
- It has no network path to execution endpoints
- The only path to execution requires a valid, unexpired, cryptographically signed warrant verified by the independent Execution Router

This represents a fundamental shift from **trust-based governance** (trusting the agent to obey rules) to **enforcement-based governance** (architecturally preventing the agent from violating rules).

#### 7. Execution Router (Trusted Execution Intermediary)

The Execution Router is the trusted execution intermediary that performs authorized actions on behalf of requesting agents. It is the only component with access to execution endpoints and credentials.

The Execution Router:
1. Receives the warranted action
2. Re-verifies the warrant signature using the appropriate cryptographic algorithm
3. Verifies warrant expiration (rejecting expired warrants)
4. Validates that the requested action falls within the warrant's allowed_actions
5. Checks parameter constraints against the warrant's bounds
6. **Initiates execution tracing** (begins recording the execution trace)
7. Executes the action against the target endpoint using the Router's own credentials
8. **Terminates execution tracing** (finalizes the execution trace record)
9. Passes the execution trace and result to the Verification Engine
10. Returns the sanitized result to the requesting agent

Tampered or expired warrants result in execution denial and emission of a critical security event to the audit ledger and anomaly detection system.

#### 8. Execution Trace Model and Post-Execution Verification

A key innovation of the present invention is the **structured execution trace** that enables post-execution verification of warrant compliance. Unlike conventional audit logs that merely record that an action occurred, the execution trace captures sufficient detail to determine whether the execution conformed to the pre-authorized constraints.

**Execution Trace Structure:**

```json
{
  "trace_id": "trc_20260326_143208_b9d4e2",
  "warrant_id": "wrt_20260326_143207_a7c3f1",
  "started_at": "2026-03-26T14:32:08.001Z",
  "completed_at": "2026-03-26T14:32:11.847Z",
  "duration_ms": 3846,
  
  "resources_accessed": [
    {
      "type": "api_endpoint",
      "identifier": "https://k8s.internal/apis/apps/v1/deployments",
      "method": "POST",
      "parameters": {
        "namespace": "production",
        "name": "api-gateway",
        "image": "registry.internal/api-gateway:2.4.1",
        "replicas": 2
      }
    }
  ],
  
  "resources_not_in_scope": [],
  
  "side_effects": [
    {
      "type": "deployment_created",
      "resource": "deployment/api-gateway",
      "namespace": "production"
    }
  ],
  
  "output": {
    "status": "success",
    "deployment_id": "dep-a7c3f1",
    "replicas_ready": 2
  },
  
  "network_calls": [
    {
      "destination": "k8s.internal:443",
      "method": "POST",
      "path": "/apis/apps/v1/namespaces/production/deployments",
      "response_code": 201,
      "timestamp": "2026-03-26T14:32:09.123Z"
    }
  ]
}
```

**Verification Process:**

The Verification Engine performs four checks by comparing the execution trace against the warrant:

**(a) Scope drift detection:** The engine compares every resource accessed during execution (from the trace's `resources_accessed` array) against the warrant's `allowed_actions` and `constraints`. If the execution accessed any resource not specified in the warrant's scope, or invoked any action listed in `forbidden_actions`, a scope drift event is emitted. The comparison is performed at the level of: resource type, resource identifier, HTTP method, and parameter values.

**(b) Parameter constraint verification:** The engine compares parameter values from the trace against the warrant's `constraints` bounds. For example, if the warrant specifies `"replicas": { "max": 3 }` and the trace shows `"replicas": 2`, the check passes. If the trace showed `"replicas": 5`, a constraint violation is emitted.

**(c) Timing verification:** The engine confirms the execution completed within the warrant's TTL. The trace's `completed_at` timestamp is compared against the warrant's `expires_at`. Late executions are flagged as timing violations.

**(d) Output validation:** If the warrant's constraints specify an expected output schema or success criteria, the execution result is validated against it.

**Drift Classification:**

Verification failures are classified by severity:
- **Hard drift:** Execution accessed forbidden resources or exceeded hard constraints → automatic rollback initiated, agent trust score reduced to zero, security alert emitted
- **Soft drift:** Execution parameters slightly outside bounds but within tolerance → warning emitted, agent trust score reduced by configurable amount
- **Timing violation:** Execution completed after warrant expiry → result quarantined pending human review

#### 9. Execution Trace Verification Feedback Loop

A distinguishing feature of the present invention is that verification results are not merely logged—they feed back into the governance system to dynamically adapt authorization policy. This creates a closed-loop governance system that learns from execution outcomes:

**(a) Policy engine feedback:** Verification results (scope drift events, constraint violations, timing violations) are ingested by the Policy Engine as historical evidence. When repeated drift patterns are detected for a specific action type, agent, or resource category, the Policy Engine may automatically propose or activate stricter governance rules. For example, if an agent's executions consistently approach parameter constraint boundaries, the system may tighten those constraints or escalate the required approval tier for that agent's future intents.

**(b) Agent trust score adjustment:** Verification outcomes directly modify the requesting agent's trust score. Successful executions with zero drift incrementally increase trust (enabling faster approval for low-risk actions over time). Drift events decrease trust proportionally to severity. Trust score changes propagate to the Risk Classification Module, dynamically shifting the agent's effective risk tier for subsequent intents. An agent that repeatedly produces clean executions may eventually qualify for automatic T1 approval on actions that previously required T2 human approval; conversely, an agent producing drift events is automatically escalated to stricter oversight.

**(c) Anomaly detection baseline update:** Verification results update the Behavioral Anomaly Detection System's per-agent baselines. Drift events are incorporated as negative signals, refining the statistical model of expected agent behavior and improving future anomaly detection accuracy.

**(d) Warrant constraint refinement:** Aggregate verification data across many executions informs the Warrant Authority's constraint generation. If historical traces show that a particular action type consistently uses resources within a narrower range than the current constraints allow, the system may suggest tighter default constraints for future warrants of that type, reducing the attack surface.

This feedback loop transforms the governance system from a static rule-enforcement mechanism into an adaptive control system that continuously improves its authorization precision based on observed execution behavior.

#### 10. Behavioral Anomaly Detection

The system maintains per-agent statistical baselines using rolling time windows. For each agent, the system tracks:
- Action velocity (intents per hour)
- Error rate
- Action diversity (distribution of action types)
- Temporal patterns (activity by hour of day)

Anomalies are detected when an agent's behavior deviates beyond a configurable threshold (default: 2 standard deviations) from its established baseline. Five anomaly types are detected:

1. **Velocity anomaly:** Agent submitting significantly more intents than normal
2. **Scope anomaly:** Agent requesting actions outside its historical pattern
3. **Error spike:** Agent's error rate increased significantly
4. **Time anomaly:** Agent active at unusual hours
5. **Pattern break:** Agent's action distribution changed dramatically

Detected anomalies automatically reduce the agent's trust score, which can trigger policy escalation (e.g., a trusted T1 agent is temporarily escalated to T2 approval requirements).

#### 11. Chaos Simulation Engine

The system includes a red team simulation capability for validating governance policy effectiveness. Operators can simulate adversarial agent behaviors including:

1. **Intent flooding:** Rapid submission of many intents to test rate limiting
2. **Scope creep:** Gradually escalating action scope to test authorization boundaries
3. **Budget exhaustion:** Attempting to exceed resource budgets
4. **Concurrent approvals:** Simultaneous T2/T3 requests to test queue handling
5. **Expired warrant exploitation:** Attempting to use invalidated warrants
6. **Parameter tampering:** Modifying parameters post-approval

Each simulation produces a structured report indicating which governance controls activated and whether the adversarial behavior was successfully contained.

#### 12. Attack Scenario Mitigation

The system is designed to defend against specific attack scenarios relevant to autonomous AI agent systems:

**Scenario 1: Compromised Agent (Prompt Injection / Jailbreak)**

An adversary manipulates an agent's reasoning through prompt injection, causing it to attempt unauthorized actions.

*Mitigation:* The Execution Isolation Layer ensures the compromised agent cannot invoke execution endpoints directly. The agent can only submit intents through the Intent Gateway. The Policy Engine evaluates the intent against governance rules regardless of the agent's reasoning. The Risk Classification System may escalate the intent if it deviates from the agent's behavioral baseline (detected by Anomaly Detection). Even if the intent passes policy evaluation, the Execution Router—not the agent—performs the action, using its own credentials. The agent never gains execution capability.

**Scenario 2: Replay Attack**

An adversary captures a valid warrant and attempts to reuse it for a subsequent unauthorized execution.

*Mitigation:* Each warrant has a unique `warrant_id` and short time-to-live (5–60 minutes depending on risk tier). The Execution Router maintains a set of consumed warrant IDs and rejects any warrant that has already been used (for single-use warrants) or that has exceeded its usage limit. Expired warrants are rejected at signature verification time. The warrant's `truth_snapshot_id` and `truth_snapshot_hash` bind it to a specific system state, preventing use in a different context.

**Scenario 3: Scope Escalation**

An agent (or adversary) submits a series of innocuous intents, then submits a high-risk intent hoping it will be auto-approved based on the agent's trust score.

*Mitigation:* The Risk Classification System evaluates each intent independently based on its action type, parameters, and context—not merely the agent's trust score. High-risk actions (T2/T3) always require human approval regardless of trust score. The Behavioral Anomaly Detection System detects scope anomalies (agent requesting actions outside its historical pattern) and can automatically escalate the agent's required approval tier.

**Scenario 4: Expired Warrant Exploitation**

An adversary intercepts a warrant and waits for a system state change that would make the authorized action harmful (e.g., deploying to a different environment).

*Mitigation:* The warrant's short TTL limits the window of exploitation. The `truth_snapshot_hash` binds the warrant to the system state at authorization time; if the state has changed, the hash mismatch is detected at execution. The Execution Router verifies expiration immediately before execution.

**Scenario 5: Parameter Tampering**

An adversary intercepts a warrant in transit and modifies the `constraints` to broaden the authorized scope (e.g., changing `"replicas": {"max": 3}` to `"replicas": {"max": 100}`).

*Mitigation:* The warrant's cryptographic signature covers all authorization-relevant fields including constraints. Any modification invalidates the signature. The Execution Router verifies the signature before execution and rejects tampered warrants with a critical security event.

**Scenario 6: Insider Threat (Malicious Operator)**

A human operator with approval authority attempts to authorize an action outside their purview.

*Mitigation:* For T3 (highest risk) actions, multi-party approval is required—no single operator can authorize alone. The audit ledger records the identity of every approver in the warrant's approval chain. Threshold signature schemes (when employed) ensure no single party possesses the complete signing key.

#### 13. Non-Agent Use Cases (Generalized Applicability)

While the preferred embodiment governs AI agent actions, the invention's architecture is applicable to any system requiring governed execution with cryptographic authorization:

1. **API Client Governance:** Third-party API clients submitting requests to a regulated service can be governed through the same intent → policy → warrant → execute → verify pipeline, ensuring API consumers cannot exceed their authorized scope.

2. **Automated Script Governance:** CI/CD pipelines, cron jobs, and infrastructure automation scripts can submit intents for destructive or sensitive operations (database migrations, production deployments, secret rotations), requiring warranted execution rather than direct invocation.

3. **Human-Triggered Workflow Governance:** Human operators performing sensitive actions through administrative interfaces can be required to obtain warrants (with multi-party approval for high-risk actions) before the system executes, replacing trust-based access control with cryptographically enforced authorization.

4. **IoT Device Governance:** Autonomous IoT devices (industrial controllers, autonomous vehicles, robotic systems) requesting actions that affect physical infrastructure can be governed through warranted execution, preventing unauthorized physical actions.

5. **Multi-Tenant SaaS Governance:** SaaS platforms can use the warrant system to govern cross-tenant operations, ensuring that administrative actions affecting tenant data require cryptographically bound authorization with a full audit trail.

#### 14. Multi-Tenant Isolation

The system supports multiple independent tenants (organizations) within a single deployment. Tenant isolation is enforced at the data layer through row-level security, at the API layer through JWT-based authentication with tenant context, and at the event layer through filtered Server-Sent Events streams. Each tenant has independent policies, agents, warrants, and audit trails.

### CLAIMS

**Claim 1.** A system for governing execution of actions requested by an autonomous system, comprising:
- receiving a request for execution of an action from an autonomous execution actor;
- determining whether the action is authorized under a defined set of constraints;
- issuing a bounded authorization artifact representing permission to execute the action, wherein the authorization artifact cryptographically binds the defined constraints such that any modification to the constraints renders the artifact invalid; and
- executing the action through a controlled execution layer that enforces the constraints of the authorization artifact, wherein the autonomous execution actor is architecturally prevented from executing the action directly.

**Claim 2.** A computer-implemented system for governing execution of actions requested by autonomous software agents, comprising:

(a) a processor and a memory storing instructions that, when executed by the processor, cause the system to:

(b) receive, at an intent gateway, structured action proposals from one or more software agents operating across heterogeneous agent frameworks, each action proposal specifying at least an action type, parameters, and an agent identifier;

(c) evaluate, by a policy engine, each action proposal against a set of governance rules;

(d) classify, by a risk classification module, each action proposal into one of a plurality of risk tiers based on the action type, parameter values, and contextual factors, each risk tier having a distinct maximum authorization duration;

(e) generate, by a warrant authority, a cryptographically bound capability token for each authorized action proposal, wherein the capability token comprises:
   - a specification of the authorized action scope including allowed actions and parameter constraints,
   - a time-to-live that is inversely proportional to the assigned risk tier,
   - an identity of at least one authorizing party, and
   - a cryptographic signature computed over a canonical representation of the scope specification, constraints, and authorization metadata, such that any modification to any signed field renders the token invalid;

(f) enforce, by an execution isolation layer, an architectural boundary that prevents the requesting software agent from directly invoking execution endpoints, wherein the software agent possesses neither execution credentials nor network connectivity to execution endpoints;

(g) execute, by a trusted execution intermediary operating within the execution isolation layer, the authorized action on behalf of the requesting software agent, wherein the trusted execution intermediary:
   - verifies the cryptographic signature and expiration of the capability token immediately before execution,
   - validates that the requested action falls within the token's authorized scope,
   - records a structured execution trace comprising at least: resources accessed, parameter values used, timing data, and output artifacts;

(h) verify, by a verification engine, that the execution conformed to the pre-authorized constraints by comparing the structured execution trace against the capability token's scope specification and parameter constraints, and emitting a scope drift event when execution accessed resources or parameters outside the authorized scope; and

(i) record, in an immutable audit ledger, tamper-evident entries for each step of the authorization and execution lifecycle.

**Claim 3.** The system of claim 2, wherein the cryptographic signature of the capability token is computed using one or more of: HMAC-SHA256, RSA digital signatures, ECDSA, Ed25519, JWT with signed claims, or hardware-backed key operations via a Trusted Platform Module (TPM) or Hardware Security Module (HSM).

**Claim 4.** The system of claim 2, wherein the risk classification module assigns risk tiers with inversely proportional capability token time-to-live values, such that a highest risk tier has a maximum time-to-live of five minutes and a lowest risk tier has a maximum time-to-live of sixty minutes.

**Claim 5.** The system of claim 2, wherein a highest risk tier requires authorization from a plurality of independent human approvers, and wherein the capability token embeds the full chain of approver identities, and wherein optionally a threshold signature scheme is employed such that no single approver possesses the complete signing key.

**Claim 6.** The system of claim 2, further comprising a behavioral anomaly detection module configured to:
- maintain per-agent statistical baselines of action velocity, error rate, action diversity, and temporal patterns over rolling time windows;
- detect deviations exceeding a configurable threshold from established baselines; and
- automatically reduce an agent's trust score upon anomaly detection, causing the risk classification module to escalate the agent's required approval tier.

**Claim 7.** The system of claim 2, further comprising a chaos simulation engine configured to validate governance policy effectiveness by simulating adversarial behaviors including intent flooding, scope escalation, expired token exploitation, and parameter tampering, and producing a structured report of governance control activations.

**Claim 8.** The system of claim 2, wherein the execution isolation layer enforces separation through at least: (a) network-level isolation preventing agent runtimes from reaching execution endpoints, and (b) credential isolation wherein execution credentials are held exclusively by the trusted execution intermediary and are never exposed to software agents.

**Claim 9.** The system of claim 2, wherein the structured execution trace further comprises network call records including destination addresses, HTTP methods, request paths, and response codes, and wherein the verification engine compares each network call against the capability token's allowed resource scope.

**Claim 10.** The system of claim 2, wherein the verification engine classifies scope drift into a plurality of severity levels including: hard drift requiring automatic rollback, soft drift generating a warning, and timing violations requiring human review of quarantined results.

**Claim 11.** A computer-implemented method for authorizing and governing execution of actions requested by untrusted autonomous execution actors, comprising:

(a) receiving, at an intent gateway, a structured action proposal from an untrusted autonomous execution actor, the action proposal comprising at least an action type, parameters, and an actor identifier;

(b) evaluating the action proposal against a set of governance rules;

(c) classifying the action proposal into a risk tier from a plurality of risk tiers;

(d) when the risk tier requires human authorization, queuing the action proposal for approval by one or more human operators;

(e) upon authorization, generating a cryptographically bound capability token specifying the authorized action scope, parameter constraints, and a time-to-live inversely proportional to the risk tier, wherein the scope and constraints are cryptographically bound to the token's signature;

(f) enforcing an execution isolation boundary that prevents the autonomous execution actor from directly invoking execution endpoints;

(g) executing, by a trusted execution intermediary, the authorized action on behalf of the actor after verifying the capability token's cryptographic signature and expiration, and recording a structured execution trace during execution;

(h) verifying, by comparing the execution trace against the capability token's pre-authorized constraints, that the execution conformed to the authorized scope, and emitting alerts for detected deviations; and

(i) recording each step of the authorization and execution lifecycle in an immutable audit ledger.

**Claim 12.** The method of claim 11, further comprising:
- maintaining per-actor behavioral baselines over rolling time windows;
- detecting statistical anomalies in actor behavior exceeding a configurable threshold; and
- automatically escalating the actor's required risk tier upon anomaly detection.

**Claim 13.** The method of claim 11, further comprising responding to a tampered or expired capability token by: denying execution, emitting a critical security event to the audit ledger, reducing the requesting actor's trust score, and alerting human operators.

**Claim 14.** The method of claim 11, wherein the method is applied to govern actions requested by non-agent automated systems including API clients, CI/CD pipelines, automated scripts, and IoT devices, using the same capability token authorization and execution isolation mechanisms.

**Claim 15.** The system of claim 2, wherein the capability token further comprises a reference to a system state snapshot, and wherein the trusted execution intermediary verifies that the current system state matches the referenced snapshot before execution, preventing use of the token in a changed context.

**Claim 16.** The system of claim 2, further comprising an execution trace verification feedback loop wherein:
- verification results from the verification engine are fed back into the policy engine to dynamically adapt governance rules based on observed execution patterns;
- successful executions with zero scope drift incrementally increase the requesting actor's trust score, and drift events decrease the trust score proportionally to severity, causing the risk classification module to dynamically adjust the actor's effective risk tier for subsequent action proposals; and
- aggregate verification data across multiple executions informs the warrant authority's default constraint generation, progressively tightening authorized scope for action types that historically use a narrower range of resources than currently permitted.

### ABSTRACT

A system and method for governing the execution of actions requested by untrusted autonomous execution actors—including AI agents, automated scripts, API clients, and autonomous devices—through a cryptographic execution control architecture. The system interposes an execution isolation layer between execution actor runtimes and execution endpoints, architecturally preventing execution actors from directly invoking execution resources. Untrusted autonomous execution actors propose structured intents which are evaluated by a policy engine, classified into risk tiers with escalating approval requirements, and authorized through cryptographically bound capability tokens that specify scope constraints, parameter bounds, and time-to-live inversely proportional to risk level. A trusted execution intermediary performs authorized actions on behalf of agents after verifying the token's cryptographic signature and scope constraints, recording a structured execution trace. A post-execution verification engine compares the execution trace against pre-authorized constraints to detect scope drift, parameter violations, and timing deviations. A behavioral anomaly detection system maintains per-agent baselines and escalates approval requirements upon detecting statistical deviations. The system defends against compromised agents, replay attacks, scope escalation, parameter tampering, and insider threats. All governance events are recorded in a tamper-evident audit ledger. The architecture is framework-agnostic and applicable to AI agents, API clients, automated scripts, and IoT devices.

*Prepared: March 26, 2026*
*Revised: March 26, 2026 — Incorporating patent-level review recommendations*
*This document is intended as a draft provisional patent application. The inventor should review all claims and technical descriptions for accuracy before filing.*
