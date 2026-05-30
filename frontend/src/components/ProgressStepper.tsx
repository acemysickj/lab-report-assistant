import { Steps } from 'antd';

interface Props {
  current: number;
  steps: { title: string; description?: string }[];
}

export default function ProgressStepper({ current, steps }: Props) {
  return (
    <Steps
      current={current}
      size="small"
      style={{ marginBottom: 24 }}
      items={steps.map((s) => ({ title: s.title, description: s.description }))}
    />
  );
}
