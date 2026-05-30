import { useState, useCallback, useRef } from 'react';

interface SSEOptions {
  /** Max auto-retry attempts (default 3) */
  maxRetries?: number;
  /** Base delay in ms before first retry (default 1000) */
  retryBaseDelay?: number;
}

/**
 * SSE streaming hook with exponential backoff auto-reconnect.
 *
 * Returns `streaming`, `content`, `status`, `error`, `retryCount`, `startStream`,
 * `cancelStream`, `reset`, and `setContent`.
 */
export function useSSE(opts: SSEOptions = {}) {
  const { maxRetries = 3, retryBaseDelay = 1000 } = opts;

  const [streaming, setStreaming] = useState(false);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const controllerRef = useRef<AbortController | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Store the last request params for reconnection
  const lastRequestRef = useRef<{ url: string; body: unknown } | null>(null);
  // Track accumulated content across retries
  const contentAccRef = useRef('');
  // Track if cancelled intentionally
  const cancelledRef = useRef(false);

  const startStream = useCallback(
    (url: string, body: unknown) => {
      // Cancel any previous stream
      controllerRef.current?.abort();
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);

      cancelledRef.current = false;
      setStreaming(true);
      setContent('');
      setStatus('正在连接...');
      setError(null);
      setRetryCount(0);
      contentAccRef.current = '';

      lastRequestRef.current = { url, body };
      _connect(url, body, 0);
    },
    [],
  );

  const _connect = useCallback(
    (url: string, body: unknown, attempt: number) => {
      const controller = new AbortController();
      controllerRef.current = controller;

      fetch(`/api${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            const errText = await res.text();
            setError(errText || `HTTP ${res.status}`);
            setStreaming(false);
            return;
          }

          setStatus('接收中...');
          const reader = res.body?.getReader();
          if (!reader) { setStreaming(false); return; }

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  if (data.type === 'chunk') {
                    contentAccRef.current += data.content;
                    setContent(contentAccRef.current);
                  } else if (data.type === 'status') {
                    setStatus(data.message);
                  } else if (data.type === 'done') {
                    setStatus('完成 ✓');
                    setStreaming(false);
                    setRetryCount(0);
                    return;
                  } else if (data.type === 'error') {
                    setError(data.content || data.message || '生成错误');
                    setStreaming(false);
                    return;
                  }
                } catch { /* ignore malformed JSON */ }
              }
            }
          }

          // Stream ended without 'done' event — may be a disconnect
          if (!cancelledRef.current) {
            _scheduleRetry(attempt);
          } else {
            setStreaming(false);
          }
        })
        .catch((err) => {
          if (err.name === 'AbortError') {
            setStreaming(false);
            return;
          }
          // Network error — try to reconnect
          if (!cancelledRef.current) {
            _scheduleRetry(attempt);
          } else {
            setError(err.message);
            setStreaming(false);
          }
        });
    },
    [],
  );

  const _scheduleRetry = useCallback(
    (attempt: number) => {
      if (attempt >= maxRetries || cancelledRef.current) {
        setError('连接中断，已达最大重试次数。请手动重试。');
        setStreaming(false);
        return;
      }

      const nextAttempt = attempt + 1;
      const delay = retryBaseDelay * Math.pow(2, attempt); // 1s, 2s, 4s, 8s...
      setRetryCount(nextAttempt);
      setStatus(`连接中断，${(delay / 1000).toFixed(0)}s 后自动重试（${nextAttempt}/${maxRetries}）...`);

      retryTimerRef.current = setTimeout(() => {
        if (cancelledRef.current || !lastRequestRef.current) return;
        setStatus(`正在重连（${nextAttempt}/${maxRetries}）...`);
        _connect(lastRequestRef.current.url, lastRequestRef.current.body, nextAttempt);
      }, delay);
    },
    [maxRetries, retryBaseDelay],
  );

  const cancelStream = useCallback(() => {
    cancelledRef.current = true;
    controllerRef.current?.abort();
    if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    setStreaming(false);
    setRetryCount(0);
  }, []);

  const reset = useCallback(() => {
    setContent('');
    setStatus('');
    setError(null);
    setRetryCount(0);
    contentAccRef.current = '';
  }, []);

  return {
    streaming,
    content,
    status,
    error,
    retryCount,
    startStream,
    cancelStream,
    reset,
    setContent,
  };
}
