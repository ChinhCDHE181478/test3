
import asyncio
from langchain_core.messages import AIMessage
import uuid

async def test_static_tool_call():
    print("Testing static tool call generation...")
    # This simulates what we did in the transfer_node
    tool_call_id = f"call_{uuid.uuid4().hex}"
    response = AIMessage(
        content="",
        tool_calls=[
            {
                "name": "transfer_to_chatbot",
                "args": {},
                "id": tool_call_id,
                "type": "tool_call",
            }
        ],
    )
    
    print(f"Generated message: {response}")
    assert len(response.tool_calls) == 1
    assert response.tool_calls[0]["name"] == "transfer_to_chatbot"
    print("Success! Static tool call generated correctly.")

if __name__ == "__main__":
    asyncio.run(test_static_tool_call())
