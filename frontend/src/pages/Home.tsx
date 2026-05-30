import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Typography, List, Tag, Spin, Alert } from 'antd';
import { ExperimentOutlined, FileTextOutlined, RightOutlined } from '@ant-design/icons';
import { getCourses, getExperiments, listReports, healthCheck } from '../api/client';
import type { Course, Experiment } from '../types';

const { Title, Text } = Typography;

export default function Home() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [reports, setReports] = useState<{ id: string; experiment_dir: string; html_path: string; created_at: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiOk, setApiOk] = useState(true);

  useEffect(() => {
    Promise.all([
      getCourses().catch(() => ({ courses: [] })),
      listReports().catch(() => ({ reports: [] })),
      healthCheck().catch(() => ({ status: 'error', claude_api: false })),
    ]).then(([coursesRes, reportsRes, health]) => {
      setCourses(coursesRes.courses);
      setReports(reportsRes.reports.slice(0, 6));
      setApiOk(health.claude_api !== false);
      const first = coursesRes.courses[0];
      if (first) {
        setSelectedCourse(first.id);
        getExperiments(first.id).then((r) => setExperiments(r.experiments)).catch(() => {});
      }
      setLoading(false);
    });
  }, []);

  const handleCourseChange = (courseId: string) => {
    setSelectedCourse(courseId);
    getExperiments(courseId).then((r) => setExperiments(r.experiments)).catch(() => setExperiments([]));
  };

  if (loading) {
    return <div style={{ display: 'flex', justifyContent: 'center', padding: 120 }}><Spin size="large" /></div>;
  }

  return (
    <div>
      {!apiOk && (
        <Alert message="未配置 API Key，AI 生成功能不可用" type="warning" showIcon style={{ marginBottom: 32, borderRadius: 10 }} closable />
      )}

      {/* Hero */}
      <div style={{ marginBottom: 40 }}>
        <Title level={2} style={{ marginBottom: 8, fontWeight: 700 }}>
          <ExperimentOutlined style={{ marginRight: 8 }} />
          实验报告助手
        </Title>
        <Text type="secondary" style={{ fontSize: 15 }}>
          选择课程和实验，填写数据，AI 自动生成符合格式规范的实验报告
        </Text>
      </div>

      {/* Course selector */}
      <div style={{ marginBottom: 28 }}>
        <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10, display: 'block' }}>
          课程
        </Text>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {courses.map((c) => (
            <Tag.CheckableTag
              key={c.id}
              checked={selectedCourse === c.id}
              onChange={() => handleCourseChange(c.id)}
              style={{
                padding: '6px 20px', fontSize: 14, borderRadius: 20,
                border: selectedCourse === c.id ? '1px solid #3d7a4f' : '1px solid #d0c8b4',
                background: selectedCourse === c.id ? '#e8f0e4' : '#fefdf8',
                color: selectedCourse === c.id ? '#2c2416' : '#6b5e4a',
                fontWeight: selectedCourse === c.id ? 600 : 400,
                margin: 0,
              }}
            >
              {c.name}
            </Tag.CheckableTag>
          ))}
        </div>
      </div>

      {/* Experiments */}
      <div style={{ marginBottom: 48 }}>
        <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, display: 'block' }}>
          实验列表
        </Text>
        <Row gutter={[20, 20]}>
          {experiments.map((exp) => (
            <Col xs={24} sm={12} lg={8} key={exp.id}>
              <Card
                hoverable
                onClick={() => navigate(`/setup/${encodeURIComponent(selectedCourse)}/${encodeURIComponent(exp.id)}`)}
                style={{ height: '100%', cursor: 'pointer', transition: 'all 0.2s' }}
                bodyStyle={{ padding: '20px 24px' }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Text strong style={{ fontSize: 14, lineHeight: 1.5, flex: 1 }}>
                    {exp.title}
                  </Text>
                  <RightOutlined style={{ color: '#b0a48e', marginLeft: 12, marginTop: 3, flexShrink: 0 }} />
                </div>
              </Card>
            </Col>
          ))}
        </Row>
        {experiments.length === 0 && (
          <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 40 }}>
            该课程暂无实验，请上传讲义文件
          </Text>
        )}
      </div>

      {/* Recent reports */}
      {reports.length > 0 && (
        <div>
          <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, display: 'block' }}>
            最近生成的报告
          </Text>
          <Card bodyStyle={{ padding: '4px 0' }}>
            <List
              dataSource={reports}
              renderItem={(r) => (
                <List.Item
                  style={{ padding: '12px 24px', cursor: 'pointer', borderBottom: '1px solid #f0ebe0' }}
                  onClick={() => navigate(`/preview/${r.id}`)}
                >
                  <List.Item.Meta
                    title={<Text style={{ fontSize: 14 }}>{r.id.slice(0, 12)}</Text>}
                    description={
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {r.experiment_dir} · {new Date(r.created_at).toLocaleString('zh-CN')}
                      </Text>
                    }
                  />
                  <Tag color="processing">查看</Tag>
                </List.Item>
              )}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
