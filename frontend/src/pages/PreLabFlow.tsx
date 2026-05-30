import { useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Space, Input, message, Result, Typography } from 'antd';
import { ArrowLeftOutlined, ArrowRightOutlined, CheckOutlined, SendOutlined, ReloadOutlined } from '@ant-design/icons';
import { SECTION_LABELS, type PreLabSection } from '../types';
import { assemblePrelab as apiAssemble } from '../api/client';
import { useSSE } from '../hooks/useSSE';
import ProgressStepper from '../components/ProgressStepper';
import MathPreview from '../components/MathPreview';

const PRELAB_SECTIONS: PreLabSection[] = ['purpose', 'principle', 'equipment', 'procedure'];
const PRELAB_STEPS = PRELAB_SECTIONS.map((s) => ({ title: SECTION_LABELS[s] }));

export default function PreLabFlow() {
  const { courseId, experimentId } = useParams<{ courseId: string; experimentId: string }>();
  const navigate = useNavigate();
  const cId = courseId || sessionStorage.getItem('courseId') || '';
  const eId = experimentId || sessionStorage.getItem('experimentId') || '';

  const [currentStep, setCurrentStep] = useState(0);
  const [sections, setSections] = useState<Record<string, string>>({});
  const [editingContent, setEditingContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [complete, setComplete] = useState(false);

  const sse = useSSE();
  const reviseSse = useSSE();

  const studentInfo = JSON.parse(sessionStorage.getItem('studentInfo') || '{}');
  const currentSection = PRELAB_SECTIONS[currentStep];

  const handleGenerate = useCallback(() => {
    sse.startStream('/reports/prelab/generate', {
      course_id: cId, experiment_id: eId,
      section: currentSection, student_info: studentInfo,
    });
  }, [cId, eId, currentSection, studentInfo, sse]);

  const handleRevise = useCallback(() => {
    if (!feedback.trim()) return;
    const content = editingContent || sse.content;
    reviseSse.startStream('/reports/prelab/revise', {
      course_id: cId, experiment_id: eId,
      section: currentSection, content, feedback: feedback.trim(),
    });
    setFeedback('');
  }, [cId, eId, currentSection, editingContent, sse.content, feedback, reviseSse]);

  const handleAccept = useCallback(() => {
    const content = editingContent || reviseSse.content || sse.content;
    setSections((prev) => ({ ...prev, [currentSection]: content }));

    if (currentStep < PRELAB_SECTIONS.length - 1) {
      setCurrentStep((s) => s + 1);
      sse.reset(); reviseSse.reset();
      setEditingContent(''); setIsEditing(false);
    } else {
      handleAssemble(content);
    }
  }, [currentStep, editingContent, sse.content, reviseSse.content]);

  const handleAssemble = useCallback(async (lastContent?: string) => {
    const allSections = { ...sections, [currentSection]: lastContent || editingContent || reviseSse.content || sse.content };
    message.loading({ content: '组装报告中...', key: 'assemble' });
    const result = await apiAssemble({ course_id: cId, experiment_id: eId, sections: allSections, student_info: studentInfo });
    message.destroy('assemble');
    sessionStorage.setItem('lastReportHtml', result.html);
    sessionStorage.setItem('lastReportId', result.report_id);
    sessionStorage.setItem('lastReportPath', result.html_path);
    setComplete(true);
  }, [cId, eId, sections, currentSection, editingContent, sse.content, reviseSse.content, studentInfo]);

  if (complete) {
    const reportId = sessionStorage.getItem('lastReportId') || '';
    return (
      <Result
        status="success"
        title="预习报告生成完成"
        subTitle="报告已保存，可以预览或下载"
        extra={[
          <Button key="preview" type="primary" size="large" onClick={() => navigate(`/preview/${reportId}`)}>预览报告</Button>,
          <Button key="home" size="large" onClick={() => navigate('/')}>返回首页</Button>,
        ]}
      />
    );
  }

  const currentContent = editingContent || reviseSse.content || sse.content;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      {/* Top bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/setup/${encodeURIComponent(cId)}/${encodeURIComponent(eId)}`)}
          style={{ color: '#6b5e4a', paddingLeft: 0 }}>
          返回
        </Button>
        <ProgressStepper current={currentStep} steps={PRELAB_STEPS} />
        <div style={{ width: 80 }} />
      </div>

      <Card bodyStyle={{ padding: '28px 32px' }}>
        {/* Generate button (initial state) */}
        {!sse.content && !sse.streaming && (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Button type="primary" size="large" onClick={handleGenerate} style={{ height: 48, fontSize: 15, paddingInline: 32 }}>
              🤖 AI 生成「{SECTION_LABELS[currentSection]}」
            </Button>
            <div style={{ marginTop: 14 }}>
              <Text style={{ color: '#8b7a60', fontSize: 13 }}>将根据实验讲义和格式规范自动生成内容</Text>
            </div>
          </div>
        )}

        {/* Content preview */}
        {(sse.content || sse.streaming) && (
          <MathPreview html={currentContent} loading={sse.streaming || reviseSse.streaming}
            status={sse.status || reviseSse.status} height="360px" />
        )}

        {sse.error && (
          <div style={{ color: '#b54b4b', marginTop: 16, textAlign: 'center' }}>
            {sse.error}
            <Button onClick={handleGenerate} style={{ marginLeft: 8 }}>重试</Button>
          </div>
        )}

        {/* Toolbar */}
        {currentContent && !sse.streaming && !reviseSse.streaming && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <Space>
              {!isEditing ? (
                <>
                  <Button onClick={() => { setEditingContent(currentContent); setIsEditing(true); }}>编辑内容</Button>
                  <Button icon={<ReloadOutlined />} onClick={() => { sse.reset(); reviseSse.reset(); setEditingContent(''); setIsEditing(false); }}>
                    重新生成
                  </Button>
                </>
              ) : (
                <>
                  <Button onClick={() => setEditingContent(currentContent)}>重置为生成内容</Button>
                  <Button type="primary" ghost onClick={() => setIsEditing(false)}>完成编辑</Button>
                </>
              )}
            </Space>
          </div>
        )}
      </Card>

      {/* Feedback + Actions */}
      {currentContent && !sse.streaming && !reviseSse.streaming && (
        <Card bodyStyle={{ padding: '20px 32px' }} style={{ marginTop: 20 }}>
          <div style={{ marginBottom: 14, fontWeight: 600, fontSize: 14 }}>💬 给 AI 提修改意见</div>
          <Input.TextArea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="例如：原理部分太简略，请补充公式推导过程..."
            rows={3}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16 }}>
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleRevise}
              loading={reviseSse.streaming}
              disabled={!feedback.trim()}
            >
              提交反馈让 AI 修改
            </Button>
            <Button
              size="large"
              icon={<ArrowRightOutlined />}
              onClick={handleAccept}
            >
              {currentStep < PRELAB_SECTIONS.length - 1 ? '下一步' : '组装报告'}
            </Button>
          </div>
          {reviseSse.error && <div style={{ color: '#b54b4b', marginTop: 12 }}>{reviseSse.error}</div>}
        </Card>
      )}
    </div>
  );
}

const { Text } = Typography;
