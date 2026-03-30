# Vienna OS Python SDK

Official Python SDK for [Vienna OS](https://regulator.ai) — the governance control plane for AI agents.

[![PyPI version](https://badge.fury.io/py/vienna-sdk.svg)](https://pypi.org/project/vienna-sdk/)
[![License: BSL-1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](../../LICENSE)
[![Python](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)

## Two SDK Options Available

This package contains **two Python SDKs** for Vienna OS:

### 1. Simple Sync SDK (`vienna_sdk`) - Ready to Use

Zero-dependency synchronous SDK using only Python standard library. Perfect for simple integrations and existing sync codebases.

```python
from vienna_sdk import ViennaClient

client = ViennaClient(api_key="vos_your_key")
result = client.submit_intent(
    action="deploy_code",
    params={"service": "api-gateway", "version": "2.3.1"},
    objective="Deploy API v2.3.1 to production"
)
```

### 2. Full Async SDK (`vienna_os`) - Complete API Coverage

Modern async SDK with complete Vienna OS API coverage, built with `httpx` and `pydantic`. Matches the TypeScript SDK exactly.

```python
import asyncio
from vienna_os import ViennaClient

async def main():
    async with ViennaClient(api_key="vna_your_api_key") as client:
        result = await client.intent.submit({
            "action": "deploy",
            "source": "ci-bot",
            "payload": {"service": "api-gateway", "version": "2.3.1"}
        })
        print(f"Status: {result.status}")

asyncio.run(main())
```

## Installation

```bash
pip install vienna-sdk  # For vienna_sdk (simple)
# OR
pip install vienna-os   # For vienna_os (full async)
```

## Quick Start (Simple SDK)

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

## Quick Start (Full Async SDK)

```python
import asyncio
from vienna_os import ViennaClient

async def main():
    async with ViennaClient(api_key="vna_your_api_key") as client:
        # Submit an intent
        result = await client.intent.submit({
            "action": "wire_transfer",
            "source": "billing-bot",
            "payload": {"amount": 75000, "currency": "USD"}
        })
        
        print(f"Intent {result.intent_id}: {result.status}")
        print(f"Risk tier: {result.risk_tier}")
        
        # Check policies
        evaluation = await client.policies.evaluate({
            "amount": 50000,
            "environment": "production"
        })
        print(f"Policy result: {evaluation.final_action}")
        
        # Fleet management
        agents = await client.fleet.list()
        print(f"Fleet size: {len(agents)} agents")
        
        # Compliance reporting
        stats = await client.compliance.quick_stats({"days": 30})
        print(f"Compliance score: {stats.compliance_score}")

asyncio.run(main())
```

## Framework Adapters (Simple SDK)

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

## Full Async SDK Features

- **🔐 Async/Await Support**: Built with `httpx` for modern async Python
- **📝 Type Hints**: Full type annotations with Pydantic models
- **🛡️ Error Handling**: Comprehensive error handling with custom exceptions
- **🔄 Automatic Retries**: Built-in retry logic for transient failures
- **📊 Complete API Coverage**: All Vienna OS endpoints and features

### Core Modules (Async SDK)

#### Intent Management
```python
# Submit and track intents
result = await client.intent.submit(intent_request)
status = await client.intent.status(result.intent_id)
simulation = await client.intent.simulate(intent_request)
```

#### Policy Management
```python
# Manage governance policies
policies = await client.policies.list({"enabled": True})
policy = await client.policies.create(policy_params)
evaluation = await client.policies.evaluate(test_payload)
```

#### Fleet Management
```python
# Monitor and manage agents
agents = await client.fleet.list()
metrics = await client.fleet.metrics("agent-id")
await client.fleet.suspend("agent-id", {"reason": "Suspicious activity"})
```

#### Approval Workflows
```python
# Handle approvals
pending = await client.approvals.list({"status": "pending"})
await client.approvals.approve("appr-123", {"operator": "jane", "notes": "LGTM"})
```

#### Compliance Reporting
```python
# Generate reports and stats
report = await client.compliance.generate(report_params)
stats = await client.compliance.quick_stats({"days": 30})
```

## Simple SDK Features

- **Zero Dependencies**: Uses only Python standard library
- **Framework Adapters**: Ready-made integrations for LangChain, CrewAI, AutoGen, OpenClaw
- **Synchronous**: Works with existing sync codebases
- **Lightweight**: Minimal footprint and fast imports

## Documentation

- [Live Console](https://console.regulator.ai)
- [Integration Guide](https://regulator.ai/docs/integration-guide)
- [API Reference](https://regulator.ai/docs)
- [GitHub](https://github.com/risk-ai/regulator.ai)

## License

BSL-1.1