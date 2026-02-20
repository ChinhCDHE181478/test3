
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from chat.application.graph import tools
from langchain_core.utils.function_calling import convert_to_openai_tool

def debug_schemas():
    print(f"Inspecting {len(tools)} tools for OpenAI/Groq schemas:")
    for i, t in enumerate(tools):
        name = getattr(t, 'name', 'UNKNOWN')
        print(f"\n--- [{i}] Tool: {name} ---")
        try:
            schema = convert_to_openai_tool(t)
            print(f"JSON Schema: {schema}")
            
            # Check for name in the function part of the tool schema
            func_name = schema.get("function", {}).get("name")
            if not func_name:
                print("!!! ERROR: No name in generated schema!")
            else:
                print(f"Schema name: {func_name}")
                
        except Exception as e:
            print(f"!!! Error converting tool to schema: {e}")

if __name__ == "__main__":
    debug_schemas()
