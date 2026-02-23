import asyncio
import sys
from aggregate.agent import Agent

async def main():
    agent = Agent()
    graph = await agent._create_workflow_graph()
    print("Graph Nodes:")
    for node_name in graph.nodes.keys():
        print(f" - {node_name}")

if __name__ == "__main__":
    asyncio.run(main())
