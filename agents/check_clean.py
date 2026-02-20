
import os
import sys
from langchain_core.utils.function_calling import convert_to_openai_function

# Add the current directory to sys.path to allow imports
sys.path.append(os.getcwd())

from chat.application.tools import search_for_places, plan_itinerary
from hotel.application.tools import recommend_hotels, recommend_hotels_multi
from plan.application.tools import transfer_to_chatbot

tools = {
    "search_for_places": search_for_places,
    "plan_itinerary": plan_itinerary,
    "recommend_hotels": recommend_hotels,
    "recommend_hotels_multi": recommend_hotels_multi,
    "transfer_to_chatbot": transfer_to_chatbot
}

def check():
    all_ok = True
    for name, tool_obj in tools.items():
        schema = convert_to_openai_function(tool_obj)
        params = schema.get('parameters', {}).get('properties', {})
        leaked = [p for p in ['state', 'tool_call_id'] if p in params]
        if leaked:
            print(f"FAILED: {name} leaked {leaked}")
            all_ok = False
        else:
            print(f"OK: {name}")
    
    if all_ok:
        print("\nALL SCHEMAS CLEAN")

if __name__ == "__main__":
    check()
