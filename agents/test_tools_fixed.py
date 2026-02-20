
import asyncio
from typing import Annotated
from langchain_core.runnables import RunnableConfig
from langgraph.prebuilt import InjectedState
from chat.application.tools import plan_itinerary
from shared.models import Plan
from langchain_core.messages import HumanMessage

async def test_plan_itinerary():
    print("Testing plan_itinerary tool with config...")
    state = {
        "messages": [HumanMessage(content="I want to go to Hanoi for 3 days")],
        "language": "vi",
        "summary": ""
    }
    config: RunnableConfig = {"configurable": {"thread_id": "test"}}
    
    try:
        # This will call chain.ainvoke inside plan_itinerary
        # If config is passed correctly, it should NOT raise get_config error
        result = await plan_itinerary(state=state, config=config)
        print(f"Tool Result: {result}")
    except Exception as e:
        print(f"Caught error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_plan_itinerary())
