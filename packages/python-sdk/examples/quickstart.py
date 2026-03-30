#!/usr/bin/env python3
"""
Vienna OS Python SDK Quickstart Example

This example demonstrates the core features of the Vienna OS SDK:
- Intent submission and tracking
- Policy evaluation  
- Fleet management
- Approval workflows
- Compliance reporting

Prerequisites:
- Vienna OS API key (set as VIENNA_API_KEY environment variable)
- Python 3.8+
- Install: pip install vienna-os

Usage:
    export VIENNA_API_KEY="vna_your_api_key"
    python examples/quickstart.py
"""

import asyncio
import os
from datetime import datetime, timedelta
from vienna_os import ViennaClient, ViennaAuthError, ViennaError

async def main():
    """Main quickstart demonstration."""
    
    # Get API key from environment
    api_key = os.getenv("VIENNA_API_KEY")
    if not api_key:
        print("❌ Please set VIENNA_API_KEY environment variable")
        return
    
    print("🚀 Vienna OS Python SDK Quickstart")
    print("=" * 50)
    
    try:
        # Initialize client with context manager
        async with ViennaClient(api_key=api_key) as client:
            await demo_intent_submission(client)
            await demo_policy_management(client)
            await demo_fleet_management(client)
            await demo_approval_workflows(client)
            await demo_compliance_reporting(client)
            
    except ViennaAuthError:
        print("❌ Authentication failed - check your API key")
    except ViennaError as e:
        print(f"❌ Vienna OS error: {e}")
    except Exception as e:
        print(f"❌ Unexpected error: {e}")

async def demo_intent_submission(client: ViennaClient):
    """Demonstrate intent submission and tracking."""
    
    print("\n📝 Intent Submission Demo")
    print("-" * 30)
    
    from vienna_os.types import IntentRequest
    
    # Submit a high-risk intent
    intent_data = IntentRequest(
        action="wire_transfer",
        source="billing-bot",
        payload={
            "amount": 50000,
            "currency": "USD",
            "recipient": "supplier-xyz",
            "reference": "Q1-2026-payment"
        },
        metadata={
            "department": "finance",
            "quarter": "Q1-2026"
        }
    )
    
    print(f"Submitting intent: {intent_data.action} for ${intent_data.payload['amount']}")
    
    result = await client.intent.submit(intent_data)
    print(f"✅ Intent submitted: {result.intent_id}")
    print(f"   Status: {result.status}")
    print(f"   Risk Tier: {result.risk_tier}")
    print(f"   Policy Matches: {len(result.policy_matches)}")
    
    # Check status
    status = await client.intent.status(result.intent_id)
    print(f"📊 Current Status: {status.status}")
    
    # Simulate another intent
    sim_intent = IntentRequest(
        action="deploy",
        source="ci-bot",
        payload={
            "environment": "production",
            "version": "v1.2.3",
            "service": "payment-api"
        }
    )
    
    simulation = await client.intent.simulate(sim_intent)
    print(f"🧪 Simulation Result: Would execute = {simulation.would_execute}")
    print(f"   Final Status: {simulation.status}")
    print(f"   Risk Tier: {simulation.risk_tier}")

async def demo_policy_management(client: ViennaClient):
    """Demonstrate policy management."""
    
    print("\n🛡️  Policy Management Demo") 
    print("-" * 30)
    
    # List existing policies
    policies = await client.policies.list()
    print(f"📋 Found {len(policies)} policies")
    
    # Evaluate a test payload
    test_payload = {
        "action": "data_access",
        "amount": 75000,
        "database": "customer_pii",
        "environment": "production"
    }
    
    evaluation = await client.policies.evaluate(test_payload)
    print(f"⚖️  Policy Evaluation:")
    print(f"   Final Action: {evaluation.final_action}")
    print(f"   Risk Tier: {evaluation.risk_tier}")
    print(f"   Matched Policies: {len(evaluation.matched_policies)}")
    
    # List policy templates
    try:
        templates = await client.policies.templates()
        print(f"📋 Available Templates: {len(templates)}")
        if templates:
            print(f"   Example: {templates[0].name} ({templates[0].industry})")
    except Exception:
        print("📋 Policy templates not available")

