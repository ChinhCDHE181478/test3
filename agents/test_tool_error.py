
import asyncio
import os
import sys
from langchain_core.tools import tool, StructuredTool
from langchain_groq import ChatGroq
from shared.infrastructure.config.settings import settings

# Add the current directory to sys.path to allow imports
sys.path.append(os.getcwd())

async def test_error():
    print(f"Testing with model: {settings.MODEL_NAME}")
    
    llm = ChatGroq(
        model=settings.MODEL_NAME,
        temperature=0,
        max_retries=1,
    )

    # Import actual tools
    from chat.application.tools import search_tool, search_for_places, plan_itinerary
    from hotel.application.tools import recommend_hotels, recommend_hotels_multi
    
    tools = [
        search_tool,
        search_for_places,
        plan_itinerary,
        recommend_hotels,
        recommend_hotels_multi,
    ]
    
    # Print tool names to verify they are present in Python objects
    for t in tools:
        print(f"Tool: {t.name}, Type: {type(t)}")

    print("Binding tools...")
    try:
        llm_with_tools = llm.bind_tools(tools)
        print("Bind successful. Invoking astream...")
        
        async for chunk in llm_with_tools.astream("Plan a trip to Hanoi"):
            print(f"Chunk: {chunk.content}")
    except Exception as e:
        error_msg = f"Caught error during bind/invoke: {e}\n"
        print(error_msg)
        import traceback
        traceback.print_exc()
        with open("tool_error.log", "w") as f:
            f.write(error_msg)
            f.write(traceback.format_exc())

if __name__ == "__main__":
    asyncio.run(test_error())
