import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Space, Spin, Result, Typography, message } from 'antd';
import { ArrowLeftOutlined, HomeOutlined, FileWordOutlined } from '@ant-design/icons';
import { listReports, exportDocx } from '../api/client';
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
    const lastId = sessionStorage.getItem('lastReportId');
    const lastHtml = sessionStorage.getItem('lastReportHtml');
    const lastPath = sessionStorage.getItem('lastReportPath');

    if (reportId && lastId === reportId && lastHtml) {
      setHtml(lastHtml);
      if (lastPath) setDownloadUrl(buildDownloadUrl(lastPath));
      setLoading(false);
      return;
    }

    listReports()
      .then(async (res) => {
        const report = res.reports.find((r) => r.id === reportId);
        if (!report) { setError('报告未找到'); setLoading(false); return; }
        const pathParts = report.html_path.replace(/\\/g, '/').split('/');
        const filename = pathParts[pathParts.length - 1];
        const expDir = report.experiment_dir || pathParts[pathParts.length - 2] || '';
        const apiPath = `/api/files/reports/${encodeURIComponent(expDir)}/${encodeURIComponent(filename)}`;
        setDownloadUrl(`${apiPath}/download`);
        const resp = await fetch(apiPath);
        if (resp.ok) setHtml(await resp.text());
        else setError('无法加载报告内容');
        setLoading(false);
      })
      .catch(() => { setError('无法连接后端'); setLoading(false); });
  }, [reportId]);

  const handleDownload = (format: 'html' | 'pdf' | 'md') => {
    const base = downloadUrl.replace(/\/download(\/html)?$/, '');
    window.location.href = `${base}/download/${format}`;
  };

  const [docxLoading, setDocxLoading] = useState(false);
  const handleDocxDownload = async () => {
    if (!html) {
      message.warning('报告内容为空');
      return;
    }
    setDocxLoading(true);
    try {
      await exportDocx(html);
      message.success('DOCX 下载已开始');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'DOCX 导出失败';
      message.error(msg);
    } finally {
      setDocxLoading(false);
    }
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 120 }}><Spin size="large" /></div>;

  if (error) {
    return (
      <Result status="warning" title={error}
        extra={<Space><Button onClick={() => navigate('/history')}>历史报告</Button><Button type="primary" onClick={() => navigate('/')}>首页</Button></Space>} />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Space>
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)} style={{ color: '#6b5e4a', paddingLeft: 0 }}>返回</Button>
          <Button type="text" icon={<HomeOutlined />} onClick={() => navigate('/')} style={{ color: '#6b5e4a' }}>首页</Button>
        </Space>
        <Space>
          <Button
            type="primary"
            icon={<FileWordOutlined />}
            onClick={handleDocxDownload}
            loading={docxLoading}
          >
            下载 DOCX
          </Button>
          <Text type="secondary" style={{ fontSize: 13 }}>报告 #{reportId}</Text>
        </Space>
      </div>
      <HtmlPreview html={html} downloadUrl={downloadUrl} onDownload={handleDownload} />
    </div>
  );
}

function buildDownloadUrl(lastPath: string): string {
  const parts = lastPath.replace(/\\/g, '/').split('/output/');
  if (parts.length === 2) return `/api/files/reports/${encodeURIComponent(parts[1])}/download`;
  return '';
}
