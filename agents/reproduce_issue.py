
import asyncio
import os
import sys
from unittest.mock import MagicMock, patch

# Add the current directory to sys.path to allow imports
sys.path.append(os.getcwd())

# Mock the connection pool before importing Agent to avoid running init logic if any
from unittest.mock import AsyncMock

with patch('shared.infrastructure.connection_pool.get_connection_pool', new=AsyncMock(return_value=None)):
    from aggregate.agent import Agent
    from shared.runtime import ContextSchema

async def reproduce():
    # Patch get_connection_pool with AsyncMock
    with patch('aggregate.agent.get_connection_pool', new=AsyncMock(return_value=None)), \
         patch('aggregate.agent.Agent._get_connection_pool', new=AsyncMock(return_value=None)):
        
        agent = Agent()
        
        # Mock data
        session_id = "test_session_123"
        user_id = "test_user_456"
        content = "Search for famous places in Hanoi"
        
        from shared.infrastructure.config.settings import settings
        print(f"Settings Model Name: {settings.MODEL_NAME}")
        
        # Mock context
        context = ContextSchema(
            googlemaps_api=MagicMock(),
            booking_api=MagicMock()
        )
        
        # Inspect the LLM being used (if possible to access via graph or just check shared.infrastructure.llm)
        from shared.infrastructure.llm import llm
        print(f"Using LLM: {type(llm).__name__}")
        print(f"LLM Model Name: {getattr(llm, 'model_name', 'Unknown')}")

        print("Attempting to stream response...")
        try:
            async for chunk in agent.stream_response(session_id, user_id, content, context):
                print(f"Received chunk: {chunk}")
        except Exception as e:
            error_msg = f"Caught error: {e}\n"
            import traceback
            error_trace = traceback.format_exc()
            print(error_msg)
            print(error_trace)
            with open("error_log.txt", "w") as f:
                f.write(error_msg)
                f.write(error_trace)

if __name__ == "__main__":
    asyncio.run(reproduce())
