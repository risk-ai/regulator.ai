"""
Vienna OS + CrewAI Integration
Wrap CrewAI crews with Vienna governance
"""

from typing import Optional, Dict, Any, List
from crewai import Agent, Task, Crew
from vienna_os import ViennaClient


class GovernedCrew:
    """CrewAI Crew wrapped with Vienna OS governance"""
    
    def __init__(
        self,
        crew: Crew,
        vienna_client: ViennaClient,
        crew_id: str,
        default_tier: str = "T0"
    ):
        self.crew = crew
        self.vienna_client = vienna_client
        self.crew_id = crew_id
        self.default_tier = default_tier
        
        # Register crew and agents in Vienna OS
        self.vienna_client.register_agent(
            name=crew_id,
            type="crewai_crew",
            description=f"CrewAI crew with {len(crew.agents)} agents",
            default_tier=default_tier,
            capabilities=[agent.role for agent in crew.agents]
        )
        
        # Register individual agents
        for agent in crew.agents:
            self.vienna_client.register_agent(
                name=f"{crew_id}_{agent.role}",
                type="crewai_agent",
                description=agent.goal,
                default_tier=default_tier
            )
    
    def kickoff(self, inputs: Optional[Dict] = None):
        """Run crew with governance"""
        # Execute through Vienna OS
        result = self.vienna_client.execute(
            action="crew_kickoff",
            agent_id=self.crew_id,
            context={
                "inputs": inputs or {},
                "agents": [agent.role for agent in self.crew.agents],
                "tasks": len(self.crew.tasks)
            },
            tier=self.default_tier
        )
        
        # Block if requires approval
        if result.requires_approval:
            raise Exception(f"Crew execution requires approval: {result.execution_id}")
        
        # Run crew
        crew_result = self.crew.kickoff(inputs=inputs)
        
        return {
            "crew_result": crew_result,
            "vienna_execution": result
        }


# Example usage
if __name__ == "__main__":
    from crewai import Agent, Task, Crew
    
    # Initialize Vienna client
    vienna = ViennaClient(
        email="demo@regulator.ai",
        password="vienna2024"
    )
    
    # Create CrewAI agents
    researcher = Agent(
        role="Researcher",
        goal="Research and gather information",
        backstory="Expert at finding and analyzing information"
    )
    
    writer = Agent(
        role="Writer",
        goal="Write compelling content",
        backstory="Creative writer with attention to detail"
    )
    
    # Create tasks
    research_task = Task(
        description="Research Vienna OS",
        agent=researcher
    )
    
    writing_task = Task(
        description="Write a summary",
        agent=writer
    )
    
    # Create crew
    crew = Crew(
        agents=[researcher, writer],
        tasks=[research_task, writing_task]
    )
    
    # Wrap with Vienna governance
    governed_crew = GovernedCrew(
        crew=crew,
        vienna_client=vienna,
        crew_id="research-writing-crew",
        default_tier="T0"
    )
    
    # Run with governance
    result = governed_crew.kickoff({"topic": "Vienna OS"})
    print(result)
