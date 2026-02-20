
import asyncio
from unittest.mock import MagicMock
from langchain_core.messages import AIMessage

async def test_nodes():
    print("Testing plan_agent transfer_node...")
    from plan.application.nodes import transfer_node as plan_transfer_node
    
    mock_state = {"messages": []}
    mock_config = MagicMock()
    
    result = await plan_transfer_node(mock_state, mock_config)
    msg = result["messages"][0]
    
    print(f"Plan transfer result message type: {type(msg)}")
    assert isinstance(msg, AIMessage)
    assert len(msg.tool_calls) == 1
    assert msg.tool_calls[0]["name"] == "transfer_to_chatbot"
    print("Plan transfer node verification: SUCCESS")

    print("\nTesting hotel_agent transfer_node...")
    from hotel.application.nodes import transfer_node as hotel_transfer_node
    
    mock_state_hotel = {"messages": []}
    result_hotel = await hotel_transfer_node(mock_state_hotel, mock_config)
    msg_hotel = result_hotel["messages"][0]
    
    print(f"Hotel transfer result message type: {type(msg_hotel)}")
    assert isinstance(msg_hotel, AIMessage)
    assert len(msg_hotel.tool_calls) == 1
    assert msg_hotel.tool_calls[0]["name"] == "transfer_to_chatbot"
    print("Hotel transfer node verification: SUCCESS")

if __name__ == "__main__":
    try:
        asyncio.run(test_nodes())
    except Exception as e:
        print(f"Verification failed: {e}")
        import traceback
        traceback.print_exc()
