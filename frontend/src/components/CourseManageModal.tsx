import { useState, useEffect } from 'react';
import { Modal, Descriptions, Button, Space, Popconfirm, message, Tag, Input, Typography, Table, Spin, Empty } from 'antd';
import {
  DeleteOutlined,
  ReloadOutlined,
  ExperimentOutlined,
  FileTextOutlined,
  WarningOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import { deleteCourse, reparseCourse, getExperiments } from '../api/client';
import type { Experiment } from '../types';

interface Props {
  open: boolean;
  courseId: string;
  courseName: string;
  onClose: () => void;
  onDeleted: () => void;
  onUpdated: () => void;
}

export default function CourseManageModal({
  open, courseId, courseName, onClose, onDeleted, onUpdated,
}: Props) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(false);
  const [reparseDesc, setReparseDesc] = useState('');
  const [reparsing, setReparsing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open || !courseId) return;
    setLoading(true);
    getExperiments(courseId)
      .then((res) => setExperiments(res.experiments))
      .catch(() => setExperiments([]))
      .finally(() => setLoading(false));
  }, [open, courseId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteCourse(courseId);
      message.success(`课程「${courseName}」已删除`);
      onDeleted();
      onClose();
    } catch (err) {
      message.error(`删除失败：${(err as Error).message}`);
    } finally {
      setDeleting(false);
    }
  };

  const handleReparse = async () => {
    if (!reparseDesc.trim()) {
      message.warning('请输入实验列表描述');
      return;
    }
    setReparsing(true);
    try {
      const res = await reparseCourse(courseId, reparseDesc.trim());
      message.success(res.message || '实验列表已更新');
      setReparseDesc('');
      // Reload experiments
      const expRes = await getExperiments(courseId);
      setExperiments(expRes.experiments);
      onUpdated();
    } catch (err) {
      message.error(`重新解析失败：${(err as Error).message}`);
    } finally {
      setReparsing(false);
    }
  };

  const expColumns = [
    { title: '#', key: 'idx', width: 50, render: (_: unknown, __: unknown, i: number) => i + 1 },
    {
      title: 'ID', dataIndex: 'id', key: 'id', width: 100,
      render: (id: string) => <Tag style={{ borderRadius: 6 }}>{id}</Tag>,
    },
    { title: '实验名称', dataIndex: 'title', key: 'title' },
  ];

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <ExperimentOutlined style={{ color: '#3d7a4f' }} />
          课程管理：{courseName}
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={620}
      destroyOnClose
      styles={{ body: { padding: '24px 28px' } }}
    >
      {/* Experiment list */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Typography.Text strong style={{ fontSize: 14 }}>
            <FileTextOutlined style={{ marginRight: 6, color: '#3d7a4f' }} />
            实验列表
          </Typography.Text>
          <Tag color="blue" style={{ borderRadius: 8 }}>{experiments.length} 个实验</Tag>
        </div>

        {loading ? (
          <Spin style={{ display: 'block', textAlign: 'center', padding: 24 }} />
        ) : experiments.length === 0 ? (
          <Empty description="暂无实验" />
        ) : (
          <Table
            dataSource={experiments.map((e: Experiment) => ({ ...e, key: e.id }))}
            columns={expColumns}
            pagination={false}
            size="small"
            bordered
            style={{ borderRadius: 8, overflow: 'hidden' }}
          />
        )}
      </div>

      {/* Re-parse section */}
      <div style={{
        background: '#faf8f0', borderRadius: 12, padding: '20px 22px',
        border: '1px solid #e8e0d0', marginBottom: 24,
      }}>
        <Typography.Text strong style={{ display: 'block', marginBottom: 10, fontSize: 14 }}>
          <RobotOutlined style={{ marginRight: 6, color: '#3d7a4f' }} />
          用 AI 重新解析实验列表
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 12 }}>
          重新描述实验列表，AI 将自动更新实验索引
        </Typography.Text>
        <Input.TextArea
          value={reparseDesc}
          onChange={(e) => setReparseDesc(e.target.value)}
          placeholder="例如：本课程包含6个实验：实验一 原电池电动势的测定及其应用..."
          rows={3}
          style={{ borderRadius: 10, marginBottom: 10 }}
        />
        <Button
          icon={<RobotOutlined />}
          onClick={handleReparse}
          loading={reparsing}
          disabled={!reparseDesc.trim()}
          style={{ borderRadius: 8 }}
        >
          重新解析
        </Button>
      </div>

      {/* Danger zone */}
      <div style={{
        background: '#fdf2f2', borderRadius: 12, padding: '20px 22px',
        border: '1px solid #f0d0d0',
      }}>
        <Typography.Text strong style={{ display: 'block', marginBottom: 4, fontSize: 14, color: '#b54b4b' }}>
          <WarningOutlined style={{ marginRight: 6 }} />
          危险操作
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 14 }}>
          删除课程将移除所有讲义、模板和索引文件，此操作不可恢复
        </Typography.Text>
        <Popconfirm
          title="确定删除此课程？"
          description="所有讲义、模板和索引文件将被永久删除，不可恢复。"
          onConfirm={handleDelete}
          okText="确定删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
        >
          <Button
            danger
            icon={<DeleteOutlined />}
            loading={deleting}
            style={{ borderRadius: 8 }}
          >
            删除课程
          </Button>
        </Popconfirm>
      </div>
    </Modal>
  );
}
