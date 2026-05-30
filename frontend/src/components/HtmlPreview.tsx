import { Card, Button, Space, Dropdown } from 'antd';
import { DownloadOutlined, FullscreenOutlined, FileTextOutlined } from '@ant-design/icons';

interface Props {
  html: string;
  title?: string;
  downloadUrl?: string;
  onDownload?: (format: 'html' | 'pdf' | 'md') => void;
}

export default function HtmlPreview({ html, title = '报告预览', downloadUrl, onDownload }: Props) {

  const handleFullscreen = () => {
    const w = window.open('', '_blank', 'width=900,height=700');
    if (w) {
      w.document.write(html);
      w.document.close();
    }
  };

  const handleDownload = (format: 'html' | 'pdf' | 'md') => {
    if (onDownload) {
      onDownload(format);
      return;
    }
    if (!downloadUrl) return;
    const base = downloadUrl.replace(/\/download(\/html)?$/, '');
    window.location.href = `${base}/download/${format}`;
  };

  return (
    <Card
      title={title}
      extra={
        <Space>
          <Button icon={<FullscreenOutlined />} onClick={handleFullscreen}>
            新窗口打开
          </Button>
          <Dropdown.Button
            type="primary"
            icon={<DownloadOutlined />}
            menu={{
              items: [
                { key: 'html', label: 'HTML 格式' },
                { key: 'md', label: 'Markdown 格式（方便编辑）' },
                { key: 'pdf', label: 'PDF 格式（打印）' },
              ],
              onClick: ({ key }) => handleDownload(key as 'html' | 'pdf' | 'md'),
            }}
          >
            下载
          </Dropdown.Button>
        </Space>
      }
    >
      <iframe
        srcDoc={html}
        style={{ width: '100%', height: '600px', border: '1px solid #e0d8c8', borderRadius: '4px' }}
        title="Report Preview"
      />
    </Card>
  );
}
