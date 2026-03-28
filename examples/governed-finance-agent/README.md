# Governed Finance Agent

A Python example showing how to add Vienna OS governance to a finance agent that handles wire transfers, trading, and account operations.

## Setup

```bash
pip install vienna-sdk
export VIENNA_API_KEY=vos_your_key
```

## Run

```bash
python agent.py
```

## What It Demonstrates

- **T2 multi-party approval** for wire transfers over $10K
- **T1 policy auto-approval** for balance checks and reports
- **DENY** for unauthorized trading actions outside agent scope
- **Warrant-scoped execution** with amount constraints
- **Audit trail** for SOX/FINRA compliance

## Risk Tiering

| Action | Risk Tier | Approval |
|---|---|---|
| Check balance | T0 | Auto |
| Generate report | T1 | Policy |
| Wire transfer < $10K | T1 | Policy |
| Wire transfer > $10K | T2 | Human |
| Trading operations | T2+ | Multi-party |

## Learn More

- [How Execution Warrants Work](https://regulator.ai/blog/how-execution-warrants-work)
- [Financial Services Use Case](https://regulator.ai/case-studies)
- [SDK Documentation](https://regulator.ai/docs/api-reference)
