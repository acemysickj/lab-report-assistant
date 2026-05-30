import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Space, Result, Typography, Skeleton, message } from 'antd';
import { ArrowLeftOutlined, HomeOutlined, ReloadOutlined } from '@ant-design/icons';
import { listReports } from '../api/client';
import HtmlPreview from '../components/HtmlPreview';

const { Text } = Typography;

export default function ReportPreview() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');

  useEffect(() => {
    if (!reportId) {
      setError('未指定报告 ID');
      setLoading(false);
      return;
    }

    // Try sessionStorage cache first (freshly generated report)
    const lastId = sessionStorage.getItem('lastReportId');
    const lastHtml = sessionStorage.getItem('lastReportHtml');
    const lastPath = sessionStorage.getItem('lastReportPath');

    if (lastId === reportId && lastHtml) {
      setHtml(lastHtml);
      if (lastPath) setDownloadUrl(buildDownloadUrl(lastPath));
      setLoading(false);
      return;
    }

    // Fallback: look up report from the list
    loadReportFromServer(reportId);
  }, [reportId]);

  const loadReportFromServer = (id: string) => {
    setLoading(true);
    setError('');

    listReports()
      .then(async (res) => {
        const report = res.reports.find((r) => r.id === id);
        if (!report) {
          setError('报告未找到，可能已被删除');
          setLoading(false);
          return;
        }

        const pathParts = report.html_path.replace(/\\/g, '/').split('/');
        const filename = pathParts[pathParts.length - 1];
        const expDir = report.experiment_dir || pathParts[pathParts.length - 2] || '';
        const apiPath = `/api/files/reports/${encodeURIComponent(expDir)}/${encodeURIComponent(filename)}`;
        setDownloadUrl(`${apiPath}/download`);

        const resp = await fetch(apiPath);
        if (resp.ok) {
          setHtml(await resp.text());
        } else {
          setError(`无法加载报告内容 (HTTP ${resp.status})`);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(`无法连接后端：${err.message || '请确认服务已启动'}`);
        setLoading(false);
      });
  };

  const handleDownload = (format: 'html' | 'pdf' | 'md') => {
    if (!downloadUrl) {
      // Fallback for sessionStorage reports
      message.info('下载链接不可用，请从历史报告页面下载');
      return;
    }
    const base = downloadUrl.replace(/\/download(\/html)?$/, '');
    window.location.href = `${base}/download/${format}`;
  };

  // ---- Loading ----
  if (loading) {
    return (
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <Skeleton active paragraph={{ rows: 1 }} style={{ marginBottom: 24 }} />
        <Skeleton active paragraph={{ rows: 12 }} />
      </div>
    );
  }

  // ---- Error ----
  if (error) {
    return (
      <Result
        status="warning"
        title="无法加载报告"
        subTitle={error}
        extra={
          <Space>
            <Button onClick={() => loadReportFromServer(reportId || '')} icon={<ReloadOutlined />}>
              重试
            </Button>
            <Button type="primary" onClick={() => navigate('/history')}>
              历史报告
            </Button>
            <Button onClick={() => navigate('/')}>首页</Button>
          </Space>
        }
      />
    );
  }

  // ---- Content ----
  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(-1)}
            style={{ color: '#6b5e4a', paddingLeft: 0 }}
          >
            返回
          </Button>
          <Button type="text" icon={<HomeOutlined />} onClick={() => navigate('/')} style={{ color: '#6b5e4a' }}>
            首页
          </Button>
        </Space>
        <Text type="secondary" style={{ fontSize: 13 }}>
          报告 #{reportId}
        </Text>
      </div>

      <HtmlPreview html={html} downloadUrl={downloadUrl} onDownload={handleDownload} />
    </div>
  );
}

function buildDownloadUrl(lastPath: string): string {
  const parts = lastPath.replace(/\\/g, '/').split('/output/');
  if (parts.length === 2) {
    return `/api/files/reports/${encodeURIComponent(parts[1])}/download`;
  }
  return '';
}