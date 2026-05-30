import { Card, Image, Empty, Space } from 'antd';

interface Props {
  figures: string[];
  outputDir?: string;
}

export default function FigurePreview({ figures, outputDir }: Props) {
  if (figures.length === 0) {
    return <Empty description="暂无图形" />;
  }

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {figures.map((fig, i) => {
        const src = outputDir
          ? `/output/${outputDir.split('output/').pop()}/${fig}`
          : `/output/${fig}`;

        return (
          <Card key={i} title={`图 ${i + 1}: ${fig}`} size="small">
            <Image
              src={src}
              alt={fig}
              style={{ maxWidth: '100%', maxHeight: '400px' }}
              fallback="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100'><text x='10' y='30' font-size='12'>图形加载中...</text></svg>"
            />
          </Card>
        );
      })}
    </Space>
  );
}
