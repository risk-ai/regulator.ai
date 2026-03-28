# Hacker News Launch Plan

## Show HN Submission

**Title:** Show HN: Vienna OS – Open-source execution control for AI agents (BSL 1.1)

**URL:** https://regulator.ai

**First Comment (post immediately after submission):**

> Hey HN,
>
> I'm Max, a 3L at Cornell Law building at the intersection of legal compliance and distributed systems.
>
> Problem: AI agents (LangChain, CrewAI, AutoGen) are increasingly autonomous — deploying code, moving money, updating records. But none of the frameworks answer: who approved this action? Can you prove it to an auditor?
>
> Vienna OS sits between agent intent and execution. Every action flows through:
>
> Intent → Policy Check → Risk Tier → Approval → Cryptographic Warrant → Execute → Verify → Audit
>
> The core primitive is the execution warrant — HMAC-SHA256 signed, time-limited, scope-constrained. Tamper with any field and it invalidates. No warrant, no execution.
>
> Risk tiering: T0 auto-approves (reads), T1 needs policy match, T2 needs human approval, T3 needs multi-party + justification + rollback plan.
>
> Technical details:
> - 9 governance engines, 99 unit tests passing
> - TypeScript SDK: `npm install @vienna-os/sdk`
> - Python SDK: `pip install vienna-sdk`
> - Works with any framework that makes HTTP requests
> - Console at console.regulator.ai
> - Interactive playground at regulator.ai/try
>
> Built with Node 22, SQLite (embedded) / Postgres (cloud), React console. Patent filed (USPTO #64/018,152).
>
> Licensed BSL 1.1 — free for eval/dev, commercial license for production, converts to Apache 2.0 in 2030.
>
> GitHub: https://github.com/risk-ai/regulator.ai
>
> Happy to answer technical questions about the warrant system, policy engine, or risk tiering architecture.

## Timing

- **Best submission times:** Tuesday-Thursday, 8-10 AM ET (HN peak)
- **Avoid:** Weekends, holidays, major tech news days
- **Backup:** If first submission doesn't gain traction, resubmit after 3 days with different title angle

## Title Alternatives (if first doesn't stick)

1. "Show HN: Vienna OS – Cryptographic warrants for AI agent execution"
2. "Show HN: We built an execution control layer so AI agents can't go rogue"
3. "Show HN: Vienna OS – The governance layer between AI intent and action"

## Engagement Strategy

- Respond to every comment within 30 minutes
- Be technical and honest — HN hates marketing speak
- If asked "why not just use X": explain the layered governance model
- If asked about BSL: explain the 4-year conversion to Apache, reference HashiCorp/Terraform precedent
- If asked about patent: explain it protects the warrant model, not the open code
- Upvote nothing — HN detects vote manipulation

## Success Metrics

| Metric | Target |
|---|---|
| Points | 100+ |
| Comments | 30+ |
| Front page time | 2+ hours |
| GitHub stars (from HN) | 50+ |
| Signups (from HN) | 20+ |
