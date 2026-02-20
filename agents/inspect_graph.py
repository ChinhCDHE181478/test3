
import asyncio
import os
import sys
from langgraph.prebuilt import ToolNode

# Add the current directory to sys.path to allow imports
sys.path.append(os.getcwd())

from chat.application.graph import chatbot
from plan.application.graph import plan_agent
from hotel.application.graph import hotel_agent

def inspect_agent(agent_name, agent):
    print(f"\nInspecting Agent: {agent_name}")
    # Compile-time tools
    try:
        # For react agents or compiled graphs, we can look at the nodes
        for node_name, node in agent.nodes.items():
            # Check if it's a ToolNode
            if isinstance(node, ToolNode):
                 print(f"  Node '{node_name}' is a ToolNode. Tools:")
                 for t in node.tools:
                     name = getattr(t, 'name', 'MISSING_NAME_ATTR')
                     print(f"    - Tool: '{name}' ({type(t)})")
                     if not name or name == 'MISSING_NAME_ATTR':
                         print(f"      !!! ERROR: Tool in {agent_name}/{node_name} has no name!")
            
            # If it's a RunnableSequence or similar, it might have tools bound
            # In LangGraph 0.2+, nodes are usually nodes.
            pass
            
        # Also check bound tools if it's a model node
        # This is harder to introspect from the compiled graph easily without running it, 
        # but we can check the tools list passed to create_react_agent for chatbot
    except Exception as e:
        print(f"  Error inspecting nodes of {agent_name}: {e}")

def main():
    # Chatbot tools (it's a react agent)
    from chat.application.graph import tools as chat_tools
    print("\nInspecting Chatbot tools list:")
    for t in chat_tools:
        name = getattr(t, 'name', 'MISSING_NAME_ATTR')
        print(f"  - Tool: '{name}'")
        if not name or name == 'MISSING_NAME_ATTR':
             print(f"    !!! ERROR: Tool in chatbot.tools has no name!")

    inspect_agent("plan_agent", plan_agent)
    inspect_agent("hotel_agent", hotel_agent)

if __name__ == "__main__":
    main()
