#!/usr/bin/env python3
"""
Vienna OS + CrewAI Integration Example

This example demonstrates how to integrate Vienna OS governance with CrewAI crews.
It shows how multi-agent crews can submit tasks for governance before execution.

Usage:
    VIENNA_API_KEY=vna_xxx python main.py
    python main.py --scenario research_crew
    python main.py --scenario finance_crew
"""

import os
import asyncio
import json
import time
import argparse
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

# Mock CrewAI classes for demonstration (replace with real imports)
class Agent:
    def __init__(self, role: str, goal: str, backstory: str):
        self.role = role
        self.goal = goal
        self.backstory = backstory
        
class Task:
    def __init__(self, description: str, agent: Agent, execution_function=None):
        self.description = description
        self.agent = agent
        self.execution_function = execution_function
        
class Crew:
    def __init__(self, agents: List[Agent], tasks: List[Task]):
        self.agents = agents
        self.tasks = tasks
        
    async def kickoff(self) -> Dict[str, Any]:
        """Execute all tasks in the crew"""
        results = []
        for task in self.tasks:
            if task.execution_function:
                result = await task.execution_function()
                results.append(result)
        return {"results": results, "status": "completed"}

# Vienna OS SDK Mock (replace with actual vienna_sdk import)
@dataclass
class IntentResult:
    status: str
    risk_tier: Optional[str] = None
    execution_id: Optional[str] = None
    warrant_id: Optional[str] = None
    reason: Optional[str] = None
    poll_url: Optional[str] = None

class ViennaCrewAIAdapter:
    def __init__(self, api_key: str, agent_id: str = "crewai-agent"):
        self.api_key = api_key
        self.agent_id = agent_id
        print(f"🔧 Vienna CrewAI adapter initialized for {agent_id}")
        
    async def submit_task_intent(
        self, 
        task_type: str, 
        task_payload: Dict[str, Any],
        crew_context: Optional[Dict[str, Any]] = None
    ) -> IntentResult:
        """Submit a CrewAI task intent to Vienna OS governance"""
        
        # Simulate Vienna OS governance evaluation
        await asyncio.sleep(0.1)  # Simulate API call
        
        # Mock risk assessment based on task type
        risk_tiers = {
            'web_research': 'T0',      # Auto-approved
            'data_analysis': 'T1',     # Policy approved
            'content_generation': 'T1', # Policy approved
            'fact_verification': 'T1',  # Policy approved
            'market_analysis': 'T1',    # Policy approved
            'trade_recommendation': 'T2', # Human approval
            'execute_trade': 'T2',      # Human approval
            'send_email': 'T1',        # Policy approved
            'delete_data': 'DENIED',    # Explicitly denied
            'admin_access': 'DENIED'    # Scope violation
        }
        
        risk_tier = risk_tiers.get(task_type, 'T1')
        
        if risk_tier == 'DENIED':
            return IntentResult(
                status='denied',
                reason=f'Task type "{task_type}" violates agent scope policy'
            )
        elif risk_tier == 'T0':
            return IntentResult(
                status='auto-approved',
                risk_tier=risk_tier,
                execution_id=f'exec_{int(time.time())}',
                warrant_id=f'warrant_{int(time.time())}'
            )
        elif risk_tier in ['T1']:
            return IntentResult(
                status='approved',
                risk_tier=risk_tier, 
                execution_id=f'exec_{int(time.time())}',
                warrant_id=f'warrant_{int(time.time())}'
            )
        else:  # T2, T3
            return IntentResult(
                status='pending_approval',
                risk_tier=risk_tier,
                execution_id=f'exec_{int(time.time())}',
                poll_url=f'https://console.regulator.ai/approvals/exec_{int(time.time())}'
            )
    
    async def report_execution(
        self, 
        execution_id: str, 
        result: str, 
        details: Optional[Dict[str, Any]] = None
    ) -> None:
        """Report task execution results back to Vienna"""
        print(f"📒 Execution {execution_id}: {result}")
        if details:
            print(f"   Details: {json.dumps(details, indent=2)}")
    
    async def register(self, metadata: Optional[Dict[str, str]] = None) -> None:
        """Register this crew/agent with Vienna OS fleet"""
        print(f"✅ Registered {self.agent_id} with Vienna OS")
        if metadata:
            print(f"   Metadata: {metadata}")

