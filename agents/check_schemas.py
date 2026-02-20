
import asyncio
import os
import sys
import json
from langchain_core.utils.function_calling import convert_to_openai_function

# Add the current directory to sys.path to allow imports
sys.path.append(os.getcwd())

from chat.application.tools import search_for_places, plan_itinerary
from hotel.application.tools import recommend_hotels, recommend_hotels_multi

def check_tool(name, tool_obj):
    print(f"\nTool: {name}")
    try:
        schema = convert_to_openai_function(tool_obj)
        print(json.dumps(schema, indent=2))
        # Check if 'state' or 'tool_call_id' are in parameters
        params = schema.get('parameters', {}).get('properties', {})
        if 'state' in params:
             print(f"  !!! ERROR: 'state' found in schema for {name}")
        if 'tool_call_id' in params:
             print(f"  !!! ERROR: 'tool_call_id' found in schema for {name}")
    except Exception as e:
        print(f"  Error checking {name}: {e}")

def main():
    check_tool("search_for_places", search_for_places)
    check_tool("plan_itinerary", plan_itinerary)
    check_tool("recommend_hotels", recommend_hotels)
    check_tool("recommend_hotels_multi", recommend_hotels_multi)

if __name__ == "__main__":
    main()
