from typing import Any, AsyncIterator, Dict, Optional, Sequence, Tuple
from uuid import uuid4
import traceback
from loguru import logger

from dataclasses import dataclass

from shared.data_stream.stream_parts import (
    DataStreamDataPart,
    DataStreamErrorPart,
    DataStreamFinishPart,
    DataStreamFinishStepPart,
    DataStreamStartPart,
    DataStreamStartStepPart,
    DataStreamTerminationPart,
    DataStreamTextDeltaPart,
    DataStreamTextEndPart,
    DataStreamTextStartPart,
)


@dataclass
class CustomDataStreamConfig:
    key: str
    node_name: str
    data_type: str


class StreamResponse:
    """Vercel AI SDK v5 compatible stream response"""

    _iterator: AsyncIterator[Dict[str, Any] | Any]
    _messages_streamable_nodes: Optional[Sequence[str]]
    _custom_data_stream_config: Sequence[CustomDataStreamConfig]
    _message_started: bool
    _message_id: str
    _text_id: str

    def __init__(
        self,
        iterator: AsyncIterator[Dict[str, Any] | Any],
        messages_streamable_nodes: Optional[Sequence[str]] = None,
        custom_data_stream_config: Optional[Sequence[CustomDataStreamConfig]] = None,
    ):
        self._iterator = iterator
        self._messages_streamable_nodes = messages_streamable_nodes
        self._message_started = False
        self._message_id = f"{uuid4().hex}"
        self._text_id = f"msg_{self._message_id}"
        self._custom_data_stream_config = custom_data_stream_config or []

    async def __aiter__(self):
        try:
            async for chunk in self._iterator:
                if isinstance(chunk, tuple):
                    if len(chunk) == 3:
                        namespace, stream_mode, data = chunk
                    elif len(chunk) == 2:
                        namespace, (stream_mode, data) = (), chunk
                    else:
                        continue

                    if (
                        stream_mode == "messages"
                        and isinstance(data, tuple)
                        and len(data) == 2
                    ):
                        for part in self._stream_text_delta(data, namespace=namespace):
                            yield part
                    elif stream_mode == "custom" and isinstance(data, dict):
                        for part in self._stream_custom_data(data):
                            yield part

        except Exception as e:
            error_trace = traceback.format_exc()
            print(f"!!! Stream error: {e}")
            print(error_trace)
            yield DataStreamErrorPart(error=str(e)).format()
        finally:
            if self._message_started:
                yield DataStreamTextEndPart(self._text_id).format()
                yield DataStreamFinishStepPart().format()
                yield DataStreamFinishPart().format()
        yield DataStreamTerminationPart().format()

    def _stream_text_delta(self, step: Tuple, namespace: Tuple = ()):
        message, metadata = step
        node_name = metadata.get("langgraph_node")
        
        # Only stream AIMessages (including chunks)
        from langchain_core.messages import AIMessage
        if not isinstance(message, AIMessage):
            return

        # Explicitly block tool calls from streaming to text
        if hasattr(message, "tool_calls") and message.tool_calls:
            return

        is_streamable = False
        if self._messages_streamable_nodes is not None:
            # We only want to stream from the PRIMARY conversational nodes.
            # Usually named 'agent' inside a react agent subgraph, or the node name itself.
            # We must be careful not to allow 'tools' nodes to stream their internal LLM tokens.
            allowed_node_names = ["agent", "chatbot", "chatbot_node"]
            
            if node_name in allowed_node_names:
                # If it's a direct match or matches an allowed base name
                if node_name in self._messages_streamable_nodes:
                    is_streamable = True
                
                # If it's inside a subgraph, check if the subgraph is in streamable nodes
                if not is_streamable and namespace:
                    for ns_item in namespace:
                        if isinstance(ns_item, str):
                            base_ns = ns_item.split(":")[0]
                            if base_ns in self._messages_streamable_nodes:
                                is_streamable = True
                                break
        else:
            is_streamable = True

        # Safety check: if content looks like raw JSON data (starts with {), skip it.
        # This prevents internal data extraction from leaking as text deltas.
        if is_streamable and hasattr(message, "content") and message.content:
            content = message.content.strip()
            if content.startswith("{") and content.endswith("}"):
                # Likely JSON data, probably should have been a custom part.
                return

            if not self._message_started:
                yield DataStreamStartPart(self._message_id).format()
                yield DataStreamStartStepPart().format()
                yield DataStreamTextStartPart(self._text_id).format()
                self._message_started = True
            yield DataStreamTextDeltaPart(
                self._text_id, message.content
            ).format()

    def _stream_custom_data(self, step: Dict[str, Any]):
        if len(self._custom_data_stream_config) > 0:
            for config in self._custom_data_stream_config:
                step_key = config.key
                node_name = config.node_name
                data_type = config.data_type

                payload = step.get(step_key)
                if payload:
                    data = payload.get("data")
                    metadata = payload.get("metadata", {})
                    if metadata.get("langgraph_node") == node_name:
                        yield DataStreamDataPart(data_type, data).format()