def create_for_crewai(api_key: str, agent_id: str = "crewai-agent") -> ViennaCrewAIAdapter:
    """Factory function to create CrewAI-optimized Vienna adapter"""
    return ViennaCrewAIAdapter(api_key, agent_id)

# ─── Governed Task Wrapper ─────────────────────────────────────────────────

async def governed_task(
    vienna: ViennaCrewAIAdapter,
    task_type: str,
    task_payload: Dict[str, Any],
    original_executor,
    crew_context: Optional[Dict[str, Any]] = None
):
    """
    Wraps a CrewAI task with Vienna OS governance.
    
    Args:
        vienna: Vienna OS adapter instance
        task_type: Type of task being executed
        task_payload: Task parameters and data
        original_executor: Function that executes the actual task
        crew_context: Additional crew-level context
    """
    print(f"\n━━━ Task: {task_type} ━━━")
    print(f"  Payload: {json.dumps(task_payload, indent=2)}")
    
    try:
        # Submit intent to Vienna OS
        print(f"  📨 Submitting intent to Vienna OS...")
        intent = await vienna.submit_task_intent(task_type, task_payload, crew_context)
        
        print(f"  ⚖️  Risk Tier: {intent.risk_tier or 'unknown'}")
        print(f"  📋 Status: {intent.status}")
        
        if intent.status in ['approved', 'auto-approved']:
            print(f"  ✅ {intent.status.replace('_', ' ').title()} — Warrant: {intent.warrant_id or 'N/A'}")
            
            try:
                # Execute the original task
                print(f"  ⚡ Executing task: {task_type}...")
                result = await original_executor(task_payload)
                
                # Report successful execution
                await vienna.report_execution(
                    intent.execution_id or 'unknown',
                    'success',
                    {'result': result}
                )
                
                print(f"  📒 Execution reported to audit trail")
                return result
                
            except Exception as error:
                # Report failed execution
                await vienna.report_execution(
                    intent.execution_id or 'unknown',
                    'failure',
                    {'error': str(error)}
                )
                raise error
                
        elif intent.status in ['pending_approval', 'pending']:
            message = f"⏳ Task requires human approval. View at: {intent.poll_url or 'console.regulator.ai'}"
            print(f"  {message}")
            raise Exception(message)
            
        else:
            # Denied
            reason = intent.reason or 'Policy violation'
            print(f"  🚫 DENIED: {reason}")
            raise Exception(f"Task denied: {reason}")
            
    except Exception as error:
        print(f"  ❌ Governance error: {error}")
        raise error

# ─── Mock Task Executors ───────────────────────────────────────────────────

async def simulate_delay(ms: int) -> None:
    """Simulate task execution time"""
    await asyncio.sleep(ms / 1000)

