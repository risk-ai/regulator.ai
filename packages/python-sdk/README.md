# Vienna OS Python SDK

Official Python SDK for [Vienna OS](https://regulator.ai) — the governance control plane for AI agents.

[![PyPI version](https://badge.fury.io/py/vienna-sdk.svg)](https://pypi.org/project/vienna-sdk/)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![Python](https://img.shields.io/badge/python-3.9+-blue.svg)](https://www.python.org/downloads/)

## Installation

```bash
pip install vienna-sdk
```

## Quick Start

```python
from vienna_sdk import ViennaClient

client = ViennaClient(api_key="vos_your_key")

# Submit an intent
result = client.submit_intent(
    action="deploy_code",
    params={"service": "api-gateway", "version": "2.3.1"},
    objective="Deploy API v2.3.1 to production"
)

if result.status.value == "approved":
    # Execute with warrant
    deploy_service("api-gateway", "2.3.1")
    client.report_execution(result.warrant_id, success=True)

elif result.status.value == "pending":
    # T2/T3 — wait for human approval
    print(f"Approval required: https://console.regulator.ai/approvals/{result.intent_id}")
    approved = client.wait_for_approval(result.intent_id)
    if approved.status.value == "approved":
        deploy_service("api-gateway", "2.3.1")
        client.report_execution(approved.warrant_id, success=True)
```

## Framework Adapters

```python
from vienna_sdk import create_langchain_adapter, create_crewai_adapter

# LangChain
vienna = create_langchain_adapter(api_key="vos_your_key", agent_id="my-agent")

# CrewAI
vienna = create_crewai_adapter(api_key="vos_your_key", agent_id="my-crew")

# AutoGen
from vienna_sdk import create_autogen_adapter
vienna = create_autogen_adapter(api_key="vos_your_key")

# OpenClaw
from vienna_sdk import create_openclaw_adapter
vienna = create_openclaw_adapter(api_key="vos_your_key")
```

## Risk Tiers

| Tier | Risk | Approval | Max TTL |
|------|------|----------|---------|
| T0 | Informational | Auto | 60 min |
| T1 | Low | Policy auto | 30 min |
| T2 | Medium | 1 human | 15 min |
| T3 | High | 2+ humans | 5 min |

## Zero Dependencies

This SDK uses only Python standard library (`urllib`, `json`, `hashlib`). No external dependencies required.

## Documentation

- [Live Console](https://console.regulator.ai)
- [Integration Guide](https://regulator.ai/docs/integration-guide)
- [API Reference](https://regulator.ai/docs)
- [GitHub](https://github.com/risk-ai/regulator.ai)

## License

Apache-2.0
