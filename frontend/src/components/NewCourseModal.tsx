import { useState } from 'react';
import { Modal, Form, Input, Upload, Button, message, Typography, Divider } from 'antd';
import { UploadOutlined, BookOutlined, FileTextOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';

interface Props {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewCourseModal({ open, onClose, onCreated }: Props) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [handoutFiles, setHandoutFiles] = useState<UploadFile[]>([]);
  const [patternFiles, setPatternFiles] = useState<UploadFile[]>([]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    setLoading(true);

    const fd = new FormData();
    fd.append('name', values.name);
    handoutFiles.forEach((f) => {
      if (f.originFileObj) fd.append('handouts', f.originFileObj);
    });
    patternFiles.forEach((f) => {
      if (f.originFileObj) fd.append('patterns', f.originFileObj);
    });
    if (values.description?.trim()) {
      fd.append('description', values.description.trim());
    }

    try {
      const res = await fetch('/api/courses/create', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json();
        message.success(data.message || '课程创建成功');
        form.resetFields();
        setHandoutFiles([]);
        setPatternFiles([]);
        onCreated();
        onClose();
      } else {
        const err = await res.json();
        message.error(err.detail || '创建失败');
      }
    } catch {
      message.error('请求失败，请确认后端已启动');
    }
    setLoading(false);
  };

  const beforeMdUpload = (file: File) => {
    const isMd = file.name.endsWith('.md');
    if (!isMd) message.warning('只支持 .md 文件');
    return isMd || Upload.LIST_IGNORE;
  };

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <BookOutlined style={{ color: '#3d7a4f' }} />
          新建课程
        </span>
      }
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="创建课程"
      cancelText="取消"
      destroyOnClose
      width={580}
      styles={{ body: { padding: '24px 28px' } }}
    >
      <Form form={form} layout="vertical">
        {/* Course name */}
        <Form.Item
          name="name"
          label={<span style={{ fontWeight: 500 }}>课程名称</span>}
          rules={[{ required: true, message: '请输入课程名称' }]}
        >
          <Input
            placeholder="例如：大学物理实验、有机化学实验"
            prefix={<BookOutlined style={{ color: '#b0a48e' }} />}
            style={{ borderRadius: 8 }}
          />
        </Form.Item>

        <Divider style={{ margin: '16px 0' }} />

        {/* Handout files */}
        <Form.Item
          label={
            <span style={{ fontWeight: 500 }}>
              <FileTextOutlined style={{ marginRight: 6, color: '#8b7a60' }} />
              讲义文件（.md）
            </span>
          }
        >
          <Upload
            fileList={handoutFiles}
            onChange={({ fileList }) => setHandoutFiles(fileList)}
            beforeUpload={beforeMdUpload}
            multiple
            accept=".md"
          >
            <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>
              上传讲义 Markdown 文件
            </Button>
          </Upload>
        </Form.Item>

        {/* Pattern files */}
        <Form.Item
          label={
            <span style={{ fontWeight: 500 }}>
              <FileTextOutlined style={{ marginRight: 6, color: '#8b7a60' }} />
              报告模板（.md）
            </span>
          }
        >
          <Upload
            fileList={patternFiles}
            onChange={({ fileList }) => setPatternFiles(fileList)}
            beforeUpload={beforeMdUpload}
            multiple
            accept=".md"
          >
            <Button icon={<UploadOutlined />} style={{ borderRadius: 8 }}>
              上传报告模板 Markdown 文件
            </Button>
          </Upload>
        </Form.Item>

        <Divider style={{ margin: '16px 0' }} />

        {/* Description */}
        <Form.Item
          name="description"
          label={
            <span style={{ fontWeight: 500 }}>
              <InfoCircleOutlined style={{ marginRight: 6, color: '#8b7a60' }} />
              实验列表描述
            </span>
          }
          extra={
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              用自然语言描述有哪些实验，AI 将自动生成实验索引
            </Typography.Text>
          }
        >
          <Input.TextArea
            rows={4}
            placeholder="例如：本课程包含6个实验：实验一 原电池电动势的测定及其应用、实验二 蔗糖转化反应速率常数的测定（旋光法）、实验三 电导法测定乙酸乙酯皂化反应的速率常数..."
            style={{ borderRadius: 10 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