async def web_research_executor(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Mock web research task execution"""
    print(f"    🔍 Researching: {payload.get('query', 'unknown topic')}")
    await simulate_delay(500)
    return {
        'sources_found': 12,
        'key_insights': [
            'AI governance frameworks are rapidly evolving',
            'Regulatory compliance is becoming mandatory',
            'Vienna OS addresses critical gaps in agent oversight'
        ],
        'research_quality': 'high'
    }

async def data_analysis_executor(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Mock data analysis task execution"""
    print(f"    📊 Analyzing data from: {payload.get('sources', ['unknown'])}")
    await simulate_delay(800)
    return {
        'trends_identified': 5,
        'statistical_significance': 0.95,
        'recommendations': [
            'Implement governance early in AI development',
            'Focus on risk-based policy frameworks',
            'Automate compliance reporting'
        ]
    }

async def content_generation_executor(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Mock content generation task execution"""
    print(f"    ✍️ Generating content: {payload.get('type', 'article')}")
    await simulate_delay(1200)
    return {
        'content_length': 2500,
        'sections': ['Introduction', 'Key Findings', 'Recommendations', 'Conclusion'],
        'readability_score': 8.2,
        'draft_status': 'ready_for_review'
    }

async def fact_verification_executor(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Mock fact verification task execution"""
    print(f"    ✅ Verifying facts in: {payload.get('content_id', 'unknown')}")
    await simulate_delay(600)
    return {
        'facts_checked': 23,
        'verified': 21,
        'flagged': 2,
        'accuracy_score': 0.91,
        'verification_complete': True
    }

async def market_analysis_executor(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Mock market analysis task execution"""
    symbols = payload.get('symbols', ['UNKNOWN'])
    print(f"    📈 Analyzing market data for: {', '.join(symbols)}")
    await simulate_delay(400)
    return {
        'symbols_analyzed': len(symbols),
        'market_trend': 'bullish',
        'volatility': 'medium', 
        'confidence_level': 0.85
    }

async def trade_recommendation_executor(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Mock trade recommendation task execution"""
    print(f"    💡 Generating trade recommendations...")
    await simulate_delay(300)
    return {
        'action': 'buy',
        'quantity': 100,
        'target_price': 850.00,
        'stop_loss': 800.00,
        'confidence': 0.78,
        'reasoning': 'Strong technical indicators and positive sentiment'
    }

# ─── Crew Definitions ──────────────────────────────────────────────────────

async def create_research_crew(vienna: ViennaCrewAIAdapter) -> Crew:
    """Create a research crew with Vienna OS governance"""
    
    # Define agents
    researcher = Agent(
        role="Senior Researcher",
        goal="Conduct thorough research on assigned topics",
        backstory="Expert in market research and trend analysis"
    )
    
    analyst = Agent(
        role="Data Analyst", 
        goal="Analyze research data and identify patterns",
        backstory="Specialist in statistical analysis and insights"
    )
    
    fact_checker = Agent(
        role="Fact Checker",
        goal="Verify accuracy of research findings", 
        backstory="Detail-oriented verification specialist"
    )
    
    # Define governed tasks
    research_task = Task(
        description="Research AI governance trends",
        agent=researcher,
        execution_function=lambda: governed_task(
            vienna, 'web_research', 
            {'query': 'AI governance trends 2024', 'depth': 'comprehensive'},
            web_research_executor
        )
    )
    
    analysis_task = Task(
        description="Analyze research findings",
        agent=analyst,
        execution_function=lambda: governed_task(
            vienna, 'data_analysis',
            {'sources': ['web_research'], 'focus': 'regulatory_trends'},
            data_analysis_executor
        )
    )
    
    verification_task = Task(
        description="Verify research accuracy",
        agent=fact_checker, 
        execution_function=lambda: governed_task(
            vienna, 'fact_verification',
            {'content_id': 'research_analysis', 'standards': 'academic'},
            fact_verification_executor
        )
    )
    
    return Crew(
        agents=[researcher, analyst, fact_checker],
        tasks=[research_task, analysis_task, verification_task]
    )

async def create_content_crew(vienna: ViennaCrewAIAdapter) -> Crew:
    """Create a content creation crew with Vienna OS governance"""
    
    writer = Agent(
        role="Content Writer",
        goal="Create engaging and informative content",
        backstory="Professional writer with expertise in technical topics"
    )
    
    editor = Agent(
        role="Content Editor",
        goal="Review and improve written content",
        backstory="Experienced editor focused on clarity and accuracy"
    )
    
    # Define governed tasks
    writing_task = Task(
        description="Write article on research findings",
        agent=writer,
        execution_function=lambda: governed_task(
            vienna, 'content_generation',
            {'type': 'article', 'topic': 'ai_governance', 'target_audience': 'business'},
            content_generation_executor
        )
    )
    
    editing_task = Task(
        description="Edit and improve the article", 
        agent=editor,
        execution_function=lambda: governed_task(
            vienna, 'content_generation',
            {'type': 'editing', 'content_id': 'article_draft', 'style': 'business'},
            content_generation_executor  # Reusing executor for simplicity
        )
    )
    
    return Crew(
        agents=[writer, editor],
        tasks=[writing_task, editing_task]
    )

async def create_finance_crew(vienna: ViennaCrewAIAdapter) -> Crew:
    """Create a finance crew with Vienna OS governance (demonstrates T2 approval)"""
    
    market_analyst = Agent(
        role="Market Analyst",
        goal="Analyze financial markets and trends",
        backstory="Expert in financial analysis and market prediction"
    )
    
    trader = Agent(
        role="Algorithmic Trader", 
        goal="Execute trades based on analysis",
        backstory="Experienced in algorithmic trading strategies"
    )
    
    # Define governed tasks (these will require approval)
    analysis_task = Task(
        description="Analyze market conditions",
        agent=market_analyst,
        execution_function=lambda: governed_task(
            vienna, 'market_analysis',
            {'symbols': ['NVDA', 'MSFT', 'GOOGL'], 'timeframe': '1d'},
            market_analysis_executor
        )
    )
    
    trading_task = Task(
        description="Generate trade recommendations",
        agent=trader,
        execution_function=lambda: governed_task(
            vienna, 'trade_recommendation',
            {'analysis_id': 'market_analysis_1', 'risk_tolerance': 'medium'},
            trade_recommendation_executor
        )
    )
    
    return Crew(
        agents=[market_analyst, trader],
        tasks=[analysis_task, trading_task]
    )

# ─── Demo Runner ───────────────────────────────────────────────────────────

async def run_crew_demo(scenario: str = "all"):
    """Run the CrewAI + Vienna OS integration demo"""
    
    print(f"""
╔══════════════════════════════════════════════════════════╗
║            Vienna OS + CrewAI Integration                ║
║       Multi-Agent Governance with Policy Enforcement     ║
╚══════════════════════════════════════════════════════════╝
""")

    # Initialize Vienna OS adapter
    vienna = create_for_crewai(
        api_key=os.getenv('VIENNA_API_KEY', 'vna_demo_key'),
        agent_id='crewai-demo-coordinator'
    )

    # Register with Vienna OS fleet
    try:
        await vienna.register({
            'crew_type': 'demo_crews',
            'capabilities': 'research,content,analysis',
            'framework': 'crewai',
            'version': '1.0.0'
        })
    except Exception:
        print("⚠️  Crew registration skipped (demo mode)")

    scenarios_to_run = []
    
    if scenario == "all":
        scenarios_to_run = ["research_crew", "content_crew", "finance_crew"]
    else:
        scenarios_to_run = [scenario]

    for scenario_name in scenarios_to_run:
        print(f"\n{'='*60}")
        
        if scenario_name == "research_crew":
            print(f"Scenario: Research Crew (T0/T1 - Auto/Policy Approved)")
            print(f"Description: Research crew performs web research, analysis, and fact-checking")
            print(f"Expected: All tasks approved automatically or by policy")
            
            crew = await create_research_crew(vienna)
            
        elif scenario_name == "content_crew":
            print(f"Scenario: Content Creation Crew (T1 - Policy Approved)")
            print(f"Description: Writers and editors create and review content")
            print(f"Expected: Content tasks approved by policy, audit trail maintained")
            
            crew = await create_content_crew(vienna)
            
        elif scenario_name == "finance_crew":
            print(f"Scenario: Finance Crew (T2 - Human Approval Required)")
            print(f"Description: Market analysis and trading recommendations")
            print(f"Expected: Financial operations require human approval")
            
            crew = await create_finance_crew(vienna)
            
        else:
            print(f"Unknown scenario: {scenario_name}")
            continue
            
        print(f"{'='*60}")
        
        try:
            result = await crew.kickoff()
            print(f"\n  🎯 Crew Result: {result['status']}")
            print(f"  📊 Tasks Completed: {len(result.get('results', []))}")
        except Exception as error:
            print(f"\n  ⚠️  Crew execution result: {error}")
        
        if scenario_name != scenarios_to_run[-1]:
            print(f"\n⏸️  Pausing 3 seconds before next crew...")
            await asyncio.sleep(3)

    print(f"""
{'='*60}

✅ CrewAI + Vienna OS integration demo complete!

Key takeaways:
• Multi-agent crews can be governed as coordinated units
• Individual task governance with crew-level context
• Risk-based approval workflows for different agent roles
• Full audit trails for crew activities and decisions
• Policy enforcement across agent collaboration

Governance in action:
• Research Crew: T0/T1 tasks auto-approved by policy
• Content Crew: T1 tasks approved with content policies  
• Finance Crew: T2 tasks require human approval workflow
• All actions: Logged to immutable audit trail

Next steps:
• Configure crew-specific policies in Vienna console
• Set up approval workflows for high-risk crew activities
• Monitor crew performance with fleet management
• Scale to production with proper error handling

Documentation: https://regulator.ai/docs/integrations/crewai
""")

# ─── Main ──────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description='Vienna OS + CrewAI Integration Demo')
    parser.add_argument(
        '--scenario', 
        choices=['research_crew', 'content_crew', 'finance_crew', 'all'],
        default='all',
        help='Which crew scenario to run (default: all)'
    )
    
    args = parser.parse_args()
    
    try:
        asyncio.run(run_crew_demo(args.scenario))
    except KeyboardInterrupt:
        print("\n\n👋 Demo interrupted by user")
    except Exception as error:
        print(f"\n❌ Demo failed: {error}")
        exit(1)

if __name__ == "__main__":
    main()