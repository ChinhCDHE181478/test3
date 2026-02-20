from typing import Annotated, Literal
from langchain_core.messages import ToolMessage
from langchain_core.tools import InjectedToolCallId, tool
from langgraph.prebuilt import InjectedState
from langgraph.types import Command


@tool
def transfer_to_chatbot(
    state: Annotated[dict, InjectedState],
    tool_call_id: Annotated[str, InjectedToolCallId],
) -> Command[Literal["chatbot"]]:
    """Transfer the itinerary to Chatbot"""
    itinerary = state["itinerary"]
    summary = (
        f"Itinerary created for {itinerary.trip_summary.destinations} "
        f"({itinerary.trip_summary.total_days} days). "
        f"Budget: {itinerary.trip_summary.estimated_total_budget.min}-"
        f"{itinerary.trip_summary.estimated_total_budget.max} "
        f"{itinerary.trip_summary.estimated_total_budget.currency.value}."
    )
    return Command(
        goto="chatbot",
        update={
            "itinerary": itinerary,
            "messages": state["messages"]
            + [
                ToolMessage(
                    content=f"Transfer to Chatbot. Create itinerary successfully. Summary: {summary}",
                    tool_call_id=tool_call_id,
                    name="transfer_to_chatbot",
                )
            ],
        },
        graph=Command.PARENT,
    )

transfer_to_chatbot.name="transfer_to_chatbot"
transfer_to_chatbot.description="Transfer the itinerary to Chatbot"
