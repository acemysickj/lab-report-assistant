import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Space, Popconfirm, message, Tag, Typography, Dropdown, Skeleton, Result, Input, Select, Row, Col, Card } from 'antd';
import {
  EyeOutlined, DownloadOutlined, DeleteOutlined, ReloadOutlined,
  ExperimentOutlined, SearchOutlined, FilterOutlined, ClearOutlined,
} from '@ant-design/icons';
import { listReports, deleteReport } from '../api/client';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

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
  const [searchText, setSearchText] = useState('');
  const [courseFilter, setCourseFilter] = useState<string>('');

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

  // Unique experiment directories for filter
  const courseOptions = useMemo(() => {
    const dirs = [...new Set(reports.map((r) => r.experiment_dir).filter(Boolean))];
    return dirs.map((d) => ({ value: d, label: d }));
  }, [reports]);

  // Filtered and searched reports
  const filtered = useMemo(() => {
    let result = reports;
    if (courseFilter) {
      result = result.filter((r) => r.experiment_dir === courseFilter);
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.experiment_dir.toLowerCase().includes(q),
      );
    }
    return result;
  }, [reports, courseFilter, searchText]);

  const clearFilters = () => {
    setSearchText('');
    setCourseFilter('');
  };

  const hasFilters = searchText.trim() !== '' || courseFilter !== '';

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleString('zh-CN'); }
    catch { return dateStr; }
  };

  const columns: ColumnsType<ReportRow> = [
    {
      title: '报告 ID', dataIndex: 'id', key: 'id', width: 140,
      render: (id: string) => <Tag color="blue" style={{ borderRadius: 6 }}>{id.slice(0, 12)}</Tag>,
    },
    {
      title: '实验目录', dataIndex: 'experiment_dir', key: 'dir', ellipsis: true,
      filteredValue: courseFilter ? [courseFilter] : null,
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
          <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/preview/${record.id}`)}
            style={{ borderRadius: 6 }}>
            预览
          </Button>
          <Dropdown.Button
            size="small"
            icon={<DownloadOutlined />}
            style={{ borderRadius: 6 }}
            menu={{
              items: [
                { key: 'html', label: 'HTML 格式' },
                { key: 'md', label: 'Markdown 格式' },
                { key: 'pdf', label: 'PDF 格式' },
              ],
              onClick: ({ key }) => handleDownload(record, key as 'html' | 'pdf' | 'md'),
            }}
          >
            下载
          </Dropdown.Button>
          <Popconfirm
            title="确定删除此报告？" description="删除后无法恢复"
            onConfirm={() => handleDelete(record)}
            okText="确定" cancelText="取消"
            okButtonProps={{ danger: true }}
          >
            <Button size="small" danger icon={<DeleteOutlined />} style={{ borderRadius: 6 }}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  if (error) {
    return (
      <Result
        status="error" title="无法加载报告列表" subTitle={error}
        extra={<Button icon={<ReloadOutlined />} onClick={loadReports}>重试</Button>}
      />
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0 }}>
          <ExperimentOutlined style={{ marginRight: 8 }} />
          历史报告
        </Title>
        <Button icon={<ReloadOutlined />} onClick={loadReports} loading={loading} style={{ borderRadius: 8 }}>
          刷新
        </Button>
      </div>

      {/* Filters */}
      <Card
        size="small"
        style={{ marginBottom: 20, borderRadius: 12, border: '1px solid #e8e0d0', background: '#faf8f0' }}
        styles={{ body: { padding: '16px 20px' } }}
      >
        <Row gutter={[16, 12]} align="middle">
          <Col flex="auto">
            <Input
              prefix={<SearchOutlined style={{ color: '#b0a48e' }} />}
              placeholder="搜索报告 ID 或实验目录..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ borderRadius: 8 }}
            />
          </Col>
          <Col>
            <Select
              prefix={<FilterOutlined style={{ color: '#b0a48e' }} />}
              placeholder="按课程过滤"
              value={courseFilter || undefined}
              onChange={(val) => setCourseFilter(val || '')}
              allowClear
              style={{ minWidth: 200, borderRadius: 8 }}
              options={courseOptions}
            />
          </Col>
          {hasFilters && (
            <Col>
              <Button
                icon={<ClearOutlined />}
                onClick={clearFilters}
                style={{ borderRadius: 8 }}
              >
                清除筛选
              </Button>
            </Col>
          )}
        </Row>
      </Card>

      {/* Results indicator */}
      {hasFilters && (
        <div style={{ marginBottom: 14 }}>
          <Text type="secondary" style={{ fontSize: 13 }}>
            <FilterOutlined style={{ marginRight: 4 }} />
            找到 {filtered.length} / {reports.length} 份报告
          </Text>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <Table
          columns={columns}
          dataSource={filtered}
          pagination={{
            pageSize: 20,
            showTotal: (total) => `共 ${total} 份报告`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50'],
          }}
          locale={{ emptyText: hasFilters ? '没有匹配的报告' : '暂无报告，请先生成报告后再来查看' }}
        />
      )}
    </div>
  );
}
