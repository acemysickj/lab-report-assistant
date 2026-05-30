import { Alert, Button, Space } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined } from '@ant-design/icons';
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
    <div style={{ marginTop: 16 }}>
      {reviewing && (
        <Alert message="审查中..." type="info" showIcon style={{ marginBottom: 12 }} />
      )}
      {review && review.passed && (
        <Alert
          message="审查通过 ✓"
          description={review.feedback}
          type="success"
          showIcon
          icon={<CheckCircleOutlined />}
          action={
            <Button type="primary" onClick={onAccept}>
              确认并继续
            </Button>
          }
        />
      )}
      {review && !review.passed && (
        <Alert
          message={`审查未通过 · 第 ${review.round} 轮`}
          description={
            <div>
              <pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: 13 }}>{review.feedback}</pre>
            </div>
          }
          type="warning"
          showIcon
          icon={<CloseCircleOutlined />}
          action={
            <Space direction="vertical">
              {review.round < 3 && (
                <Button icon={<ReloadOutlined />} onClick={onRetry}>
                  修改后重新审查
                </Button>
              )}
              {review.round >= 2 && (
                <Button type="primary" onClick={onAccept}>
                  提交用户裁决
                </Button>
              )}
            </Space>
          }
        />
      )}
    </div>
  );
}
