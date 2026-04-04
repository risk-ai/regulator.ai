#!/usr/bin/env python3
"""
Example: Governed Finance Agent (Python)

A financial operations agent that uses Vienna OS to govern
high-value transactions with multi-party approval.

Usage:
    pip install vienna-os
    VIENNA_API_KEY=vos_xxx python agent.py
"""

import os
import time

try:
    from vienna_os import ViennaClient, ViennaError
except ImportError:
    print('ERROR: vienna-os package not installed')
    print('Install: pip install vienna-os')
    exit(1)

client = ViennaClient(
    api_key=os.environ.get('VIENNA_API_KEY', 'vos_demo_key'),
    base_url=os.environ.get('VIENNA_API_URL', 'https://console.regulator.ai'),
    agent_id='finance-agent-demo',
)

# Simulated financial operations
operations = [
    {
        'action': 'query_balance',
        'params': {'account': 'ops-treasury'},
        'description': 'Check treasury balance',
        'expected_tier': 'T0',
    },
    {
        'action': 'send_invoice',
        'params': {'vendor': 'AWS', 'amount': 4500, 'currency': 'USD'},
        'description': 'Send invoice ($4,500)',
        'expected_tier': 'T1',
    },
    {
        'action': 'wire_transfer',
        'params': {'amount': 75000, 'currency': 'USD', 'destination': 'vendor-4821'},
        'description': 'Wire transfer ($75,000)',
        'expected_tier': 'T3',
    },
    {
        'action': 'export_financial_report',
        'params': {'quarter': 'Q1-2026', 'format': 'pdf'},
        'description': 'Export Q1 financial report',
        'expected_tier': 'T1',
    },
]


def run_agent():
    print('💰 Governed Finance Agent starting...\n')

    # Register
    try:
        client.register(
            name='Finance Demo Agent',
            capabilities=['query_balance', 'send_invoice', 'wire_transfer', 'export_financial_report'],
        )
        print('✅ Registered with Vienna OS\n')
    except ViennaError:
        print('⚠️  Registration skipped (API may not be running)\n')

    for op in operations:
        print(f'━━━ {op["description"]} ━━━')
        print(f'  Action: {op["action"]}')
        print(f'  Params: {op["params"]}')
        print(f'  Expected tier: {op["expected_tier"]}')

        try:
            result = client.submit_intent(
                action=op['action'],
                params=op['params'],
                objective=op['description'],
            )

            print(f'  Risk Tier: {result.risk_tier.value}')
            print(f'  Status: {result.status.value}')

            if result.status.value in ('approved', 'auto-approved'):
                print(f'  ✅ Approved — Warrant: {result.warrant_id or "N/A"}')
                
                # Simulate execution
                print(f'  ⚡ Executing: {op["action"]}...')
                time.sleep(0.3)
                
                # Report execution
                if result.warrant_id:
                    client.report_execution(result.warrant_id, success=True)
                    print(f'  📋 Execution reported to audit trail')

            elif result.status.value == 'pending':
                print(f'  ⏳ Awaiting approval ({result.approval_required} approver(s) needed)')
                print(f'  🔗 Approve at: console.regulator.ai')
                
                # In a real agent, you'd wait:
                # approved = client.wait_for_approval(result.intent_id, timeout_seconds=300)

            elif result.status.value == 'denied':
                print(f'  🚫 DENIED: {result.reason or "Policy violation"}')

        except ViennaError as e:
            print(f'  ❌ Error: {e}')

        print()

    print('🏁 Agent completed all operations')


if __name__ == '__main__':
    run_agent()
