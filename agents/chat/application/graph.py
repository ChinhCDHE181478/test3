from datetime import datetime

from langgraph.prebuilt import create_react_agent

from chat.domain.prompt import TRAVEL_ASSISTANT_TEMPLATE
from shared.infrastructure.llm import llm
from shared.runtime import ContextSchema
from chat.application.nodes import summarize_node
from chat.application.tools import search_tool, search_for_places
from chat.application.tools import plan_itinerary
from hotel.application.tools import recommend_hotels, recommend_hotels_multi
from chat.application.state import ChatbotState


def make_prompt(state: ChatbotState):
    system_prompt = TRAVEL_ASSISTANT_TEMPLATE.format(
        tavily_search="tavily_search",
        search_for_places="search_for_places",
        plan_itinerary="plan_itinerary",
        recommend_hotels="recommend_hotels",
        current_datetime=datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    )
    if state.get("summary"):
        system_prompt += (
            f"\n\nSummary of previous conversation with user: \n\n{state['summary']}"
        )
    return [
        {"role": "system", "content": system_prompt},
        *state["messages"],
    ]


tools = [
    search_tool,
    search_for_places,
    plan_itinerary,
    recommend_hotels,
    recommend_hotels_multi,
]

# Identify any tools without a name and auto-fix or raise error
for t in tools:
    if not t.name:
         # Try to infer from function name if possible, or set a default
         if hasattr(t, 'func') and hasattr(t.func, '__name__'):
             t.name = t.func.__name__
         else:
             t.name = f"tool_{id(t)}"
             
chatbot = create_react_agent(
    model=llm,
    state_schema=ChatbotState,
    context_schema=ContextSchema,
    tools=tools,
    prompt=make_prompt,
    pre_model_hook=summarize_node,
    name="chatbot",
)
