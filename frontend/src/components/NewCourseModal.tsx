import { useState } from 'react';
import { Modal, Form, Input, Upload, Button, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
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
    if (values.description && values.description.trim()) {
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
      message.error('请求失败');
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
      title="新建课程"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      okText="创建"
      cancelText="取消"
      destroyOnClose
      width={560}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="name" label="课程名称" rules={[{ required: true, message: '请输入课程名称' }]}>
          <Input placeholder="例如：大学物理实验、有机化学实验" />
        </Form.Item>

        <Form.Item label="讲义文件（.md）">
          <Upload
            fileList={handoutFiles}
            onChange={({ fileList }) => setHandoutFiles(fileList)}
            beforeUpload={beforeMdUpload}
            multiple
            accept=".md"
          >
            <Button icon={<UploadOutlined />}>上传讲义</Button>
          </Upload>
        </Form.Item>

        <Form.Item label="报告模板（.md）">
          <Upload
            fileList={patternFiles}
            onChange={({ fileList }) => setPatternFiles(fileList)}
            beforeUpload={beforeMdUpload}
            multiple
            accept=".md"
          >
            <Button icon={<UploadOutlined />}>上传模板</Button>
          </Upload>
        </Form.Item>

        <Form.Item
          name="description"
          label="实验列表描述（用自然语言描述有哪些实验，AI 自动生成实验索引）"
        >
          <Input.TextArea
            rows={4}
            placeholder="例如：本课程包含6个实验：实验一 原电池电动势的测定及其应用、实验二 蔗糖转化反应速率常数的测定（旋光法）、实验三 电导法测定乙酸乙酯皂化反应的速率常数..."
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
