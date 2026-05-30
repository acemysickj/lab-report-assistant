"""LLM service — supports Anthropic and DeepSeek APIs."""
import asyncio
from typing import AsyncGenerator
from config import ANTHROPIC_API_KEY, DEFAULT_MODEL, API_PROVIDER


def is_available() -> bool:
    """Check if API is configured."""
    return bool(ANTHROPIC_API_KEY)


async def stream_generate(
    system_prompt: str,
    user_message: str,
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> AsyncGenerator[str, None]:
    """Stream content generation. Routes to Anthropic or DeepSeek based on key."""
    if not ANTHROPIC_API_KEY:
        yield "错误：未配置 ANTHROPIC_API_KEY 环境变量。"
        return

    if API_PROVIDER == "anthropic":
        async for chunk in _stream_anthropic(system_prompt, user_message, temperature, max_tokens):
            yield chunk
    else:
        async for chunk in _stream_deepseek(system_prompt, user_message, temperature, max_tokens):
            yield chunk


async def generate_sync(
    system_prompt: str,
    user_message: str,
    temperature: float = 0.7,
    max_tokens: int = 4096,
) -> str:
    """Non-streaming generation."""
    if not ANTHROPIC_API_KEY:
        return "错误：未配置 ANTHROPIC_API_KEY 环境变量。"

    if API_PROVIDER == "anthropic":
        return await _sync_anthropic(system_prompt, user_message, temperature, max_tokens)
    else:
        return await _sync_deepseek(system_prompt, user_message, temperature, max_tokens)


# --- Anthropic backend ---

async def _stream_anthropic(system_prompt: str, user_message: str, temperature: float, max_tokens: int):
    try:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=ANTHROPIC_API_KEY)
        stream = await client.messages.create(
            model=DEFAULT_MODEL,
            max_tokens=max_tokens,
            temperature=temperature,
            system=system_prompt,
            messages=[{"role": "user", "content": user_message}],
            stream=True,
        )
        async for event in stream:
            if event.type == "content_block_delta":
                if event.delta.type == "text_delta":
                    yield event.delta.text
            elif event.type == "message_stop":
                break
    except Exception as e:
        yield f"\n\n[生成错误: {str(e)}]"


async def _sync_anthropic(system_prompt: str, user_message: str, temperature: float, max_tokens: int) -> str:
    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=ANTHROPIC_API_KEY)
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.messages.create(
                model=DEFAULT_MODEL,
                max_tokens=max_tokens,
                temperature=temperature,
                system=system_prompt,
                messages=[{"role": "user", "content": user_message}],
            ),
        )
        if response.content and len(response.content) > 0:
            return response.content[0].text
        return ""
    except Exception as e:
        return f"[生成错误: {str(e)}]"


# --- DeepSeek backend (OpenAI-compatible) ---

async def _stream_deepseek(system_prompt: str, user_message: str, temperature: float, max_tokens: int):
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(
            api_key=ANTHROPIC_API_KEY,
            base_url="https://api.deepseek.com/v1",
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]
        stream = await client.chat.completions.create(
            model=DEFAULT_MODEL,
            messages=messages,
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True,
        )
        async for chunk in stream:
            if chunk.choices and chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    except Exception as e:
        yield f"\n\n[生成错误: {str(e)}]"


async def _sync_deepseek(system_prompt: str, user_message: str, temperature: float, max_tokens: int) -> str:
    try:
        from openai import OpenAI
        client = OpenAI(
            api_key=ANTHROPIC_API_KEY,
            base_url="https://api.deepseek.com/v1",
        )
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_message},
        ]
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None,
            lambda: client.chat.completions.create(
                model=DEFAULT_MODEL,
                messages=messages,
                temperature=temperature,
                max_tokens=max_tokens,
            ),
        )
        if response.choices and len(response.choices) > 0:
            return response.choices[0].message.content or ""
        return ""
    except Exception as e:
        return f"[生成错误: {str(e)}]"
