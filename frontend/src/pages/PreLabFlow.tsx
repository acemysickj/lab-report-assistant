import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Space, Input, message, Result, Typography, Alert, Tag, Row, Col, Modal } from 'antd';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  SendOutlined,
  ReloadOutlined,
  EditOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import { SECTION_LABELS, type PreLabSection } from '../types';
import { blocksToHtml, type ReportBlock } from '../utils/blocksToHtml';
import { assemblePrelab as apiAssemble } from '../api/client';
import { useSSE } from '../hooks/useSSE';
import { useAutoSave } from '../hooks/useAutoSave';
import { useUnsavedWarning } from '../hooks/useUnsavedWarning';
import ProgressStepper from '../components/ProgressStepper';
import MathPreview from '../components/MathPreview';
import ReviewPanel from '../components/ReviewPanel';
import type { ReviewResult } from '../types';

const PRELAB_SECTIONS: PreLabSection[] = ['purpose', 'principle', 'equipment', 'procedure'];
const PRELAB_STEPS = PRELAB_SECTIONS.map((s) => ({
  title: SECTION_LABELS[s],
  description: '',
}));

// Section icons
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

  const [currentStep, setCurrentStep] = useState(0);
  const [sections, setSections] = useState<Record<string, ReportBlock[]>>({});
  const [editingContent, setEditingContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [complete, setComplete] = useState(false);
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);

  const sse = useSSE();
  const reviseSse = useSSE();

  const studentInfo = useRef(JSON.parse(sessionStorage.getItem('studentInfo') || '{}')).current;
  const currentSection = PRELAB_SECTIONS[currentStep];

  // Compute display HTML from saved blocks or latest SSE JSON content
  const displayHtml = useMemo(() => {
    if (sections[currentSection]?.length) {
      return blocksToHtml(sections[currentSection]);
    }
    const raw = editingContent || reviseSse.content || sse.content;
    if (raw && !reviseSse.streaming && !sse.streaming) {
      try {
        const trimmed = raw.trim();
        const parsed = JSON.parse(trimmed);
        const blocks: ReportBlock[] = Array.isArray(parsed) ? parsed : (parsed.blocks || []);
        if (blocks.length) return blocksToHtml(blocks);
      } catch { /* still streaming or malformed */ }
    }
    return '';
  }, [currentSection, sections, editingContent, reviseSse.content, sse.content, sse.streaming, reviseSse.streaming]);

  // ---- Auto-save & restore ----
  const autoSave = useAutoSave({ key: `prelab_${cId}_${eId}` });
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [savedTimestamp, setSavedTimestamp] = useState<number | null>(null);

  // Check for saved progress on mount
  useEffect(() => {
    const saved = autoSave.restore();
    if (saved?.data && Object.keys(saved.data.sections || {}).length > 0) {
      setSavedTimestamp(saved.timestamp);
      setRestoreModalOpen(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save state
  useEffect(() => {
    autoSave.save({ sections, currentStep } as unknown as Record<string, unknown>);
  }, [sections, currentStep, autoSave]);

  // Unsaved warning
  const hasUnsaved = Object.keys(sections).length > 0 && !complete;
  const blocker = useUnsavedWarning(hasUnsaved);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      Modal.confirm({
        title: '未保存的内容',
        content: '您有已生成但未组装报告的章节内容，离开后可能丢失。确定要离开吗？',
        okText: '离开',
        cancelText: '留下继续',
        onOk: () => blocker.proceed?.(),
        onCancel: () => blocker.reset?.(),
      });
    }
  }, [blocker]);

  const handleRestore = () => {
    const saved = autoSave.restore();
    if (saved?.data) {
      setSections((saved.data.sections as Record<string, ReportBlock[]>) || {});
      setCurrentStep((saved.data.currentStep as number) || 0);
      message.success('已恢复上次进度');
    }
    setRestoreModalOpen(false);
  };

  const handleDiscardSaved = () => {
    autoSave.clear();
    setRestoreModalOpen(false);
  };

  // ---- Handlers ----
  const handleGenerate = useCallback(() => {
    sse.reset();
    reviseSse.reset();
    setEditingContent('');
    setIsEditing(false);
    setReviewResult(null);
    sse.startStream('/reports/prelab/generate', {
      course_id: cId, experiment_id: eId,
      section: currentSection, student_info: studentInfo,
    });
  }, [cId, eId, currentSection, studentInfo, sse, reviseSse]);

  const handleRevise = useCallback(() => {
    if (!feedback.trim()) { message.warning('请输入修改意见'); return; }
    const content = editingContent || sse.content;
    if (!content) { message.warning('请先生成内容'); return; }
    reviseSse.startStream('/reports/prelab/revise', {
      course_id: cId, experiment_id: eId,
      section: currentSection, content, feedback: feedback.trim(),
    });
    setFeedback('');
  }, [cId, eId, currentSection, editingContent, sse.content, feedback, reviseSse]);

  const handleAccept = useCallback(() => {
    const raw = editingContent || reviseSse.content || sse.content;
    if (!raw) { message.warning('请先生成或修改内容'); return; }
    // Parse JSON → blocks
    let blocks: ReportBlock[];
    try {
      const trimmed = raw.trim();
      const parsed = JSON.parse(trimmed);
      blocks = Array.isArray(parsed) ? parsed : (parsed.blocks || []);
    } catch {
      const match = raw.match(/\[.*\]/s);
      if (match) {
        try { blocks = JSON.parse(match[0]); } catch { blocks = []; }
      } else {
        blocks = [];
      }
    }
    if (!blocks.length) { message.warning('未能解析生成内容'); return; }

    setSections((prev) => ({ ...prev, [currentSection]: blocks }));

    if (currentStep < PRELAB_SECTIONS.length - 1) {
      setCurrentStep((s) => s + 1);
      sse.reset(); reviseSse.reset();
      setEditingContent(''); setIsEditing(false);
      setReviewResult(null);
    } else {
      handleAssemble(blocks);
    }
  }, [currentStep, editingContent, sse.content, reviseSse.content, currentSection]);

  const handleAssemble = useCallback(async (lastBlocks?: ReportBlock[]) => {
    const allSections = {
      ...sections,
      ...(lastBlocks ? { [currentSection]: lastBlocks } : {}),
    };

    setIsReviewing(true);
    message.loading({ content: '正在审查并组装报告...', key: 'assemble', duration: 0 });

    try {
      const result = await apiAssemble({
        course_id: cId, experiment_id: eId,
        sections: allSections as any, student_info: studentInfo,
      });
      message.destroy('assemble');
      sessionStorage.setItem('lastReportHtml', result.html);
      sessionStorage.setItem('lastReportId', result.report_id);
      sessionStorage.setItem('lastReportPath', result.html_path);
      setReviewResult({ passed: true, feedback: '报告已成功生成', round: 1 });
      autoSave.clear();
      setComplete(true);
    } catch (err) {
      message.destroy('assemble');
      setIsReviewing(false);
      setReviewResult({
        passed: false,
        feedback: `组装失败：${(err as Error).message || '未知错误'}`,
        round: 1,
      });
    }
  }, [cId, eId, sections, currentSection, studentInfo]);

  // ---- Completion screen ----
  if (complete) {
    const reportId = sessionStorage.getItem('lastReportId') || '';
    return (
      <Result
        status="success"
        title="预习报告生成完成"
        subTitle="报告已保存，可以预览或下载"
        icon={
          <div style={{
            width: 80, height: 80, borderRadius: 20,
            background: 'linear-gradient(135deg, #eef5ef 0%, #dce9df 100%)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <CheckCircleOutlined style={{ color: '#3d7a4f', fontSize: 40 }} />
          </div>
        }
        extra={[
          <Button key="preview" type="primary" size="large" onClick={() => navigate(`/preview/${reportId}`)}
            style={{ borderRadius: 10, fontWeight: 600 }}>
            预览报告
          </Button>,
          <Button key="home" size="large" onClick={() => navigate('/')}
            style={{ borderRadius: 10 }}>
            返回首页
          </Button>,
        ]}
      />
    );
  }

  const currentContent = editingContent || reviseSse.content || sse.content;
  const isLastStep = currentStep >= PRELAB_SECTIONS.length - 1;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* ---- Restore modal ---- */}
      <Modal
        title="恢复上次进度？"
        open={restoreModalOpen}
        onOk={handleRestore}
        onCancel={handleDiscardSaved}
        okText="恢复进度"
        cancelText="放弃"
      >
        <Typography.Text type="secondary">
          检测到上次未完成的进度
          {savedTimestamp && `（${new Date(savedTimestamp).toLocaleString('zh-CN')}）`}。
          是否恢复已生成的章节内容？
        </Typography.Text>
      </Modal>

      {/* ---- Top bar: back + stepper ---- */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 32 }}>
        <Col>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/setup/${encodeURIComponent(cId)}/${encodeURIComponent(eId)}`)}
            style={{ color: '#6b5e4a', paddingLeft: 0, fontWeight: 500 }}
          >
            返回
          </Button>
        </Col>
        <Col flex="auto" style={{ maxWidth: 500, padding: '0 24px' }}>
          <ProgressStepper current={currentStep} steps={PRELAB_STEPS} />
        </Col>
        <Col style={{ width: 80 }} />
      </Row>

      {/* ---- Completed sections summary ---- */}
      {Object.keys(sections).length > 0 && (
        <div style={{ marginBottom: 20, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {PRELAB_SECTIONS.map((s) => (
            <Tag
              key={s}
              color={sections[s] ? 'success' : 'default'}
              icon={sections[s] ? <CheckCircleOutlined /> : undefined}
              style={{ borderRadius: 8, padding: '2px 10px', fontSize: 12 }}
            >
              {SECTION_LABELS[s]}
            </Tag>
          ))}
        </div>
      )}

      {/* ---- Main content card ---- */}
      <Card
        style={{ borderRadius: 14, border: '1px solid #e8e0d0' }}
        styles={{ body: { padding: '32px 36px' } }}
      >
        {/* Section header */}
        <div style={{ marginBottom: 24, textAlign: 'center' }}>
          <Tag
            color="green"
            style={{
              borderRadius: 12,
              padding: '4px 16px',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 12,
            }}
            icon={SECTION_ICONS[currentSection]}
          >
            {SECTION_LABELS[currentSection]}
          </Tag>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 13 }}>
            第 {currentStep + 1} / {PRELAB_SECTIONS.length} 部分
          </Typography.Text>
        </div>

        {/* ---- Initial: Generate button ---- */}
        {!sse.content && !sse.streaming && !reviseSse.content && (
          <div style={{ textAlign: 'center', padding: '40px 0 20px' }}>
            <div style={{
              width: 64, height: 64, borderRadius: 16,
              background: 'linear-gradient(135deg, #eef5ef 0%, #dce9df 100%)',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 20,
            }}>
              <RobotOutlined style={{ color: '#3d7a4f', fontSize: 28 }} />
            </div>
            <Button
              type="primary"
              size="large"
              onClick={handleGenerate}
              style={{
                height: 48,
                fontSize: 15,
                paddingInline: 36,
                borderRadius: 12,
                fontWeight: 600,
              }}
            >
              🤖 AI 生成「{SECTION_LABELS[currentSection]}」
            </Button>
            <Typography.Text
              style={{ color: '#8b7a60', fontSize: 13, display: 'block', marginTop: 16 }}
            >
              将根据实验讲义和格式规范自动生成内容，并经过 AI 自动审查
            </Typography.Text>
          </div>
        )}

        {/* ---- Content preview ---- */}
        {(sse.content || sse.streaming || reviseSse.content) && (
          <div style={{
            borderRadius: 12,
            overflow: 'hidden',
            border: '1px solid #e8e0d0',
            boxShadow: '0 1px 4px rgba(44,36,22,0.04)',
          }}>
            <MathPreview
              html={displayHtml}
              loading={sse.streaming || reviseSse.streaming}
              status={sse.status || reviseSse.status}
              height="400px"
            />
          </div>
        )}

        {/* ---- Error ---- */}
        {sse.error && (
          <Alert
            message="生成失败"
            description={sse.error}
            type="error"
            showIcon
            style={{ marginTop: 16, borderRadius: 10 }}
            action={<Button onClick={handleGenerate}>重试</Button>}
          />
        )}

        {/* ---- Toolbar: edit / re-generate ---- */}
        {currentContent && !sse.streaming && !reviseSse.streaming && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: 20,
              paddingTop: 16,
              borderTop: '1px solid #f0ebe0',
            }}
          >
            {!isEditing ? (
              <Space>
                <Button
                  icon={<EditOutlined />}
                  onClick={() => { setEditingContent(currentContent); setIsEditing(true); }}
                  style={{ borderRadius: 8 }}
                >
                  编辑内容
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={() => {
                    sse.reset(); reviseSse.reset();
                    setEditingContent(''); setIsEditing(false);
                  }}
                  style={{ borderRadius: 8 }}
                >
                  重新生成
                </Button>
              </Space>
            ) : (
              <Space>
                <Button onClick={() => setEditingContent(currentContent)} style={{ borderRadius: 8 }}>
                  重置为生成内容
                </Button>
                <Button type="primary" ghost onClick={() => setIsEditing(false)} style={{ borderRadius: 8 }}>
                  完成编辑
                </Button>
              </Space>
            )}
          </div>
        )}
      </Card>

      {/* ---- Feedback + Actions card ---- */}
      {currentContent && !sse.streaming && !reviseSse.streaming && (
        <Card
          style={{ marginTop: 20, borderRadius: 14, border: '1px solid #e8e0d0' }}
          styles={{ body: { padding: '22px 32px' } }}
        >
          {isEditing ? (
            <div>
              <Typography.Text strong style={{ display: 'block', marginBottom: 12, fontSize: 14 }}>
                ✏️ 编辑「{SECTION_LABELS[currentSection]}」
              </Typography.Text>
              <Input.TextArea
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                rows={10}
                style={{ fontFamily: 'monospace', fontSize: 13, borderRadius: 10 }}
              />
              <div style={{ marginTop: 16, textAlign: 'right' }}>
                <Button
                  type="primary"
                  icon={<ArrowRightOutlined />}
                  onClick={handleAccept}
                  size="large"
                  style={{ borderRadius: 10, fontWeight: 600 }}
                >
                  {isLastStep ? '组装报告' : '下一步'}
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* Feedback input */}
              <div style={{ marginBottom: 12, fontWeight: 600, fontSize: 14 }}>
                💬 给 AI 提修改意见
              </div>
              <Input.TextArea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="例如：原理部分太简略，请补充公式推导过程..."
                rows={3}
                style={{ borderRadius: 10 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
                <Space>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={handleRevise}
                    loading={reviseSse.streaming}
                    disabled={!feedback.trim()}
                    style={{ borderRadius: 8 }}
                  >
                    提交反馈让 AI 修改
                  </Button>
                </Space>
                <Space>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={handleGenerate}
                    style={{ borderRadius: 8 }}
                  >
                    重新生成
                  </Button>
                  <Button
                    size="large"
                    icon={<ArrowRightOutlined />}
                    onClick={handleAccept}
                    type="primary"
                    ghost
                    style={{ borderRadius: 10, fontWeight: 600 }}
                  >
                    {isLastStep ? '完成，组装报告' : '满意了，下一步'}
                  </Button>
                </Space>
              </div>
              {reviseSse.error && (
                <Alert message={reviseSse.error} type="error" showIcon style={{ marginTop: 12, borderRadius: 8 }} />
              )}
            </>
          )}
        </Card>
      )}

      {/* ---- Review panel ---- */}
      {isReviewing && (
        <div style={{ marginTop: 20 }}>
          <ReviewPanel
            review={reviewResult}
            reviewing={isReviewing && !reviewResult}
            onRetry={() => {
              setIsReviewing(false);
              setReviewResult(null);
              setCurrentStep(PRELAB_SECTIONS.length - 1);
            }}
            onAccept={() => setComplete(true)}
          />
        </div>
      )}
    </div>
  );
}
