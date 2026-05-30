import { useEffect, useRef } from 'react';
import { Spin, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

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

      // Remove broken images (local file paths)
      const images = containerRef.current.querySelectorAll('img');
      images.forEach((img) => {
        const src = img.getAttribute('src') || '';
        const isDataUri = src.startsWith('data:');
        const isHttp = src.startsWith('http://') || src.startsWith('https://');
        const isBlob = src.startsWith('blob:');
        if (isDataUri || isHttp || isBlob) {
          img.addEventListener('error', () => img.remove(), { once: true });
        } else {
          img.remove();
        }
      });

      // Trigger MathJax
      const doTypeset = () => {
        const MathJax = (window as unknown as {
          MathJax?: {
            typesetPromise?: (els: HTMLElement[]) => Promise<void>;
            startup?: { promise: Promise<void> };
          };
        }).MathJax;
        if (MathJax?.typesetPromise && containerRef.current) {
          MathJax.typesetPromise([containerRef.current]).catch(() => {});
        }
      };

      const MathJax = (window as unknown as {
        MathJax?: {
          typesetPromise?: (els: HTMLElement[]) => Promise<void>;
          startup?: { promise: Promise<void> };
        };
      }).MathJax;
      if (MathJax?.startup?.promise) {
        MathJax.startup.promise.then(doTypeset);
      } else {
        let attempts = 0;
        const interval = setInterval(() => {
          attempts++;
          const mj = (window as unknown as {
            MathJax?: { typesetPromise?: (els: HTMLElement[]) => Promise<void> };
          }).MathJax;
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
      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            background: 'rgba(255, 254, 249, 0.7)',
            backdropFilter: 'blur(2px)',
            borderRadius: 12,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Spin
              indicator={<LoadingOutlined style={{ fontSize: 32, color: '#3d7a4f' }} spin />}
            />
            <Typography.Text
              type="secondary"
              style={{ display: 'block', marginTop: 14, fontSize: 13 }}
            >
              AI 正在生成...
            </Typography.Text>
          </div>
        </div>
      )}

      {/* Content container */}
      <div
        ref={containerRef}
        style={{
          padding: '20px 28px',
          background: '#fffef9',
          border: '1px solid #e8e0d0',
          borderRadius: 12,
          minHeight: height,
          maxHeight: typeof height === 'number' ? height : '560px',
          overflow: 'auto',
          opacity: loading ? 0.4 : 1,
          transition: 'opacity 0.2s',
          fontSize: '12pt',
          fontFamily: '"宋体", "SimSun", "Times New Roman", serif',
          lineHeight: 1.7,
          boxShadow: '0 1px 3px rgba(44,36,22,0.04)',
        }}
      />
    </div>
  );
}
