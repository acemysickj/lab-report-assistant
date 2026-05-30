import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Typography, List, Tag, Alert, message, Skeleton, Statistic, Space, Button } from 'antd';
import {
  ExperimentOutlined,
  FileTextOutlined,
  RightOutlined,
  ExclamationCircleOutlined,
  BookOutlined,
  ClockCircleOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { getCourses, getExperiments, listReports, healthCheck } from '../api/client';
import type { Course, Experiment } from '../types';

const { Title, Text, Paragraph } = Typography;

// ============================================================
// Constants
// ============================================================
const HERO_GRADIENT =
  'linear-gradient(135deg, #2c5a38 0%, #3d7a4f 40%, #5b9a6b 100%)';

// ============================================================
// Home Page
// ============================================================
export default function Home() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState(() =>
    sessionStorage.getItem('selectedCourse') || '',
  );
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [reports, setReports] = useState<
    { id: string; experiment_dir: string; html_path: string; created_at: string }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [experimentsLoading, setExperimentsLoading] = useState(false);
  const [apiOk, setApiOk] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  // ---- Initial data load ----
  useEffect(() => {
    const loadInitial = async () => {
      const errs: string[] = [];
      let coursesData: Course[] = [];
      let reportsData: typeof reports = [];
      let healthOk = true;

      try {
        const res = await getCourses();
        coursesData = res.courses;
      } catch {
        errs.push('无法加载课程列表，请确认后端已启动');
      }

      try {
        const res = await listReports();
        reportsData = res.reports.slice(0, 6);
      } catch {
        // Reports may be empty — not critical
      }

      try {
        const health = await healthCheck();
        healthOk = health.claude_api !== false;
      } catch {
        healthOk = false;
      }

      setCourses(coursesData);
      setReports(reportsData);
      setApiOk(healthOk);
      setErrors(errs);

      // Determine initial course
      const restored = sessionStorage.getItem('selectedCourse') || '';
      const first =
        restored && coursesData.find((c) => c.id === restored)
          ? restored
          : coursesData[0]?.id || '';
      if (first) {
        setSelectedCourse(first);
        sessionStorage.setItem('selectedCourse', first);
        setExperimentsLoading(true);
        try {
          const expRes = await getExperiments(first);
          setExperiments(expRes.experiments);
        } catch {
          setExperiments([]);
        } finally {
          setExperimentsLoading(false);
        }
      }
      setLoading(false);
    };

    loadInitial();
  }, []);

  const handleCourseChange = useCallback((courseId: string) => {
    setSelectedCourse(courseId);
    sessionStorage.setItem('selectedCourse', courseId);
    setExperimentsLoading(true);
    getExperiments(courseId)
      .then((res) => setExperiments(res.experiments))
      .catch(() => {
        setExperiments([]);
        message.error('加载实验列表失败');
      })
      .finally(() => setExperimentsLoading(false));
  }, []);

  // ---- Loading state ----
  if (loading) {
    return (
      <div>
        <Skeleton active paragraph={{ rows: 1 }} title={{ width: 220 }} />
        <Skeleton active paragraph={{ rows: 2 }} style={{ marginTop: 32 }} />
        <Skeleton active paragraph={{ rows: 6 }} style={{ marginTop: 32 }} />
      </div>
    );
  }

  return (
    <div>
      {/* ================================================================ */}
      {/* Alerts                                                           */}
      {/* ================================================================ */}
      {!apiOk && (
        <Alert
          message="未配置 API Key"
          description="请在 backend/.env 中设置 ANTHROPIC_API_KEY 以启用 AI 生成功能"
          type="warning"
          showIcon
          style={{ marginBottom: 28, borderRadius: 12 }}
          closable
        />
      )}

      {errors.length > 0 && (
        <Alert
          message="连接错误"
          description={errors.join('；')}
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 28, borderRadius: 12 }}
          closable
        />
      )}

      {/* ================================================================ */}
      {/* Hero                                                             */}
      {/* ================================================================ */}
      <Card
        style={{
          marginBottom: 36,
          background: HERO_GRADIENT,
          border: 'none',
          borderRadius: 16,
          overflow: 'hidden',
          position: 'relative',
        }}
        styles={{ body: { padding: '36px 40px' } }}
      >
        {/* Decorative background pattern */}
        <div
          style={{
            position: 'absolute',
            right: -20,
            top: -20,
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: 60,
            bottom: -40,
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.04)',
            pointerEvents: 'none',
          }}
        />

        <Row align="middle" gutter={[32, 24]}>
          <Col flex="auto">
            <div style={{ position: 'relative', zIndex: 1 }}>
              <Title
                level={2}
                style={{
                  color: '#fff',
                  marginBottom: 8,
                  fontWeight: 700,
                  fontSize: 28,
                  letterSpacing: 0.5,
                }}
              >
                <ExperimentOutlined style={{ marginRight: 10, fontSize: 26 }} />
                实验报告助手
              </Title>
              <Paragraph
                style={{
                  color: 'rgba(255,255,255,0.85)',
                  fontSize: 15,
                  marginBottom: 0,
                  maxWidth: 520,
                  lineHeight: 1.7,
                }}
              >
                选择课程和实验，填写数据，AI 自动生成符合格式规范的实验报告
              </Paragraph>
            </div>
          </Col>

          {/* Quick stats */}
          <Col>
            <Row gutter={[24, 0]} style={{ position: 'relative', zIndex: 1 }}>
              <Col>
                <Statistic
                  title={<span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>实验数</span>}
                  value={experiments.length}
                  prefix={<ExperimentOutlined />}
                  valueStyle={{ color: '#fff', fontSize: 28, fontWeight: 700 }}
                />
              </Col>
              <Col>
                <Statistic
                  title={<span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>报告数</span>}
                  value={reports.length}
                  prefix={<FileTextOutlined />}
                  valueStyle={{ color: '#fff', fontSize: 28, fontWeight: 700 }}
                />
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* ================================================================ */}
      {/* Course selector                                                  */}
      {/* ================================================================ */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 10 }}>
          <BookOutlined style={{ color: '#3d7a4f', fontSize: 16 }} />
          <Text strong style={{ fontSize: 15, color: '#2c2416' }}>
            课程
          </Text>
        </div>

        {courses.length === 0 ? (
          <Card
            style={{ textAlign: 'center', borderRadius: 12, background: '#faf8f0' }}
            styles={{ body: { padding: '32px 20px' } }}
          >
            <Text type="secondary">暂无课程，请通过侧边栏「新建课程」上传讲义文件</Text>
          </Card>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {courses.map((c) => {
              const isActive = selectedCourse === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => handleCourseChange(c.id)}
                  style={{
                    padding: '10px 22px',
                    fontSize: 14,
                    borderRadius: 24,
                    border: isActive
                      ? '2px solid #3d7a4f'
                      : '2px solid #ddd4c2',
                    background: isActive
                      ? 'linear-gradient(135deg, #eef5ef 0%, #e8f0e4 100%)'
                      : '#fefdf8',
                    color: isActive ? '#2c2416' : '#6b5e4a',
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    fontFamily: 'inherit',
                    boxShadow: isActive
                      ? '0 2px 8px rgba(61,122,79,0.15)'
                      : '0 1px 2px rgba(44,36,22,0.04)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = '#8db893';
                      e.currentTarget.style.background = '#faf8f0';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.borderColor = '#ddd4c2';
                      e.currentTarget.style.background = '#fefdf8';
                    }
                  }}
                >
                  {isActive && (
                    <CheckCircleOutlined
                      style={{ marginRight: 6, fontSize: 12, color: '#3d7a4f' }}
                    />
                  )}
                  {c.name}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ================================================================ */}
      {/* Experiment cards                                                 */}
      {/* ================================================================ */}
      <div style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 16, gap: 10 }}>
          <ExperimentOutlined style={{ color: '#3d7a4f', fontSize: 16 }} />
          <Text strong style={{ fontSize: 15, color: '#2c2416' }}>
            实验列表
          </Text>
          {!experimentsLoading && experiments.length > 0 && (
            <Tag style={{ marginLeft: 4, borderRadius: 10 }}>{experiments.length} 个实验</Tag>
          )}
        </div>

        {experimentsLoading ? (
          <Row gutter={[20, 20]}>
            {[1, 2, 3].map((i) => (
              <Col xs={24} sm={12} lg={8} key={i}>
                <Card style={{ height: 100, borderRadius: 12 }}>
                  <Skeleton active paragraph={{ rows: 1 }} />
                </Card>
              </Col>
            ))}
          </Row>
        ) : experiments.length === 0 ? (
          <Card
            style={{ textAlign: 'center', borderRadius: 12, background: '#faf8f0' }}
            styles={{ body: { padding: '40px 20px' } }}
          >
            <ExperimentOutlined style={{ fontSize: 40, color: '#bfb5a4', marginBottom: 16 }} />
            <div>
              <Text type="secondary" style={{ fontSize: 14 }}>
                该课程暂无实验，请上传讲义文件或输入实验描述
              </Text>
            </div>
          </Card>
        ) : (
          <Row gutter={[20, 20]}>
            {experiments.map((exp, idx) => (
              <Col xs={24} sm={12} lg={8} key={exp.id}>
                <Card
                  hoverable
                  onClick={() =>
                    navigate(
                      `/setup/${encodeURIComponent(selectedCourse)}/${encodeURIComponent(exp.id)}`,
                    )
                  }
                  style={{
                    height: '100%',
                    cursor: 'pointer',
                    borderRadius: 14,
                    border: '1px solid #e8e0d0',
                    overflow: 'hidden',
                  }}
                  styles={{ body: { padding: '22px 26px' } }}
                >
                  {/* Top row: number + title */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 14,
                    }}
                  >
                    {/* Number badge */}
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 34,
                        height: 34,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #3d7a4f 0%, #5b9a6b 100%)',
                        color: '#fff',
                        fontSize: 14,
                        fontWeight: 700,
                        flexShrink: 0,
                        boxShadow: '0 2px 6px rgba(61,122,79,0.2)',
                      }}
                    >
                      {idx + 1}
                    </span>

                    {/* Title + meta */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        strong
                        style={{
                          fontSize: 14,
                          lineHeight: 1.45,
                          display: 'block',
                          marginBottom: 6,
                        }}
                      >
                        {exp.title}
                      </Text>
                      <Space size={12} style={{ fontSize: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          {selectedCourse}
                        </Text>
                      </Space>
                    </div>

                    <RightOutlined
                      style={{
                        color: '#bfb5a4',
                        marginTop: 8,
                        flexShrink: 0,
                        transition: 'transform 0.2s',
                      }}
                    />
                  </div>

                  {/* Bottom action hint */}
                  <div
                    style={{
                      marginTop: 18,
                      paddingTop: 14,
                      borderTop: '1px solid #f0ebe0',
                      display: 'flex',
                      justifyContent: 'flex-end',
                    }}
                  >
                    <Text
                      type="secondary"
                      style={{
                        fontSize: 12,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        transition: 'color 0.2s',
                      }}
                    >
                      开始撰写
                      <ArrowRightOutlined style={{ fontSize: 10 }} />
                    </Text>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/* ================================================================ */}
      {/* Recent reports                                                   */}
      {/* ================================================================ */}
      {reports.length > 0 && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <FileTextOutlined style={{ color: '#3d7a4f', fontSize: 16 }} />
              <Text strong style={{ fontSize: 15, color: '#2c2416' }}>
                最近生成的报告
              </Text>
            </div>
            <Button
              type="text"
              size="small"
              onClick={() => navigate('/history')}
              style={{ color: '#6b5e4a', fontWeight: 500 }}
            >
              查看全部 <ArrowRightOutlined />
            </Button>
          </div>

          <Card
            style={{ borderRadius: 14, overflow: 'hidden' }}
            styles={{ body: { padding: 0 } }}
          >
            <List
              dataSource={reports}
              locale={{ emptyText: '暂无报告' }}
              renderItem={(r, idx) => (
                <List.Item
                  style={{
                    padding: '16px 26px',
                    cursor: 'pointer',
                    borderBottom: idx < reports.length - 1 ? '1px solid #f0ebe0' : 'none',
                    transition: 'background 0.15s',
                  }}
                  onClick={() => navigate(`/preview/${r.id}`)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#faf8f0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          background: 'linear-gradient(135deg, #eef5ef 0%, #dce9df 100%)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 1px 3px rgba(61,122,79,0.1)',
                        }}
                      >
                        <FileTextOutlined style={{ color: '#3d7a4f', fontSize: 18 }} />
                      </div>
                    }
                    title={
                      <Text strong style={{ fontSize: 14 }}>
                        {r.id.slice(0, 16)}
                      </Text>
                    }
                    description={
                      <Space size={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <ExperimentOutlined style={{ marginRight: 4 }} />
                          {r.experiment_dir}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          {new Date(r.created_at).toLocaleString('zh-CN')}
                        </Text>
                      </Space>
                    }
                  />
                  <Tag
                    color="processing"
                    style={{ borderRadius: 8, padding: '2px 10px' }}
                  >
                    查看
                  </Tag>
                </List.Item>
              )}
            />
          </Card>
        </div>
      )}
    </div>
  );
}
