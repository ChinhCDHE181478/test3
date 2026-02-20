
import asyncio
import os
import sys
from langgraph.prebuilt import create_react_agent

# Add the current directory to sys.path to allow imports
sys.path.append(os.getcwd())

from chat.application.graph import chatbot
from plan.application.graph import plan_agent
from hotel.application.graph import hotel_agent

def inspect_agent(agent, name):
    print(f"\nInspecting Agent: {name}")
    try:
        nodes = agent.get_graph().nodes
        print(f"Nodes: {list(nodes.keys())}")
        
        # Check for 'agent' node or similar where model is called
        if 'agent' in nodes:
            print("Found 'agent' node.")
            # It's hard to extract the *bound* tools from the compiled node easily without running it
            # But we can check the 'tools' node to see what tools it has
            
        if 'tools' in nodes:
            tool_node = nodes['tools'].data
            print(f"Found 'tools' node with tools: {list(tool_node.tools_by_name.keys())}")
            for tool_name, tool in tool_node.tools_by_name.items():
                print(f"  Tool: {tool_name}, Name attr: '{tool.name}'")
                if not tool.name:
                     print(f"  WARNING: Tool {tool_name} has empty name!")
                
    except Exception as e:
        print(f"Error inspecting agent {name}: {e}")

async def main():
    inspect_agent(chatbot, "chatbot")
    inspect_agent(plan_agent, "plan_agent")
    inspect_agent(hotel_agent, "hotel_agent")

if __name__ == "__main__":
    asyncio.run(main())
