import asyncio
import sys
from aggregate.agent import Agent
from shared.runtime import ContextSchema

async def main():
    agent = Agent()
    context = ContextSchema(
        googlemaps_api=None,
        booking_api=None,
    )
    
    # Simple prompt
    content = "Hello, tell me about Da Lat briefly."
    session_id = "test_session_123"
    user_id = "test_user_456"
    
    print(f"Streaming response for: {content}")
    async for part in agent.stream_response(session_id, user_id, content, context):
        print(f"PART: {part}", end="")

if __name__ == "__main__":
    asyncio.run(main())
