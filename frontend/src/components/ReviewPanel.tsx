import { Alert, Button, Space, Spin, Typography } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined, SendOutlined } from '@ant-design/icons';
import type { ReviewResult } from '../types';

interface Props {
  review: ReviewResult | null;
  onRetry: () => void;
  onAccept: () => void;
  reviewing: boolean;
}

export default function ReviewPanel({ review, onRetry, onAccept, reviewing }: Props) {
  if (!review && !reviewing) return null;

  return (
    <div
      style={{
        marginTop: 20,
        borderRadius: 14,
        border: '1px solid #e8e0d0',
        background: '#fefdf8',
        overflow: 'hidden',
      }}
    >
      {/* Reviewing state */}
      {reviewing && (
        <div style={{ padding: '32px 28px', textAlign: 'center' }}>
          <Spin size="default" />
          <Typography.Text type="secondary" style={{ display: 'block', marginTop: 14, fontSize: 14 }}>
            正在审查内容，请稍候...
          </Typography.Text>
        </div>
      )}

      {/* Passed */}
      {review && review.passed && (
        <div style={{ padding: '24px 28px' }}>
          <Alert
            message={
              <span style={{ fontWeight: 600, fontSize: 15 }}>
                <CheckCircleOutlined style={{ marginRight: 8, color: '#3d7a4f' }} />
                审查通过
              </span>
            }
            description={
              <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                {review.feedback}
              </Typography.Text>
            }
            type="success"
            showIcon={false}
            style={{
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #eef7f0 0%, #e8f4ea 100%)',
            }}
            action={
              <Button
                type="primary"
                onClick={onAccept}
                style={{ borderRadius: 8, fontWeight: 600 }}
                icon={<SendOutlined />}
              >
                确认并继续
              </Button>
            }
          />
        </div>
      )}

      {/* Not passed */}
      {review && !review.passed && (
        <div style={{ padding: '24px 28px' }}>
          <Alert
            message={
              <span style={{ fontWeight: 600, fontSize: 15 }}>
                <CloseCircleOutlined style={{ marginRight: 8, color: '#c8923e' }} />
                审查未通过 · 第 {review.round} 轮
              </span>
            }
            description={
              <pre style={{
                whiteSpace: 'pre-wrap',
                margin: '8px 0 0',
                fontSize: 13,
                lineHeight: 1.6,
                fontFamily: 'inherit',
                color: '#5c4f3a',
              }}>
                {review.feedback}
              </pre>
            }
            type="warning"
            showIcon={false}
            style={{
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #fdf6ec 0%, #faf2e0 100%)',
            }}
            action={
              <Space direction="vertical" size={8}>
                {review.round < 3 && (
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={onRetry}
                    style={{ borderRadius: 8, fontWeight: 500 }}
                  >
                    修改后重新审查
                  </Button>
                )}
                {review.round >= 2 && (
                  <Button
                    type="primary"
                    onClick={onAccept}
                    style={{ borderRadius: 8, fontWeight: 600 }}
                    icon={<SendOutlined />}
                  >
                    提交用户裁决
                  </Button>
                )}
              </Space>
            }
          />
        </div>
      )}
    </div>
  );
}
