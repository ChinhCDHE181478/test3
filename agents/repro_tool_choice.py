
import asyncio
from langchain_groq import ChatGroq
from langchain_core.tools import tool
from shared.infrastructure.config.settings import settings

llm = ChatGroq(model="llama-3.3-70b-versatile", groq_api_key=settings.GROQ_API_KEY)

@tool("transfer_to_chatbot")
async def transfer_to_chatbot(state: dict):
    """Transfer to chatbot"""
    return "Transferred"

async def repro():
    llm_with_tools = llm.bind_tools([transfer_to_chatbot], tool_choice="transfer_to_chatbot")
    try:
        print("Attempting forced tool call...")
        # The prompt "Transfer to Chatbot" should be enough for any reasonable model to call the tool
        response = await llm_with_tools.ainvoke("Transfer to Chatbot")
        print(f"Success! Response: {response}")
    except Exception as e:
        print(f"Caught expected error: {e}")

if __name__ == "__main__":
    asyncio.run(repro())
