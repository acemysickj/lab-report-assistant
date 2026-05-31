import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Radio, Space, Typography, Divider, message, Tooltip, Tag } from 'antd';
import {
  ArrowRightOutlined,
  ArrowLeftOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  IdcardOutlined,
  TeamOutlined,
  TrophyOutlined,
  CalendarOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import type { StudentInfo, ReportPhase } from '../types';

const { Title, Text } = Typography;

export default function ExperimentSetup() {
  const { courseId, experimentId } = useParams<{ courseId: string; experimentId: string }>();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<ReportPhase>(() =>
    (sessionStorage.getItem('reportPhase') as ReportPhase) || 'prelab',
  );
  const [form] = Form.useForm<StudentInfo>();

  const handleStart = () => {
    const values = form.getFieldsValue();

    if (!values.name?.trim()) {
      message.warning('请填写姓名');
      return;
    }
    if (!values.student_id?.trim()) {
      message.warning('请填写学号');
      return;
    }

    const info: StudentInfo = {
      name: values.name || '',
      student_id: values.student_id || '',
      class_name: values.class_name || '',
      instructor: values.instructor || '',
      course: courseId || '',
      experiment_date: values.experiment_date || '',
      submit_date: values.submit_date || '',
    };

    sessionStorage.setItem('studentInfo', JSON.stringify(info));
    sessionStorage.setItem('reportPhase', phase);
    sessionStorage.setItem('courseId', courseId || '');
    sessionStorage.setItem('experimentId', experimentId || '');

    const path = phase === 'prelab' ? 'prelab' : 'postlab';
    navigate(`/${path}/${encodeURIComponent(courseId || '')}/${encodeURIComponent(experimentId || '')}`);
  };

  const prevInfo = (() => {
    try {
      return JSON.parse(sessionStorage.getItem('studentInfo') || 'null') as StudentInfo | null;
    } catch { return null; }
  })();

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* ---- Back button ---- */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/')}
        style={{ marginBottom: 28, color: '#6b5e4a', paddingLeft: 0, fontWeight: 500 }}
      >
        返回首页
      </Button>

      {/* ---- Main card ---- */}
      <Card
        style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #e8e0d0' }}
        styles={{ body: { padding: 0 } }}
      >
        {/* Card header */}
        <div
          style={{
            padding: '28px 36px',
            background: 'linear-gradient(135deg, rgba(61,122,79,0.04) 0%, rgba(91,154,107,0.02) 100%)',
            borderBottom: '1px solid #f0ebe0',
          }}
        >
          <Title level={4} style={{ marginBottom: 6, fontWeight: 700 }}>
            <RocketOutlined style={{ marginRight: 8, color: '#3d7a4f' }} />
            开始撰写报告
          </Title>
          <Space size={8}>
            <Tag icon={<ExperimentOutlined />} color="green" style={{ borderRadius: 6 }}>
              {courseId}
            </Tag>
            <Text type="secondary" style={{ fontSize: 13 }}>
              {experimentId}
            </Text>
          </Space>
        </div>

        {/* Card body */}
        <div style={{ padding: '32px 36px' }}>
          {/* ---- Report type selection ---- */}
          <div style={{ marginBottom: 32 }}>
            <Text
              strong
              style={{
                fontSize: 14,
                display: 'block',
                marginBottom: 16,
              }}
            >
              📋 报告类型
            </Text>

            <Radio.Group
              value={phase}
              onChange={(e) => {
                setPhase(e.target.value);
                sessionStorage.setItem('reportPhase', e.target.value);
              }}
              style={{ width: '100%' }}
            >
              <Space direction="vertical" style={{ width: '100%' }} size={14}>
                {/* Pre-lab option */}
                <div
                  onClick={() => {
                    setPhase('prelab');
                    sessionStorage.setItem('reportPhase', 'prelab');
                  }}
                  style={{
                    cursor: 'pointer',
                    padding: '18px 20px',
                    borderRadius: 12,
                    border: phase === 'prelab' ? '2px solid #3d7a4f' : '1px solid #e8e0d0',
                    background: phase === 'prelab'
                      ? 'linear-gradient(135deg, #f0f7f0 0%, #eef5ef 100%)'
                      : '#fefdf8',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: phase === 'prelab'
                      ? '0 3px 12px rgba(61,122,79,0.1)'
                      : '0 1px 2px rgba(44,36,22,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: phase === 'prelab'
                          ? 'linear-gradient(135deg, #3d7a4f 0%, #5b9a6b 100%)'
                          : '#f0ebe0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.2s',
                      }}
                    >
                      <FileTextOutlined
                        style={{
                          color: phase === 'prelab' ? '#fff' : '#8b7a60',
                          fontSize: 18,
                        }}
                      />
                    </div>
                    <div>
                      <Radio value="prelab" style={{ fontWeight: 600, fontSize: 14 }}>
                        预习报告
                      </Radio>
                      <div style={{ marginLeft: 0, marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          实验目的 · 实验原理 · 仪器与试剂 · 实验步骤
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Post-lab option */}
                <div
                  onClick={() => {
                    setPhase('postlab');
                    sessionStorage.setItem('reportPhase', 'postlab');
                  }}
                  style={{
                    cursor: 'pointer',
                    padding: '18px 20px',
                    borderRadius: 12,
                    border: phase === 'postlab' ? '2px solid #3d7a4f' : '1px solid #e8e0d0',
                    background: phase === 'postlab'
                      ? 'linear-gradient(135deg, #f0f7f0 0%, #eef5ef 100%)'
                      : '#fefdf8',
                    transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: phase === 'postlab'
                      ? '0 3px 12px rgba(61,122,79,0.1)'
                      : '0 1px 2px rgba(44,36,22,0.03)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: phase === 'postlab'
                          ? 'linear-gradient(135deg, #3d7a4f 0%, #5b9a6b 100%)'
                          : '#f0ebe0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.2s',
                      }}
                    >
                      <ExperimentOutlined
                        style={{
                          color: phase === 'postlab' ? '#fff' : '#8b7a60',
                          fontSize: 18,
                        }}
                      />
                    </div>
                    <div>
                      <Radio value="postlab" style={{ fontWeight: 600, fontSize: 14 }}>
                        后续报告
                      </Radio>
                      <div style={{ marginLeft: 0, marginTop: 4 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          实验记录 · 数据处理 · 结果讨论 · 思考题（需要填写实验数据）
                        </Text>
                      </div>
                    </div>
                  </div>
                </div>
              </Space>
            </Radio.Group>
          </div>

          <Divider style={{ margin: '24px 0' }} />

          {/* ---- Student info ---- */}
          <div style={{ marginBottom: 8 }}>
            <Space align="center" style={{ marginBottom: 18 }}>
              <Text strong style={{ fontSize: 14 }}>
                👤 学生信息
              </Text>
              <Tooltip title="此信息将用于报告头部，可随时修改" placement="right">
                <QuestionCircleOutlined style={{ color: '#b0a48e', fontSize: 13 }} />
              </Tooltip>
            </Space>
          </div>

          <Form
            form={form}
            layout="vertical"
            initialValues={{
              name: prevInfo?.name || '',
              student_id: prevInfo?.student_id || '',
              class_name: prevInfo?.class_name || '',
              instructor: prevInfo?.instructor || '',
              experiment_date: prevInfo?.experiment_date || new Date().toISOString().slice(0, 10),
              submit_date: prevInfo?.submit_date || new Date().toISOString().slice(0, 10),
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
              <Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}>
                <Input
                  placeholder="张三"
                  prefix={<UserOutlined style={{ color: '#b0a48e' }} />}
                />
              </Form.Item>
              <Form.Item name="student_id" label="学号" rules={[{ required: true, message: '请输入学号' }]}>
                <Input
                  placeholder="20240001"
                  prefix={<IdcardOutlined style={{ color: '#b0a48e' }} />}
                />
              </Form.Item>
              <Form.Item name="class_name" label="班级">
                <Input
                  placeholder="材料2401"
                  prefix={<TeamOutlined style={{ color: '#b0a48e' }} />}
                />
              </Form.Item>
              <Form.Item name="instructor" label="指导教师">
                <Input
                  placeholder="指导教师姓名"
                  prefix={<TrophyOutlined style={{ color: '#b0a48e' }} />}
                />
              </Form.Item>
              <Form.Item name="experiment_date" label="实验日期">
                <Input type="date" prefix={<CalendarOutlined style={{ color: '#b0a48e' }} />} />
              </Form.Item>
              <Form.Item name="submit_date" label="提交日期">
                <Input type="date" prefix={<CalendarOutlined style={{ color: '#b0a48e' }} />} />
              </Form.Item>
            </div>
          </Form>

          <Divider style={{ margin: '8px 0 28px' }} />

          {/* ---- Start button ---- */}
          <Button
            type="primary"
            size="large"
            icon={<ArrowRightOutlined />}
            onClick={handleStart}
            block
            style={{
              height: 48,
              fontSize: 16,
              fontWeight: 600,
              borderRadius: 12,
              boxShadow: '0 4px 14px rgba(61,122,79,0.3)',
            }}
          >
            开始{phase === 'prelab' ? '预习报告' : '后续报告'}
          </Button>
        </div>
      </Card>
    </div>
  );
}
