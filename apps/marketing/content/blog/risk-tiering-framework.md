# Designing a Risk Tiering Framework for AI Agent Actions

*Published: March 25, 2026 | Reading Time: 7 minutes*

---

## Not All Actions Are Equal

A file read and a wire transfer are both "agent actions." But treating them with the same level of governance is either recklessly permissive or paralyzingly restrictive.

The solution is **risk tiering** — classifying agent actions by their potential impact and applying proportional governance. Low-risk actions flow through automatically. High-risk actions require human authorization. The framework decides which is which.

## The Four-Tier Model

Vienna OS uses a four-tier risk classification that maps to real-world consequences:

### T0: Informational

**Impact:** None. Read-only operations that don't change state.

**Examples:**
- Querying a database (SELECT)
- Reading log files
- Checking system status
- Fetching API data

**Governance:** Auto-approved. Logged for audit. No human involvement required.

**Rationale:** T0 actions can't cause harm because they don't change anything. Requiring approval for reads would create unacceptable latency for agents that need to gather information before making decisions.

### T1: Operational

**Impact:** Reversible. State changes that can be undone without data loss.

**Examples:**
- Creating a support ticket
- Sending an internal notification
- Updating a non-critical configuration
- Adding a tag or label
- Scheduling a non-destructive task

**Governance:** Policy-evaluated. Auto-approved if compliant. Denied if policy rules fail.

**Rationale:** T1 actions have consequences, but those consequences are reversible. The policy engine evaluates them against defined rules (rate limits, business hours, scope constraints), and compliant actions proceed without human delay.

### T2: Sensitive

**Impact:** Irreversible, involves PII/PHI, or has significant financial implications.

**Examples:**
- Accessing patient records (PHI)
- Processing a payment or refund
- Modifying production infrastructure
- Sending external communications
- Deleting data
- Executing a deployment to production

**Governance:** Requires human operator approval. Warrant issued upon approval with explicit scope and expiration.

**Rationale:** T2 actions cross a threshold where the potential for harm exceeds what automated policy checks can reliably prevent. A human reviews the specific action, understands the context, and makes an informed approval decision.

### T3: Critical

**Impact:** System-level, multi-party, or high-value transactions where a single approval isn't sufficient.

**Examples:**
- Wire transfers exceeding $100K
- Modifying security policies or access controls
- Emergency system shutdowns
- Cross-tenant data operations
- Legal or regulatory filings
- Modifying the governance rules themselves

**Governance:** Multi-party approval with configurable quorum. At least 2 of N designated approvers must authorize.

**Rationale:** T3 actions are consequential enough that no single person should authorize them unilaterally. The quorum requirement mirrors the "two-person rule" used in nuclear launch procedures, financial controls, and safety-critical systems.

## Classifying Actions

Action classification happens through a combination of:

### 1. Static Policy Rules

Define rules that classify actions by type:

```yaml
risk_tiers:
  T0:
    - action: "query_*"
    - action: "read_*"
    - action: "list_*"
    - action: "status_*"
  
  T1:
    - action: "create_ticket"
    - action: "send_notification"
      condition: "internal_only"
    - action: "update_config"
      condition: "non_production"
  
  T2:
    - action: "access_phi"
    - action: "process_payment"
    - action: "deploy_production"
    - action: "delete_*"
    - action: "send_external_*"
  
  T3:
    - action: "wire_transfer"
      condition: "amount > 100000"
    - action: "modify_security_policy"
    - action: "modify_governance_rules"
```

### 2. Dynamic Risk Scoring

For actions that don't fit neatly into static categories, Vienna OS evaluates contextual risk factors:

- **Amount-based escalation:** A $500 payment might be T1. A $50,000 payment is T2. A $500,000 payment is T3.
- **Time-based escalation:** A deployment during business hours might be T1. The same deployment at 3 AM is T2.
- **Frequency-based escalation:** 5 API calls per minute is T0. 500 per minute triggers T1 review.
- **Anomaly detection:** Actions that deviate significantly from the agent's historical pattern get escalated one tier.

### 3. Agent-Specific Overrides

Different agents have different trust levels:

```yaml
agents:
  data-analyst:
    max_tier: T1  # Can never exceed T1 autonomously
    auto_escalate:
      - action: "export_data"  # Always T2 for this agent
  
  infrastructure-agent:
    max_tier: T2  # Can self-serve up to T2
    trusted_actions:
      - "scale_service"  # Explicitly T1 for this agent
```

## Common Mistakes

### Mistake 1: Everything Is T2

Some teams make everything require approval "to be safe." This defeats the purpose. Agents spend all their time waiting for humans instead of working. Operators develop approval fatigue and start rubber-stamping. The governance becomes theater.

**Fix:** Start by classifying reads as T0 and reversible writes as T1. Only actions with irreversible consequences or compliance implications belong at T2+.

### Mistake 2: Tier Shopping

Agents learn to decompose T2 actions into sequences of T1 actions. "I can't do a production deployment (T2), but I can update the config (T1), restart the service (T1), and change the routing (T1)."

**Fix:** Vienna OS's policy engine evaluates compound actions, not just individual steps. A sequence of T1 actions that collectively constitute a T2 action gets escalated.

### Mistake 3: Static Forever

The initial tier classification is based on assumptions. Those assumptions should be tested against real-world data. An action classified as T1 that causes incidents should be escalated. A T2 action that's approved 100% of the time with no incidents might be safely downgraded.

**Fix:** Review tier classifications quarterly. Use audit data to identify misclassified actions.

## Getting Started

Start with a conservative classification and relax as you build confidence:

1. **Week 1:** Classify all actions. When in doubt, tier up.
2. **Week 2-4:** Monitor approval rates and incident rates per tier.
3. **Month 2:** Downgrade actions with 100% approval rate and zero incidents.
4. **Month 3:** Upgrade actions that caused any incident, regardless of current tier.
5. **Ongoing:** Quarterly review of all classifications.

The goal is a classification that's tight enough to prevent harm and loose enough to let agents work. Vienna OS's audit trail gives you the data to find that balance empirically rather than guessing.

---

*Ready to classify your agent actions? [Get started with Vienna OS →](/pricing)*