async def demo_fleet_management(client: ViennaClient):
    """Demonstrate fleet management."""
    
    print("\n🤖 Fleet Management Demo")
    print("-" * 30)
    
    try:
        # List agents
        agents = await client.fleet.list()
        print(f"👥 Fleet Size: {len(agents)} agents")
        
        if agents:
            agent = agents[0]
            print(f"📊 Example Agent: {agent.name}")
            print(f"   Status: {agent.status}")
            print(f"   Trust Score: {agent.trust_score}")
            print(f"   Total Intents: {agent.total_intents}")
            
            # Get metrics for first agent
            try:
                metrics = await client.fleet.metrics(agent.id)
                print(f"📈 Agent Metrics:")
                print(f"   Approved: {metrics.approved_intents}")
                print(f"   Denied: {metrics.denied_intents}")
                print(f"   Avg Response: {metrics.avg_response_time_ms}ms")
            except Exception:
                print("📈 Metrics not available for this agent")
        
        # Check fleet alerts
        alerts = await client.fleet.alerts()
        print(f"🚨 Active Alerts: {len(alerts)}")
        
        if alerts:
            alert = alerts[0]
            print(f"   Example: {alert.severity.upper()} - {alert.message}")
            
    except Exception as e:
        print(f"⚠️  Fleet management limited: {e}")

async def demo_approval_workflows(client: ViennaClient):
    """Demonstrate approval workflows."""
    
    print("\n✅ Approval Workflows Demo")
    print("-" * 30)
    
    try:
        from vienna_os.types import ApprovalListParams
        
        # List pending approvals
        pending = await client.approvals.list(ApprovalListParams(status="pending"))
        print(f"⏳ Pending Approvals: {len(pending)}")
        
        # List all approvals
        all_approvals = await client.approvals.list()
        print(f"📋 Total Approvals: {len(all_approvals)}")
        
        if all_approvals:
            approval = all_approvals[0]
            print(f"📝 Example Approval:")
            print(f"   ID: {approval.id}")
            print(f"   Action: {approval.action}")
            print(f"   Status: {approval.status}")
            print(f"   Risk Tier: {approval.risk_tier}")
            
    except Exception as e:
        print(f"⚠️  Approval workflows limited: {e}")

async def demo_compliance_reporting(client: ViennaClient):
    """Demonstrate compliance reporting."""
    
    print("\n📊 Compliance Reporting Demo")
    print("-" * 30)
    
    try:
        from vienna_os.types import QuickStatsParams
        
        # Get quick stats for last 30 days
        stats = await client.compliance.quick_stats(QuickStatsParams(days=30))
        print(f"📈 30-Day Compliance Stats:")
        print(f"   Total Intents: {stats.total_intents}")
        print(f"   Approved: {stats.approved_intents}")
        print(f"   Denied: {stats.denied_intents}")
        print(f"   Policy Violations: {stats.policy_violations}")
        print(f"   Compliance Score: {stats.compliance_score}/100")
        print(f"   Avg Response Time: {stats.avg_response_time_ms}ms")
        
        if stats.top_violating_agents:
            print(f"🚨 Top Violating Agent: {stats.top_violating_agents[0]}")
        
        # List existing reports
        reports = await client.compliance.list()
        print(f"📋 Compliance Reports: {len(reports)}")
        
        if reports:
            report = reports[0]
            print(f"📊 Latest Report: {report.type} ({report.status})")
            print(f"   Period: {report.period_start} to {report.period_end}")
            
    except Exception as e:
        print(f"⚠️  Compliance reporting limited: {e}")

def print_summary():
    """Print summary and next steps."""
    
    print("\n🎉 Quickstart Complete!")
    print("=" * 50)
    print("Next steps:")
    print("• Read the full documentation: https://docs.vienna-os.dev")
    print("• Explore more examples: https://github.com/vienna-os/examples")
    print("• Join our Discord: https://discord.gg/vienna-os")
    print("• Check out framework integrations for LangChain, CrewAI, etc.")
    print("\nHappy building! 🚀")

if __name__ == "__main__":
    try:
        asyncio.run(main())
        print_summary()
    except KeyboardInterrupt:
        print("\n👋 Quickstart interrupted")
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")