import { useEffect, useRef } from 'react';
import { Spin } from 'antd';

interface Props {
  html: string;
  loading?: boolean;
  status?: string;
  height?: string | number;
}

export default function MathPreview({ html, loading, height = '400px' }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const prevHtmlRef = useRef('');

  useEffect(() => {
    if (!html || loading) return;
    if (html === prevHtmlRef.current) return;
    prevHtmlRef.current = html;

    if (containerRef.current) {
      containerRef.current.innerHTML = html;

      // Remove broken images (local file paths). Preserve data: URIs, http(s) URLs, inline SVGs.
      const images = containerRef.current.querySelectorAll('img');
      images.forEach((img) => {
        const src = img.getAttribute('src') || '';
        const isDataUri = src.startsWith('data:');
        const isHttp = src.startsWith('http://') || src.startsWith('https://');
        const isBlob = src.startsWith('blob:');
        if (isDataUri || isHttp || isBlob) {
          // OK — silently remove on error
          img.addEventListener('error', () => img.remove(), { once: true });
        } else {
          // Local/relative path — remove immediately
          img.remove();
        }
      });

      // Wait for MathJax to be ready, then render
      const doTypeset = () => {
        const MathJax = (window as unknown as { MathJax?: { typesetPromise?: (els: HTMLElement[]) => Promise<void>; startup?: { promise: Promise<void> } } }).MathJax;
        if (MathJax?.typesetPromise && containerRef.current) {
          MathJax.typesetPromise([containerRef.current]).catch(() => {});
        }
      };

      // MathJax might still be loading (async script)
      const MathJax = (window as unknown as { MathJax?: { typesetPromise?: (els: HTMLElement[]) => Promise<void>; startup?: { promise: Promise<void> } } }).MathJax;
      if (MathJax?.startup?.promise) {
        MathJax.startup.promise.then(doTypeset);
      } else {
        // Retry a few times if MathJax hasn't loaded yet
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          const mj = (window as unknown as { MathJax?: { typesetPromise?: (els: HTMLElement[]) => Promise<void> } }).MathJax;
          if (mj?.typesetPromise) {
            clearInterval(interval);
            doTypeset();
          } else if (attempts > 50) {
            clearInterval(interval);
          }
        }, 100);
      }
    }
  }, [html, loading]);

  return (
    <div style={{ position: 'relative', minHeight: height }}>
      {loading && (
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 10, textAlign: 'center' }}>
          <Spin tip="AI 生成中..." />
          {status && <div style={{ marginTop: 12, color: '#666', fontSize: 13, whiteSpace: 'pre-wrap' }}>{status}</div>}
        </div>
      )}
      <div
        ref={containerRef}
        style={{
          padding: '20px 24px',
          background: '#fffef9',
          border: '1px solid #e0d8c8',
          borderRadius: '10px',
          minHeight: height,
          maxHeight: typeof height === 'number' ? height : '500px',
          overflow: 'auto',
          opacity: loading ? 0.5 : 1,
          fontSize: '12pt',
          fontFamily: '"宋体", "SimSun", "Times New Roman", serif',
          lineHeight: 1.6,
          boxShadow: '0 1px 3px rgba(44,36,22,0.05)',
        }}
      />
    </div>
  );
}
