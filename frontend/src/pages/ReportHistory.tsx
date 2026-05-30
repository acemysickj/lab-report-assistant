import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Popconfirm, message, Tag, Typography, Dropdown, Skeleton, Result } from 'antd';
import { EyeOutlined, DownloadOutlined, DeleteOutlined, ReloadOutlined, ExperimentOutlined } from '@ant-design/icons';
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
  const [error, setError] = useState('');

  const loadReports = useCallback(() => {
    setLoading(true);
    setError('');
    listReports()
      .then((res) => {
        setReports(res.reports.map((r) => ({ ...r, key: r.id })));
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || '无法加载报告列表');
        setLoading(false);
      });
  }, []);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleDelete = async (record: ReportRow) => {
    const parts = record.html_path.replace(/\\/g, '/').split('/');
    const filename = parts[parts.length - 1] || record.id;
    try {
      await deleteReport(record.experiment_dir, filename);
      message.success('已删除');
      loadReports();
    } catch (err) {
      message.error(`删除失败：${(err as Error).message || '未知错误'}`);
    }
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

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString('zh-CN');
    } catch {
      return dateStr;
    }
  };

  const columns: ColumnsType<ReportRow> = [
    {
      title: '报告 ID', dataIndex: 'id', key: 'id', width: 140,
      render: (id: string) => <Tag color="blue">{id.slice(0, 12)}</Tag>,
    },
    {
      title: '实验目录', dataIndex: 'experiment_dir', key: 'dir',
      ellipsis: true,
    },
    {
      title: '生成时间', dataIndex: 'created_at', key: 'time', width: 180,
      render: (d: string) => formatDate(d),
      sorter: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      defaultSortOrder: 'descend',
    },
    {
      title: '大小', dataIndex: 'size', key: 'size', width: 90,
      render: (s: number) => formatSize(s),
    },
    {
      title: '操作', key: 'actions', width: 300,
      render: (_, record) => (
        <Space size="small">
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => navigate(`/preview/${record.id}`)}
          >
            预览
          </Button>
          <Dropdown.Button
            size="small"
            icon={<DownloadOutlined />}
            menu={{
              items: [
                { key: 'html', label: 'HTML 格式' },
                { key: 'md', label: 'Markdown 格式（方便编辑）' },
                { key: 'pdf', label: 'PDF 格式（打印）' },
              ],
              onClick: ({ key }) => handleDownload(record, key as 'html' | 'pdf' | 'md'),
            }}
          >
            下载
          </Dropdown.Button>
          <Popconfirm
            title="确定删除此报告？"
            description="删除后无法恢复"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // ---- Error state ----
  if (error) {
    return (
      <Result
        status="error"
        title="无法加载报告列表"
        subTitle={error}
        extra={
          <Button icon={<ReloadOutlined />} onClick={loadReports}>
            重试
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <Title level={4} style={{ margin: 0 }}>
          <ExperimentOutlined style={{ marginRight: 8 }} />
          历史报告
        </Title>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={loadReports} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <Table
          columns={columns}
          dataSource={reports}
          pagination={{
            pageSize: 20,
            showTotal: (total) => `共 ${total} 份报告`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
          }}
          locale={{ emptyText: '暂无报告，请先生成报告后再来查看' }}
        />
      )}
    </div>
  );
}
