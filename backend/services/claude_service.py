"""LLM service — supports Anthropic and DeepSeek APIs.

Accepts optional api_key parameter on all generation functions.
If not provided, falls back to ANTHROPIC_API_KEY from config/.env.
"""
import asyncio
from typing import AsyncGenerator
from config import ANTHROPIC_API_KEY, DEFAULT_MODEL


def _detect_provider(key: str) -> str:
    """Detect API provider from key prefix."""
    if key.startswith("sk-ant-"):
        return "anthropic"
    return "deepseek"


def _resolve_key(api_key: str | None = None) -> str:
    """Resolve effective API key: param override > env var."""
    return (api_key or ANTHROPIC_API_KEY or "").strip()


def is_available(api_key: str | None = None) -> bool:
    """Check if API is configured."""
    return bool(_resolve_key(api_key))


# ── Public API ────────────────────────────────────────────────────────────

async def stream_generate(
    system_prompt: str,
    user_message: str,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    api_key: str | None = None,
) -> AsyncGenerator[str, None]:
    """Stream content generation. Uses api_key param if provided, else env var."""
    key = _resolve_key(api_key)
    if not key:
        yield "错误：未配置 API Key。请在设置中填入您的 API Key。"
        return

    provider = _detect_provider(key)
    if provider == "anthropic":
        async for chunk in _stream_anthropic(system_prompt, user_message, temperature, max_tokens, key):
            yield chunk
    else:
        async for chunk in _stream_deepseek(system_prompt, user_message, temperature, max_tokens, key):
            yield chunk


async def generate_sync(
    system_prompt: str,
    user_message: str,
    temperature: float = 0.7,
    max_tokens: int = 4096,
    api_key: str | None = None,
) -> str:
    """Non-streaming generation. Uses api_key param if provided, else env var."""
    key = _resolve_key(api_key)
    if not key:
        return "错误：未配置 API Key。请在设置中填入您的 API Key。"

    provider = _detect_provider(key)
    if provider == "anthropic":
        return await _sync_anthropic(system_prompt, user_message, temperature, max_tokens, key)
    else:
        return await _sync_deepseek(system_prompt, user_message, temperature, max_tokens, key)


async def validate_key(api_key: str) -> dict:
    """Quickly test whether an API key is valid.

    Returns: {"valid": bool, "provider": str, "error": str}
    """
    if not api_key or not api_key.strip():
        return {"valid": False, "provider": "", "error": "Key 为空"}
    key = api_key.strip()
    provider = _detect_provider(key)
    try:
        if provider == "anthropic":
            from anthropic import AsyncAnthropic
            client = AsyncAnthropic(api_key=key)
            await client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=1,
                messages=[{"role": "user", "content": "hi"}],
            )
        else:
            from openai import AsyncOpenAI
            client = AsyncOpenAI(api_key=key, base_url="https://api.deepseek.com/v1")
            await client.chat.completions.create(
                model="deepseek-chat",
                max_tokens=1,
                messages=[{"role": "user", "content": "hi"}],
            )
        return {"valid": True, "provider": provider, "error": ""}
    except Exception as e:
        return {"valid": False, "provider": provider, "error": str(e)}


# ── Anthropic backend ─────────────────────────────────────────────────────

async def _stream_anthropic(
    system_prompt: str, user_message: str,
    temperature: float, max_tokens: int, api_key: str,
):
    try:
        from anthropic import AsyncAnthropic
        client = AsyncAnthropic(api_key=api_key)
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


async def _sync_anthropic(
    system_prompt: str, user_message: str,
    temperature: float, max_tokens: int, api_key: str,
) -> str:
    try:
        from anthropic import Anthropic
        client = Anthropic(api_key=api_key)
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


# ── DeepSeek backend (OpenAI-compatible) ──────────────────────────────────

async def _stream_deepseek(
    system_prompt: str, user_message: str,
    temperature: float, max_tokens: int, api_key: str,
):
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=api_key, base_url="https://api.deepseek.com/v1")
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


async def _sync_deepseek(
    system_prompt: str, user_message: str,
    temperature: float, max_tokens: int, api_key: str,
) -> str:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url="https://api.deepseek.com/v1")
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
