import { Steps } from 'antd';

interface StepData {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

interface Props {
  current: number;
  steps: StepData[];
}

export default function ProgressStepper({ current, steps }: Props) {
  return (
    <Steps
      current={current}
      size="small"
      style={{ marginBottom: 28 }}
      items={steps.map((s, i) => ({
        title: s.title,
        description: s.description,
        icon: s.icon || (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 28,
            height: 28,
            borderRadius: 8,
            background: i < current
              ? 'linear-gradient(135deg, #3d7a4f 0%, #5b9a6b 100%)'
              : i === current
                ? '#fefdf8'
                : '#f0ebe0',
            color: i < current ? '#fff' : i === current ? '#3d7a4f' : '#9b8e78',
            border: i === current ? '2px solid #3d7a4f' : '2px solid transparent',
            fontSize: 13,
            fontWeight: 700,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}>
            {i < current ? '✓' : i + 1}
          </span>
        ),
      }))}
    />
  );
}
