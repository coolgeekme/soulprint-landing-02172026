"""
RLM Memory Service for SoulPrint
A Python microservice that uses Recursive Language Models for intelligent memory retrieval.
Replaces traditional RAG with recursive exploration of user's chat history.
"""

import os
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

# Add RLM to path
import sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'lib', 'rlm-core'))

from rlm import RLM
from rlm.logger import RLMLogger

app = FastAPI(title="RLM Memory Service", version="1.0.0")

# CORS for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://*.vercel.app"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# RLM System prompt for memory exploration
MEMORY_SYSTEM_PROMPT = """You are a memory exploration agent for a personalized AI companion.

Your task: Given a user's query and their conversation history, recursively explore the history to find ALL relevant information.

You have access to a variable `history` containing the user's past conversations.

CAPABILITIES:
- Search through history for relevant conversations
- Extract key facts, preferences, decisions, and patterns
- Connect related topics across different conversations
- Identify emotional context and significance

OUTPUT FORMAT:
Return a JSON object with:
{
    "relevant_memories": [
        {"content": "...", "timestamp": "...", "significance": "high/medium/low"},
        ...
    ],
    "patterns_detected": ["..."],
    "user_context": "Brief summary of what this reveals about the user"
}

Be thorough. The user's AI companion needs this context to respond authentically."""


class MemoryQuery(BaseModel):
    user_id: str
    query: str
    history: str  # The user's conversation history as text
    max_depth: int = 1
    max_iterations: int = 20


class MemoryResponse(BaseModel):
    relevant_memories: list[dict]
    patterns_detected: list[str]
    user_context: str
    raw_response: Optional[str] = None
    iterations: int = 0
    success: bool = True
    error: Optional[str] = None


@app.get("/health")
async def health():
    return {"status": "ok", "service": "rlm-memory"}


@app.post("/query", response_model=MemoryResponse)
async def query_memory(req: MemoryQuery):
    """
    Query user's memory/history using RLM for intelligent exploration.
    """
    try:
        # Initialize RLM with AWS Bedrock (matches SoulPrint's LLM backend)
        rlm = RLM(
            backend="bedrock",  # or "openai" as fallback
            backend_kwargs={
                "model_name": os.getenv("BEDROCK_MODEL_ID", "us.anthropic.claude-3-5-haiku-20241022-v1:0"),
                "region": os.getenv("AWS_REGION", "us-east-1"),
            },
            environment="local",  # Use local for now, can switch to docker/modal
            max_depth=req.max_depth,
            max_iterations=req.max_iterations,
            custom_system_prompt=MEMORY_SYSTEM_PROMPT,
            verbose=False,
        )
        
        # Build the prompt with history as context
        user_prompt = f"""
User Query: {req.query}

The variable `history` contains the user's conversation history:

```
history = \"\"\"{req.history}\"\"\"
```

Explore this history to find all information relevant to the query.
Return your findings as JSON.
"""
        
        # Run RLM completion
        result = rlm.completion(user_prompt)
        
        # Parse the response
        response_text = result.response if hasattr(result, 'response') else str(result)
        
        # Try to extract JSON from response
        import json
        try:
            # Find JSON in response
            start = response_text.find('{')
            end = response_text.rfind('}') + 1
            if start >= 0 and end > start:
                parsed = json.loads(response_text[start:end])
                return MemoryResponse(
                    relevant_memories=parsed.get("relevant_memories", []),
                    patterns_detected=parsed.get("patterns_detected", []),
                    user_context=parsed.get("user_context", ""),
                    raw_response=response_text,
                    iterations=getattr(result, 'iterations', 0),
                    success=True,
                )
        except json.JSONDecodeError:
            pass
        
        # Fallback: return raw response
        return MemoryResponse(
            relevant_memories=[{"content": response_text, "significance": "unknown"}],
            patterns_detected=[],
            user_context="",
            raw_response=response_text,
            success=True,
        )
        
    except Exception as e:
        return MemoryResponse(
            relevant_memories=[],
            patterns_detected=[],
            user_context="",
            error=str(e),
            success=False,
        )


@app.post("/explore")
async def explore_history(req: MemoryQuery):
    """
    Open-ended exploration of user's history.
    Returns insights and patterns without a specific query focus.
    """
    req.query = "Analyze this user's conversation history. What are their main interests, communication style, recurring topics, and key life events?"
    return await query_memory(req)


if __name__ == "__main__":
    port = int(os.getenv("RLM_PORT", "8100"))
    print(f"🧠 RLM Memory Service starting on port {port}")
    uvicorn.run(app, host="0.0.0.0", port=port)
