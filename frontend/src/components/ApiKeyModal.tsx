import { useState, useEffect } from 'react';
import { Modal, Input, Button, Typography, Space, Alert, Tag, message, Spin } from 'antd';
import { KeyOutlined, CheckCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { getApiKey, setApiKey, hasApiKey } from '../utils/apiKeyStore';

const { Text, Paragraph } = Typography;

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function ApiKeyModal({ open, onClose, onSaved }: Props) {
  const [key, setKey] = useState('');
  const [validating, setValidating] = useState(false);
  const [validResult, setValidResult] = useState<{ valid: boolean; provider: string; error: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setKey(getApiKey());
      setValidResult(null);
    }
  }, [open]);

  const handleValidate = async () => {
    const k = key.trim();
    if (!k) { message.warning('请先输入 API Key'); return; }
    setValidating(true);
    setValidResult(null);
    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: k }),
      });
      const data = await res.json();
      setValidResult(data);
    } catch {
      setValidResult({ valid: false, provider: '', error: '网络请求失败' });
    } finally {
      setValidating(false);
    }
  };

  const handleSave = () => {
    setApiKey(key);
    setSaving(true);
    setTimeout(() => { setSaving(false); message.success('API Key 已保存'); onSaved(); onClose(); }, 300);
  };

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <KeyOutlined style={{ color: '#3d7a4f' }} />
          设置 API Key
        </span>
      }
      open={open}
      onCancel={onClose}
      footer={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button onClick={handleValidate} loading={validating} icon={<CheckCircleOutlined />}>
            测试 Key
          </Button>
          <Space>
            <Button onClick={onClose}>取消</Button>
            <Button type="primary" onClick={handleSave} loading={saving} disabled={!key.trim()}>
              保存
            </Button>
          </Space>
        </Space>
      }
      width={520}
      styles={{ body: { padding: '24px' } }}
    >
      <Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 16 }}>
        支持 DeepSeek API Key（<Text code>sk-...</Text>）或 Anthropic API Key（<Text code>sk-ant-...</Text>）。
        Key 仅保存在浏览器本地存储中，不会被上传到服务器。
      </Paragraph>

      <Input.Password
        value={key}
        onChange={(e) => { setKey(e.target.value); setValidResult(null); }}
        placeholder="sk-..."
        size="large"
        style={{ borderRadius: 8, fontFamily: 'monospace' }}
        visibilityToggle
      />

      <div style={{ marginTop: 8 }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          获取 Key：<a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener">DeepSeek</a> · <a href="https://console.anthropic.com/" target="_blank" rel="noopener">Anthropic</a>
        </Text>
      </div>

      {validResult && (
        <div style={{ marginTop: 16 }}>
          {validResult.valid ? (
            <Alert
              type="success"
              message={
                <span>
                  <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 6 }} />
                  Key 有效
                </span>
              }
              description={
                <span>
                  提供商：<Tag color="green" style={{ borderRadius: 6 }}>{validResult.provider === 'anthropic' ? 'Anthropic' : 'DeepSeek'}</Tag>
                </span>
              }
              showIcon={false}
              style={{ borderRadius: 10 }}
            />
          ) : (
            <Alert
              type="error"
              message={
                <span>
                  <ExclamationCircleOutlined style={{ color: '#ff4d4f', marginRight: 6 }} />
                  Key 无效
                </span>
              }
              description={<Text type="danger" style={{ fontSize: 12 }}>{validResult.error}</Text>}
              showIcon={false}
              style={{ borderRadius: 10 }}
            />
          )}
        </div>
      )}

      {!hasApiKey() && !validResult && (
        <Alert
          type="warning"
          message="尚未配置 API Key"
          description="AI 生成功能需要 API Key。请输入后点击「测试 Key」验证，然后保存。"
          showIcon
          style={{ marginTop: 16, borderRadius: 10 }}
        />
      )}
    </Modal>
  );
}
