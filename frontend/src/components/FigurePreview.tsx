import { Card, Image, Empty, Row, Col } from 'antd';
import { PictureOutlined } from '@ant-design/icons';

interface Props {
  figures: string[];
  outputDir?: string;
}

export default function FigurePreview({ figures, outputDir }: Props) {
  if (figures.length === 0) {
    return (
      <Empty
        image={<PictureOutlined style={{ fontSize: 48, color: '#bfb5a4' }} />}
        description="暂无图形"
      />
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {figures.map((fig, i) => {
        const src = outputDir
          ? `/output/${outputDir.split('output/').pop()}/${fig}`
          : `/output/${fig}`;

        return (
          <Col xs={24} sm={12} key={i}>
            <Card
              size="small"
              title={
                <span style={{ fontSize: 13, fontWeight: 500 }}>
                  图 {i + 1}：{fig}
                </span>
              }
              style={{ borderRadius: 10, border: '1px solid #e8e0d0' }}
            >
              <div style={{
                background: '#faf8f0',
                borderRadius: 8,
                padding: 12,
                textAlign: 'center',
              }}>
                <Image
                  src={src}
                  alt={fig}
                  style={{ maxWidth: '100%', maxHeight: 360, objectFit: 'contain' }}
                  fallback="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='100'><rect fill='%23f5f1e8' width='200' height='100' rx='8'/><text x='100' y='55' text-anchor='middle' font-size='12' fill='%239b8e78'>图形加载中...</text></svg>"
                />
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}
