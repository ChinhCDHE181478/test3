from langchain_core.runnables import RunnableConfig
from shared.state import AgentState
from shared.infrastructure.llm import llm
from chat.application.summarize import SummarizeTool

async def summarize_node(state: AgentState, config: RunnableConfig = None):
    """Handles summarizing the message conversation."""
    # Ensure config is not None to avoid get_config() errors in internal ainvoke calls
    safe_config = config or {"configurable": {}}
    if config is None:
        from loguru import logger
        logger.warning("summarize_node: config is None, using empty config")
        
    summarize_tool = SummarizeTool(llm)

    return await summarize_tool.summarize(state, safe_config)
