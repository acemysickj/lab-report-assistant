import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Form, Input, Button, Radio, Space, Typography, Divider } from 'antd';
import { ArrowRightOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import type { StudentInfo, ReportPhase } from '../types';

const { Title, Text } = Typography;

export default function ExperimentSetup() {
  const { courseId, experimentId } = useParams<{ courseId: string; experimentId: string }>();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<ReportPhase>('prelab');
  const [form] = Form.useForm<StudentInfo>();

  const handleStart = () => {
    const values = form.getFieldsValue();
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

  return (
    <div style={{ maxWidth: 640, margin: '0 auto' }}>
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/')}
        style={{ marginBottom: 24, color: '#6b5e4a', paddingLeft: 0 }}
      >
        返回首页
      </Button>

      <Card bodyStyle={{ padding: '32px 36px' }}>
        <Title level={4} style={{ marginBottom: 4 }}>开始撰写报告</Title>
        <Text type="secondary">{courseId} · {experimentId}</Text>

        <Divider style={{ margin: '24px 0' }} />

        {/* Phase selection */}
        <div style={{ marginBottom: 32 }}>
          <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 14 }}>
            报告类型
          </Text>
          <Radio.Group value={phase} onChange={(e) => setPhase(e.target.value)} style={{ width: '100%' }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Card
                size="small"
                hoverable
                onClick={() => setPhase('prelab')}
                style={{
                  cursor: 'pointer',
                  border: phase === 'prelab' ? '2px solid #3d7a4f' : '1px solid #e0d8c8',
                  background: phase === 'prelab' ? '#f0f7f0' : '#fefdf8',
                }}
              >
                <Radio value="prelab" style={{ fontWeight: 600 }}>预习报告</Radio>
                <div style={{ marginLeft: 24, marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>实验目的 · 实验原理 · 仪器与试剂 · 实验步骤</Text>
                </div>
              </Card>
              <Card
                size="small"
                hoverable
                onClick={() => setPhase('postlab')}
                style={{
                  cursor: 'pointer',
                  border: phase === 'postlab' ? '2px solid #3d7a4f' : '1px solid #e0d8c8',
                  background: phase === 'postlab' ? '#f0f7f0' : '#fefdf8',
                }}
              >
                <Radio value="postlab" style={{ fontWeight: 600 }}>后续报告</Radio>
                <div style={{ marginLeft: 24, marginTop: 4 }}>
                  <Text type="secondary" style={{ fontSize: 13 }}>实验记录 · 数据处理 · 结果讨论 · 思考题（需填写实验数据）</Text>
                </div>
              </Card>
            </Space>
          </Radio.Group>
        </div>

        <Divider style={{ margin: '24px 0' }} />

        {/* Student info */}
        <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 14 }}>
          学生信息
        </Text>
        <Form form={form} layout="vertical" initialValues={{
          experiment_date: new Date().toISOString().slice(0, 10),
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 20px' }}>
            <Form.Item name="name" label="姓名">
              <Input placeholder="姓名" />
            </Form.Item>
            <Form.Item name="student_id" label="学号">
              <Input placeholder="学号" />
            </Form.Item>
            <Form.Item name="class_name" label="班级">
              <Input placeholder="班级" />
            </Form.Item>
            <Form.Item name="instructor" label="指导教师">
              <Input placeholder="指导教师" />
            </Form.Item>
            <Form.Item name="experiment_date" label="实验日期">
              <Input type="date" />
            </Form.Item>
            <Form.Item name="submit_date" label="提交日期">
              <Input type="date" />
            </Form.Item>
          </div>
        </Form>

        <Divider style={{ margin: '8px 0 28px' }} />

        <Button type="primary" size="large" icon={<ArrowRightOutlined />} onClick={handleStart} block>
          开始{phase === 'prelab' ? '预习报告' : '后续报告'}
        </Button>
      </Card>
    </div>
  );
}
