import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Space, Input, message, Result, Typography, Alert, Tag, Row, Col, Modal, Spin } from 'antd';
import {
  ArrowLeftOutlined, ArrowRightOutlined, SendOutlined, ReloadOutlined,
  EditOutlined, RobotOutlined, CheckCircleOutlined, BulbOutlined,
} from '@ant-design/icons';
import { SECTION_LABELS, type PreLabSection } from '../types';
import { blocksToHtml } from '../utils/blocksToHtml';
import { assemblePrelab as apiAssemble } from '../api/client';
import { useSSE } from '../hooks/useSSE';
import ProgressStepper from '../components/ProgressStepper';
import MathPreview from '../components/MathPreview';
import { usePrelabStore } from '../stores/prelabStore';

const PRELAB_SECTIONS: PreLabSection[] = ['purpose', 'principle', 'equipment', 'procedure'];
const PRELAB_STEPS = PRELAB_SECTIONS.map((s) => ({ title: SECTION_LABELS[s], description: '' }));

const SECTION_ICONS: Record<string, React.ReactNode> = {
  purpose: <BulbOutlined />,
  principle: <RobotOutlined />,
  equipment: <CheckCircleOutlined />,
  procedure: <EditOutlined />,
};

export default function PreLabFlow() {
  const { courseId, experimentId } = useParams<{ courseId: string; experimentId: string }>();
  const navigate = useNavigate();
  const cId = courseId || sessionStorage.getItem('courseId') || '';
  const eId = experimentId || sessionStorage.getItem('experimentId') || '';

  const store = usePrelabStore();
  const sse = useSSE();
  const reviseSse = useSSE();
  const studentInfo = JSON.parse(sessionStorage.getItem('studentInfo') || '{}');
  const currentSection = PRELAB_SECTIONS[store.currentStep];
  const isLastStep = store.currentStep >= PRELAB_SECTIONS.length - 1;

  // ── Restore modal ──
  const [restoreOpen, setRestoreOpen] = useState(false);
  useEffect(() => {
    if (store.sections && Object.keys(store.sections).length > 0 && store.phase === 'idle') {
      setRestoreOpen(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── SSE 触发 ──
  const doGenerate = () => {
    sse.reset();
    store.startGenerate();
    sse.startStream('/reports/prelab/generate', {
      course_id: cId, experiment_id: eId, section: currentSection, student_info: studentInfo,
    });
  };

  const doRevise = () => {
    if (!store.feedback.trim()) { message.warning('请输入修改意见'); return; }
    const content = store.revisedContent || store.generatedContent;
    reviseSse.reset();
    store.startRevise();
    reviseSse.startStream('/reports/prelab/revise', {
      course_id: cId, experiment_id: eId, section: currentSection,
      content, feedback: store.feedback.trim(),
    });
  };

  // ── SSE 完成检测 ──
  const isStreaming = sse.streaming || reviseSse.streaming;
  useEffect(() => {
    if (store.phase === 'generating' && !isStreaming) {
      console.log('[PreLabFlow] SSE stopped. sse.content length:', sse.content.length, 'sse.error:', sse.error?.slice(0, 100), 'reviseSse.content:', !!reviseSse.content);
      if (reviseSse.content) {
        store.finishRevise(reviseSse.content);
      } else if (sse.content) {
        store.finishGenerate(sse.content);
      } else {
        // SSE stopped with no content — likely an error
        store.setError(sse.error || '生成失败，请检查 API Key 是否有效');
      }
    }
  }, [store.phase, isStreaming, sse.content, reviseSse.content, sse.error, store]);

  // ── Display HTML ──
  const contentToShow = store.revisedContent || store.generatedContent;
  const displayHtml = useMemo(() => {
    console.log('[displayHtml] phase:', store.phase, 'contentToShow length:', contentToShow.length, 'isStreaming:', isStreaming);
    if (store.sections[currentSection]?.length) {
      console.log('[displayHtml] using saved sections, blocks count:', store.sections[currentSection].length);
      return blocksToHtml(store.sections[currentSection]);
    }
    if (contentToShow && !isStreaming) {
      try {
        const parsed = JSON.parse(contentToShow.trim());
        const blocks = Array.isArray(parsed) ? parsed : (parsed.blocks || []);
        console.log('[displayHtml] parsed blocks count:', blocks.length, 'first block:', blocks[0]?.type);
        if (blocks.length) return blocksToHtml(blocks);
      } catch (e) { console.log('[displayHtml] JSON parse error:', e); }
    }
    return '';
  }, [currentSection, store.sections, contentToShow, isStreaming, store.phase]);

  // ── Assemble ──
  const doAssemble = async () => {
    message.loading({ content: '正在组装报告...', key: 'assemble', duration: 0 });
    try {
      const result = await apiAssemble({
        course_id: cId, experiment_id: eId,
        sections: store.sections as any, student_info: studentInfo,
      });
      message.destroy('assemble');
      sessionStorage.setItem('lastReportHtml', result.html);
      sessionStorage.setItem('lastReportId', result.report_id);
      sessionStorage.setItem('lastReportPath', result.html_path);
      store.finishAssemble();
    } catch (err) {
      message.destroy('assemble');
      store.finishAssemble();
      message.error(`组装失败：${(err as Error).message}`);
    }
  };

  // Trigger assemble when phase transitions to assembling
  useEffect(() => {
    if (store.phase === 'assembling') { doAssemble(); }
  }, [store.phase]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Completion screen ──
  if (store.phase === 'done') {
    const reportId = sessionStorage.getItem('lastReportId') || '';
    return (
      <Result status="success" title="预习报告生成完成" subTitle="报告已保存，可以预览或下载"
        icon={<div style={{ width: 80, height: 80, borderRadius: 20, background: 'linear-gradient(135deg, #eef5ef 0%, #dce9df 100%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><CheckCircleOutlined style={{ color: '#3d7a4f', fontSize: 40 }} /></div>}
        extra={[
          <Button key="preview" type="primary" size="large" onClick={() => navigate(`/preview/${reportId}`)} style={{ borderRadius: 10, fontWeight: 600 }}>预览报告</Button>,
          <Button key="home" size="large" onClick={() => navigate('/')} style={{ borderRadius: 10 }}>返回首页</Button>,
        ]}
      />
    );
  }

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Restore modal */}
      <Modal title="恢复上次进度？" open={restoreOpen}
        onOk={() => setRestoreOpen(false)}
        onCancel={() => { store.clearAll(); setRestoreOpen(false); }}
        okText="恢复进度" cancelText="放弃">
        <Typography.Text type="secondary">检测到上次未完成的进度，是否恢复已生成的章节内容？</Typography.Text>
      </Modal>

      {/* Top bar */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 32 }}>
        <Col><Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/setup/${encodeURIComponent(cId)}/${encodeURIComponent(eId)}`)} style={{ color: '#6b5e4a', paddingLeft: 0, fontWeight: 500 }}>返回</Button></Col>
        <Col flex="auto" style={{ maxWidth: 500, padding: '0 24px' }}><ProgressStepper current={store.currentStep} steps={PRELAB_STEPS} /></Col>
        <Col style={{ width: 80 }} />
      </Row>

      {/* Section tags */}
      <div style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PRELAB_SECTIONS.map((s) => (
          <Tag key={s} color={store.sections[s] ? 'success' : 'default'} icon={store.sections[s] ? <CheckCircleOutlined /> : undefined} style={{ borderRadius: 8, padding: '2px 10px', fontSize: 12 }}>{SECTION_LABELS[s]}</Tag>
        ))}
      </div>

      {/* Error alert */}
      {store.error && <Alert message={store.error} type="error" showIcon closable onClose={store.resetError} style={{ marginBottom: 16, borderRadius: 10 }} />}

      {/* SSE error */}
      {sse.error && <Alert message="生成失败" description={sse.error} type="error" showIcon style={{ marginBottom: 16, borderRadius: 10 }} action={<Button onClick={doGenerate}>重试</Button>} />}

      {/* Main card */}
      <Card style={{ borderRadius: 14, border: '1px solid #e8e0d0' }} styles={{ body: { padding: '32px 36px' } }}>
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <Tag color="green" style={{ borderRadius: 12, padding: '4px 16px', fontSize: 13, fontWeight: 600, marginBottom: 12 }} icon={SECTION_ICONS[currentSection]}>{SECTION_LABELS[currentSection]}</Tag>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 13 }}>第 {store.currentStep + 1} / {PRELAB_SECTIONS.length} 部分</Typography.Text>
        </div>

        {/* ── IDLE ── */}
        {store.phase === 'idle' && (
          <div style={{ textAlign: 'center', padding: '40px 0 20px' }}>
            <div style={{ width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, #eef5ef 0%, #dce9df 100%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
              <RobotOutlined style={{ color: '#3d7a4f', fontSize: 28 }} />
            </div>
            <Button type="primary" size="large" onClick={doGenerate} style={{ height: 48, fontSize: 15, paddingInline: 36, borderRadius: 12, fontWeight: 600 }}>🤖 AI 生成「{SECTION_LABELS[currentSection]}」</Button>
            <Typography.Text style={{ color: '#8b7a60', fontSize: 13, display: 'block', marginTop: 16 }}>将根据实验讲义和格式规范自动生成内容，并经过 AI 自动审查</Typography.Text>
          </div>
        )}

        {/* ── GENERATING ── */}
        {store.phase === 'generating' && (
          <MathPreview html="" loading status="AI 正在生成内容..." height="300px" />
        )}

        {/* ── REVIEW / EDITING: 内容区 ── */}
        {(store.phase === 'review' || store.phase === 'editing' || store.phase === 'assembling') && (
          <>
            {store.phase === 'editing' ? (
              <Input.TextArea
                value={store.revisedContent || store.generatedContent}
                onChange={(e) => { store.finishRevise(e.target.value); }}
                rows={12} style={{ fontFamily: 'monospace', fontSize: 13, borderRadius: 10 }}
              />
            ) : store.phase === 'assembling' ? (
              <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /><Typography.Text type="secondary" style={{ display: 'block', marginTop: 16 }}>正在组装报告...</Typography.Text></div>
            ) : (
              <MathPreview html={displayHtml} loading={false} height="400px" />
            )}

            {/* Toolbar (review only) */}
            {store.phase === 'review' && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20, paddingTop: 16, borderTop: '1px solid #f0ebe0' }}>
                <Space>
                  <Button icon={<EditOutlined />} onClick={store.startEdit} style={{ borderRadius: 8 }}>编辑内容</Button>
                  <Button icon={<ReloadOutlined />} onClick={() => { sse.reset(); doGenerate(); }} style={{ borderRadius: 8 }}>重新生成</Button>
                </Space>
              </div>
            )}
          </>
        )}

        {/* ── REVIEW: 反馈 + 操作 ── */}
        {store.phase === 'review' && (
          <Card style={{ marginTop: 20, borderRadius: 14, border: '1px solid #e8e0d0' }}>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>💬 给 AI 提修改意见</div>
            <Input.TextArea value={store.feedback} onChange={(e) => store.setFeedback(e.target.value)} placeholder="例如：原理部分太简略，请补充公式推导过程..." rows={3} style={{ borderRadius: 10 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
              <Button type="primary" icon={<SendOutlined />} onClick={doRevise} loading={isStreaming} disabled={!store.feedback.trim()} style={{ borderRadius: 8 }}>提交反馈让 AI 修改</Button>
              <Button size="large" icon={<ArrowRightOutlined />} type="primary" ghost onClick={store.acceptSection} style={{ borderRadius: 10, fontWeight: 600 }}>{isLastStep ? '完成，组装报告' : '满意了，下一步'}</Button>
            </div>
            {reviseSse.error && <Alert message={reviseSse.error} type="error" showIcon style={{ marginTop: 12, borderRadius: 8 }} />}
          </Card>
        )}

        {/* ── EDITING: 保存按钮 ── */}
        {store.phase === 'editing' && (
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button onClick={store.cancelEdit} style={{ borderRadius: 8 }}>取消编辑</Button>
              <Button type="primary" size="large" icon={<ArrowRightOutlined />} onClick={store.acceptSection} style={{ borderRadius: 10, fontWeight: 600 }}>{isLastStep ? '保存并组装' : '保存并继续'}</Button>
            </Space>
          </div>
        )}
      </Card>
    </div>
  );
}
