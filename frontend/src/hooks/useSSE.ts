import { useState, useCallback, useRef } from 'react';
import { getApiKey } from '../utils/apiKeyStore';

export function useSSE() {
  const [streaming, setStreaming] = useState(false);
  const [content, setContent] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    (url: string, body: unknown) => {
      setStreaming(true);
      setContent('');
      setStatus('');
      setError(null);

      // Cancel previous stream
      controllerRef.current?.abort();

      const controller = new AbortController();
      controllerRef.current = controller;

      // Inject api_key from localStorage
      const enrichedBody = { ...(body as Record<string, unknown>) };
      const key = getApiKey();
      if (key && !enrichedBody.api_key) {
        enrichedBody.api_key = key;
      }

      fetch(`/api${url}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(enrichedBody),
        signal: controller.signal,
      })
        .then(async (res) => {
          if (!res.ok) {
            const errText = await res.text();
            setError(errText);
            setStreaming(false);
            return;
          }
          const reader = res.body?.getReader();
          if (!reader) {
            setStreaming(false);
            return;
          }
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
                    setContent((prev) => prev + data.content);
                  } else if (data.type === 'status') {
                    setStatus(data.message);
                  } else if (data.type === 'done') {
                    setStreaming(false);
                    return;
                  } else if (data.type === 'error') {
                    setError(data.message || data.content || '生成失败');
                    setStreaming(false);
                    return;
                  }
                } catch { /* ignore */ }
              }
            }
          }
          setStreaming(false);
        })
        .catch((err) => {
          if (err.name !== 'AbortError') {
            setError(err.message);
          }
          setStreaming(false);
        });
    },
    [],
  );

  const cancelStream = useCallback(() => {
    controllerRef.current?.abort();
    setStreaming(false);
  }, []);

  const reset = useCallback(() => {
    setContent('');
    setStatus('');
    setError(null);
  }, []);

  return { streaming, content, status, error, startStream, cancelStream, reset, setContent };
}
