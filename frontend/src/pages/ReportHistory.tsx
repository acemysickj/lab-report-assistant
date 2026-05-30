import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Popconfirm, message, Tag, Typography, Dropdown } from 'antd';
import { EyeOutlined, DownloadOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { listReports, deleteReport } from '../api/client';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

interface ReportRow {
  key: string;
  id: string;
  experiment_dir: string;
  html_path: string;
  created_at: string;
  size: number;
}

export default function ReportHistory() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReports = () => {
    setLoading(true);
    listReports()
      .then((res) => setReports(res.reports.map((r) => ({ ...r, key: r.id }))))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadReports(); }, []);

  const handleDelete = async (record: ReportRow) => {
    const parts = record.html_path.replace(/\\/g, '/').split('/');
    const filename = parts[parts.length - 1] || record.id;
    try {
      await deleteReport(record.experiment_dir, filename);
      message.success('已删除');
      loadReports();
    } catch { message.error('删除失败'); }
  };

  const handleDownload = (record: ReportRow, format: 'html' | 'pdf' | 'md') => {
    const parts = record.html_path.replace(/\\/g, '/').split('/');
    const filename = parts[parts.length - 1] || `${record.id}.html`;
    window.location.href = `/api/files/reports/${encodeURIComponent(record.experiment_dir)}/${encodeURIComponent(filename)}/download/${format}`;
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const columns: ColumnsType<ReportRow> = [
    { title: '报告 ID', dataIndex: 'id', key: 'id', width: 140, render: (id: string) => <Tag>{id.slice(0, 12)}</Tag> },
    { title: '实验目录', dataIndex: 'experiment_dir', key: 'dir', ellipsis: true },
    { title: '生成时间', dataIndex: 'created_at', key: 'time', width: 180, render: (d: string) => new Date(d).toLocaleString('zh-CN') },
    { title: '大小', dataIndex: 'size', key: 'size', width: 90, render: (s: number) => formatSize(s) },
    {
      title: '操作', key: 'actions', width: 300,
      render: (_, record) => (
        <Space>
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/preview/${record.id}`)}>预览</Button>
          <Dropdown.Button
            size="small"
            icon={<DownloadOutlined />}
            menu={{
              items: [
                { key: 'html', label: 'HTML' },
                { key: 'md', label: 'Markdown' },
                { key: 'pdf', label: 'PDF' },
              ],
              onClick: ({ key }) => handleDownload(record, key as 'html' | 'pdf' | 'md'),
            }}
          >
            下载
          </Dropdown.Button>
          <Popconfirm title="确定删除？" onConfirm={() => handleDelete(record)} okText="确定" cancelText="取消">
            <Button size="small" danger icon={<DeleteOutlined />}>删除</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <Title level={4} style={{ margin: 0 }}>📄 历史报告</Title>
        <Button icon={<ReloadOutlined />} onClick={loadReports}>刷新</Button>
      </div>

      <Table
        columns={columns}
        dataSource={reports}
        loading={loading}
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: '暂无报告，请先生成报告' }}
      />
    </div>
  );
}
