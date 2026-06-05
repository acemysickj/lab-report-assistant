import { useState, useEffect, useCallback, useRef, Component, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Button, Space, Input, message, Result, Table, InputNumber,
  Typography, Divider, Spin, Collapse, Descriptions, Empty, Tag, Alert, Row, Col, Modal,
} from 'antd';
import {
  ArrowLeftOutlined, CalculatorOutlined, PictureOutlined,
  FileTextOutlined, CheckOutlined, SendOutlined, ReloadOutlined,
  ExperimentOutlined, EyeOutlined, DatabaseOutlined,
  LineChartOutlined, FormOutlined, CheckCircleOutlined,
  RobotOutlined,
} from '@ant-design/icons';
import {
  getDataTables, analyzeData, generateFigures as apiGenerateFigures,
  assemblePostlab as apiAssemblePostlab,
} from '../api/client';
import ProgressStepper from '../components/ProgressStepper';
import MathPreview from '../components/MathPreview';
import FigurePreview from '../components/FigurePreview';
import ReviewPanel from '../components/ReviewPanel';
import { useSSE } from '../hooks/useSSE';
import { useAutoSave } from '../hooks/useAutoSave';
import { useUnsavedWarning } from '../hooks/useUnsavedWarning';
import type { DataTableSchema, ReviewResult } from '../types';

const POSTLAB_STEPS = [
  { title: '数据录入', description: '填写实验数据', icon: <DatabaseOutlined /> },
  { title: '数据分析', description: '自动计算', icon: <CalculatorOutlined /> },
  { title: '图形生成', description: '绘制图表', icon: <PictureOutlined /> },
  { title: '内容生成', description: 'AI 生成讨论', icon: <FormOutlined /> },
  { title: '审查导出', description: '检查并下载', icon: <CheckCircleOutlined /> },
];

const POSTLAB_SECTIONS = [
  { key: 'records', label: '实验记录' },
  { key: 'discussion', label: '结果讨论' },
  { key: 'questions', label: '思考题' },
] as const;

// ============================================================
// DataEntryStep
// ============================================================
function DataEntryStep({
  experimentId, onComplete,
}: {
  experimentId: string;
  onComplete: (data: Record<string, unknown>, temp: number, pres: number) => void;
}) {
  const [tables, setTables] = useState<DataTableSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [temperature, setTemperature] = useState<number | undefined>();
  const [pressure, setPressure] = useState<number | undefined>();
  const [cellData, setCellData] = useState<Record<string, number>>({});

  useEffect(() => {
    getDataTables(experimentId)
      .then((res) => { setTables(res.tables as DataTableSchema[]); setLoading(false); })
      .catch((err) => { setError(err.message || '加载数据表格失败'); setLoading(false); });
  }, [experimentId]);

  const handleCellChange = (tIdx: number, row: string, col: string, val: number | null) => {
    const key = `t${tIdx}_${row}_${col}`;
    if (val !== null && val !== undefined) {
      setCellData((prev) => ({ ...prev, [key]: val }));
    }
  };

  const handleSubmit = () => {
    if (Object.keys(cellData).length === 0) { message.warning('请至少填写一项数据'); return; }
    onComplete(cellData, temperature || 25, pressure || 101);
  };

  if (loading) return <Spin tip="加载数据表格..." />;
  if (error) return <Alert message={error} type="error" showIcon style={{ borderRadius: 10 }} />;
  if (tables.length === 0) return <Empty description="该实验暂无数据表格定义，请检查讲义文件" />;

  const hasEnvParams = tables.some((t) => (t as unknown as { temperature?: boolean }).temperature);

  return (
    <div>
      {hasEnvParams && (
        <Card
          size="small"
          style={{ marginBottom: 20, borderRadius: 10, background: '#faf8f0', border: '1px solid #e8e0d0' }}
        >
          <Space size="large" wrap>
            <span style={{ fontWeight: 500, fontSize: 13 }}>
              🌡️ 实验温度：
              <InputNumber
                value={temperature} onChange={(v) => setTemperature(v ?? undefined)}
                placeholder="25" suffix="℃" style={{ width: 120 }}
              />
            </span>
            <span style={{ fontWeight: 500, fontSize: 13 }}>
              📊 大气压：
              <InputNumber
                value={pressure} onChange={(v) => setPressure(v ?? undefined)}
                placeholder="101" suffix="kPa" style={{ width: 120 }}
              />
            </span>
          </Space>
        </Card>
      )}

      <Collapse
        accordion
        defaultActiveKey={['0']}
        style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e8e0d0' }}
      >
        {tables.map((table, tIdx) => (
          <Collapse.Panel
            header={
              <span style={{ fontWeight: 600, fontSize: 14 }}>
                {table.title}
                {table.description && (
                  <Typography.Text type="secondary" style={{ marginLeft: 12, fontSize: 12, fontWeight: 400 }}>
                    — {table.description}
                  </Typography.Text>
                )}
              </span>
            }
            key={String(tIdx)}
          >
            <Table
              dataSource={table.rows.map((row: string, rIdx: number) => {
                const record: Record<string, unknown> = { _key: row, _idx: rIdx };
                table.columns.forEach((col: string, cIdx: number) => {
                  if (cIdx === 0) {
                    record[col] = row;
                  } else {
                    const key = `t${tIdx}_${row}_${col}`;
                    record[col] = (
                      <InputNumber
                        size="small"
                        style={{ width: '100%' }}
                        value={cellData[key]}
                        onChange={(v) => handleCellChange(tIdx, row, col, v)}
                        placeholder="-"
                      />
                    );
                  }
                });
                return record;
              })}
              columns={table.columns.map((col: string, cIdx: number) => ({
                title: col,
                dataIndex: col,
                key: col,
                width: cIdx === 0 ? 140 : 100,
                render: cIdx === 0
                  ? (text: string) => <strong style={{ fontSize: 13 }}>{text}</strong>
                  : undefined,
              }))}
              pagination={false}
              bordered
              size="small"
              scroll={{ x: 'max-content' }}
            />
          </Collapse.Panel>
        ))}
      </Collapse>

      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <Button
          type="primary"
          size="large"
          icon={<CalculatorOutlined />}
          onClick={handleSubmit}
          style={{ borderRadius: 12, height: 48, fontWeight: 600, paddingInline: 32, fontSize: 15 }}
        >
          提交数据并开始分析
        </Button>
        <div style={{ marginTop: 10 }}>
          <Tag color="processing" style={{ borderRadius: 8 }}>
            已填写 {Object.keys(cellData).length} 个数据点
          </Tag>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// AnalysisStep
// ============================================================
function AnalysisStep({
  experimentId, data, temperature, pressure, onComplete,
}: {
  experimentId: string; data: Record<string, unknown>;
  temperature?: number; pressure?: number;
  onComplete: (results: Record<string, unknown>, logs: string) => void;
}) {
  const [analysing, setAnalysing] = useState(true);
  const [results, setResults] = useState<Record<string, unknown>>({});
  const [logs, setLogs] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    analyzeData({ experiment_id: experimentId, data, temperature, pressure })
      .then((res) => { setResults(res.results); setLogs(res.logs); setAnalysing(false); })
      .catch((err) => { setError(err.message || '数据分析失败'); setAnalysing(false); });
  }, [experimentId, data, temperature, pressure]);

  if (analysing) {
    return (
      <div style={{ textAlign: 'center', padding: 48 }}>
        <Spin size="large" />
        <Typography.Text type="secondary" style={{ display: 'block', marginTop: 16, fontSize: 14 }}>
          后台计算中，请稍候...
        </Typography.Text>
      </div>
    );
  }

  if (error) {
    return (
      <Alert
        message="数据分析失败"
        description={error}
        type="error"
        showIcon
        style={{ borderRadius: 10 }}
        action={<Button onClick={() => window.location.reload()}>重试</Button>}
      />
    );
  }

  return (
    <div>
      <Card
        title={
          <span style={{ fontWeight: 600, fontSize: 14 }}>
            <LineChartOutlined style={{ marginRight: 8, color: '#3d7a4f' }} />
            分析结果
          </span>
        }
        style={{ borderRadius: 12, border: '1px solid #e8e0d0' }}
      >
        <Descriptions column={2} size="small" bordered>
          {Object.entries(results).slice(0, 20).map(([k, v]) => (
            <Descriptions.Item key={k} label={<strong>{k}</strong>}>
              <code>{typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(6)) : String(v)}</code>
            </Descriptions.Item>
          ))}
        </Descriptions>

        {logs && (
          <pre style={{
            background: '#faf8f0', padding: 14, borderRadius: 8,
            whiteSpace: 'pre-wrap', marginTop: 16, fontSize: 12,
            maxHeight: 200, overflow: 'auto', border: '1px solid #e8e0d0',
            lineHeight: 1.5,
          }}>
            {logs}
          </pre>
        )}
      </Card>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Button
          type="primary"
          size="large"
          onClick={() => onComplete(results, logs)}
          style={{ borderRadius: 12, fontWeight: 600, paddingInline: 28 }}
        >
          确认结果，继续
        </Button>
      </div>
    </div>
  );
}

// ============================================================
// PostLabFlow Main
// ============================================================

class PostLabErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: unknown) {
    console.error('[PostLabFlow] crashed:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <Result
          status="error"
          title="页面加载失败"
          subTitle={this.state.error.message || '未知错误'}
          extra={
            <Button type="primary" onClick={() => { this.setState({ error: null }); window.location.reload(); }}>
              刷新重试
            </Button>
          }
        />
      );
    }
    return this.props.children;
  }
}

export default function PostLabFlow() {
  // Diagnostic: write to sessionStorage on mount to confirm component loads
  try { sessionStorage.setItem('_postlab_debug', `mounted_${Date.now()}`); } catch {}

  const { courseId, experimentId } = useParams<{ courseId: string; experimentId: string }>();
  const navigate = useNavigate();
  const cId = courseId || sessionStorage.getItem('courseId') || '';
  const eId = experimentId || sessionStorage.getItem('experimentId') || '';

  const [step, setStep] = useState(0);
  const [rawData, setRawData] = useState<Record<string, unknown>>({});
  const [temperature, setTemperature] = useState<number>();
  const [pressure, setPressure] = useState<number>();
  const [analysisRes, setAnalysisRes] = useState<Record<string, unknown>>({});
  const [figures, setFigures] = useState<string[]>([]);
  const [figureDir, setFigureDir] = useState('');
  const [figuresLoading, setFiguresLoading] = useState(false);
  const [figuresError, setFiguresError] = useState('');
  const [sectionContents, setSectionContents] = useState<Record<string, string>>({});
  const [activePostSection, setActivePostSection] = useState<string>('records');
  const [feedback, setFeedback] = useState('');
  const [reviewResult, setReviewResult] = useState<ReviewResult | null>(null);
  const [complete, setComplete] = useState(false);

  const sse = useSSE();
  const reviseSse = useSSE();
  const studentInfo = useRef(JSON.parse(sessionStorage.getItem('studentInfo') || '{}')).current;

  // ---- Auto-save & restore ----
  const autoSave = useAutoSave({ key: `postlab_${cId}_${eId}` });
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [savedTimestamp, setSavedTimestamp] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = autoSave.restore();
      if (saved?.data && typeof saved.data === 'object') {
        const cellData = (saved.data.cellData || {}) as Record<string, unknown>;
        const sectionContents = (saved.data.sectionContents || {}) as Record<string, unknown>;
        if (Object.keys(cellData).length > 0 || Object.keys(sectionContents).length > 0) {
          setSavedTimestamp(saved.timestamp);
          setRestoreModalOpen(true);
        }
      }
    } catch {
      // Corrupted localStorage data — silently clear and continue
      autoSave.clear();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-save on changes
  useEffect(() => {
    autoSave.save({
      step, rawData, temperature, pressure,
      analysisRes, sectionContents, activePostSection,
    } as unknown as Record<string, unknown>);
  }, [step, rawData, temperature, pressure, analysisRes, sectionContents, activePostSection, autoSave]);

  // Unsaved warning
  const hasUnsaved = (step > 0 || Object.keys(sectionContents).length > 0) && !complete;
  const blocker = useUnsavedWarning(hasUnsaved);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      Modal.confirm({
        title: '未保存的内容',
        content: '您有已填写或生成的内容尚未保存为报告，离开后可能丢失。确定要离开吗？',
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
      setStep((saved.data.step as number) || 0);
      setRawData((saved.data.rawData as Record<string, unknown>) || {});
      setTemperature(saved.data.temperature as number | undefined);
      setPressure(saved.data.pressure as number | undefined);
      setAnalysisRes((saved.data.analysisRes as Record<string, unknown>) || {});
      setSectionContents((saved.data.sectionContents as Record<string, string>) || {});
      setActivePostSection((saved.data.activePostSection as string) || 'records');
      message.success('已恢复上次进度');
    }
    setRestoreModalOpen(false);
  };

  const handleDiscardSaved = () => {
    autoSave.clear();
    setRestoreModalOpen(false);
  };

  // ---- Step handlers ----
  const handleDataComplete = useCallback((d: Record<string, unknown>, temp: number, pres: number) => {
    setRawData(d); setTemperature(temp); setPressure(pres); setStep(1);
  }, []);

  const handleAnalysisComplete = useCallback(async (results: Record<string, unknown>, _logs: string) => {
    setAnalysisRes(results); setStep(2);
    setFiguresLoading(true); setFiguresError('');
    try {
      const figRes = await apiGenerateFigures({ experiment_id: eId, analysis_results: results });
      setFigures(figRes.figures as string[]);
      setFigureDir(figRes.output_dir || '');
      message.success('图形生成完成');
    } catch (err) {
      setFiguresError((err as Error).message || '图形生成失败，可跳过');
      setFigures([]);
    } finally { setFiguresLoading(false); }
  }, [eId]);

  const handleGenerateSection = useCallback((section: string) => {
    setActivePostSection(section);
    sse.reset(); reviseSse.reset();
    sse.startStream('/reports/postlab/generate', {
      course_id: cId, experiment_id: eId, section,
      data: rawData, analysis_results: analysisRes, student_info: studentInfo,
    });
  }, [cId, eId, rawData, analysisRes, studentInfo, sse, reviseSse]);

  const handleRevisePostSection = useCallback(() => {
    if (!feedback.trim()) { message.warning('请输入修改意见'); return; }
    reviseSse.startStream('/reports/postlab/revise', {
      course_id: cId, experiment_id: eId,
      section: activePostSection, content: sse.content, feedback: feedback.trim(),
    });
    setFeedback('');
  }, [cId, eId, activePostSection, sse.content, feedback, reviseSse]);

  const handleSaveCurrentSection = useCallback(() => {
    const content = reviseSse.content || sse.content;
    if (!content) { message.warning('请先生成内容'); return; }
    setSectionContents((prev) => ({ ...prev, [activePostSection]: content }));
    message.success(`「${POSTLAB_SECTIONS.find(s => s.key === activePostSection)?.label}」已保存`);
    sse.reset(); reviseSse.reset();
    const next = { ...sectionContents, [activePostSection]: content };
    if (POSTLAB_SECTIONS.every((s) => next[s.key])) setStep(4);
  }, [activePostSection, sectionContents, sse, reviseSse]);

  const handleStartReview = useCallback(() => {
    const missing = POSTLAB_SECTIONS.filter((s) => !sectionContents[s.key]);
    if (missing.length > 0) {
      message.warning(`以下部分尚未生成：${missing.map(s => s.label).join('、')}`);
      return;
    }
    setStep(4);
  }, [sectionContents]);

  const handleFinalAssemble = useCallback(async () => {
    message.loading({ content: '组装完整报告中...', key: 'assemble' });
    try {
      const result = await apiAssemblePostlab({
        course_id: cId, experiment_id: eId, prelab_sections: {},
        records: sectionContents.records || '',
        data_analysis: sectionContents.records
          ? `<p>数据分析结果：</p><pre>${JSON.stringify(analysisRes, null, 2)}</pre>` : '',
        discussion: sectionContents.discussion || '',
        questions: sectionContents.questions || '',
        student_info: studentInfo,
      });
      message.destroy('assemble');
      sessionStorage.setItem('lastReportHtml', result.html);
      sessionStorage.setItem('lastReportId', result.report_id);
      sessionStorage.setItem('lastReportPath', result.html_path);
      autoSave.clear();
      setComplete(true);
    } catch (err) {
      message.destroy('assemble');
      message.error(`组装失败：${(err as Error).message}`);
    }
  }, [cId, eId, sectionContents, analysisRes, studentInfo, autoSave]);

  // ---- Completion screen ----
  if (complete) {
    const reportId = sessionStorage.getItem('lastReportId') || '';
    return (
      <Result
        status="success"
        title="完整报告生成完成！"
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
          <Button key="history" size="large" onClick={() => navigate('/history')} style={{ borderRadius: 10 }}>
            历史报告
          </Button>,
          <Button key="home" size="large" onClick={() => navigate('/')} style={{ borderRadius: 10 }}>
            返回首页
          </Button>,
        ]}
      />
    );
  }

  const completedSections = POSTLAB_SECTIONS.filter((s) => sectionContents[s.key]);

  // ---- Helper: Step card wrapper ----
  const StepCard = ({ stepNum, title, icon, children }: {
    stepNum: number; title: string; icon: React.ReactNode; children: React.ReactNode;
  }) => (
    <Card
      style={{ borderRadius: 14, border: '1px solid #e8e0d0' }}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 15 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg, #3d7a4f 0%, #5b9a6b 100%)',
            color: '#fff', fontSize: 14, fontWeight: 700,
          }}>
            {stepNum}
          </span>
          {icon}
          {title}
        </span>
      }
    >
      {children}
    </Card>
  );

  // Diagnostic: log mount
  console.log('[PostLabFlow] mounted, step:', step, 'cId:', cId, 'eId:', eId);

  return (
    <PostLabErrorBoundary>
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      {/* ---- Diagnostic marker ---- */}
      <div style={{ background: step === 0 ? '#e6f7ff' : '#f6ffed', padding: '4px 12px', borderRadius: 6, marginBottom: 8, fontSize: 11, color: '#666', fontFamily: 'monospace' }}>
        DEBUG: PostLabFlow step={step} cId={cId} eId={eId}
      </div>
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
          是否恢复已填写的数据和已生成的内容？
        </Typography.Text>
      </Modal>

      {/* ---- Back button ---- */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate(`/setup/${encodeURIComponent(cId)}/${encodeURIComponent(eId)}`)}
        style={{ color: '#6b5e4a', paddingLeft: 0, fontWeight: 500, marginBottom: 24 }}
      >
        返回
      </Button>

      {/* ---- Progress stepper ---- */}
      <ProgressStepper current={step} steps={POSTLAB_STEPS} />

      {/* ================================================================ */}
      {/* Step 0: Data Entry                                                */}
      {/* ================================================================ */}
      {step === 0 && (
        <StepCard stepNum={1} title="填写实验数据" icon={<DatabaseOutlined />}>
          <DataEntryStep experimentId={eId} onComplete={handleDataComplete} />
        </StepCard>
      )}

      {/* ================================================================ */}
      {/* Step 1: Analysis                                                  */}
      {/* ================================================================ */}
      {step === 1 && (
        <StepCard stepNum={2} title="数据分析" icon={<CalculatorOutlined />}>
          <AnalysisStep
            experimentId={eId} data={rawData}
            temperature={temperature} pressure={pressure}
            onComplete={handleAnalysisComplete}
          />
        </StepCard>
      )}

      {/* ================================================================ */}
      {/* Step 2: Figures                                                   */}
      {/* ================================================================ */}
      {step === 2 && (
        <StepCard stepNum={3} title="图形生成" icon={<PictureOutlined />}>
          {figuresLoading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <Spin size="large" />
              <Typography.Text type="secondary" style={{ display: 'block', marginTop: 16 }}>
                正在生成图形...
              </Typography.Text>
            </div>
          ) : figuresError ? (
            <Alert
              message="图形生成遇到问题" description={figuresError}
              type="warning" showIcon style={{ borderRadius: 10 }}
              action={<Button onClick={() => setStep(3)}>跳过，继续</Button>}
            />
          ) : figures.length > 0 ? (
            <>
              <FigurePreview figures={figures} outputDir={figureDir} />
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <Button type="primary" size="large" onClick={() => setStep(3)}
                  style={{ borderRadius: 12, fontWeight: 600, paddingInline: 28 }}>
                  确认图形，继续生成内容
                </Button>
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 32 }}>
              <Empty description="未生成图形" />
              <Button type="primary" onClick={() => setStep(3)} style={{ marginTop: 16, borderRadius: 10 }}>
                跳过，继续
              </Button>
            </div>
          )}
        </StepCard>
      )}

      {/* ================================================================ */}
      {/* Step 3: Content Generation                                        */}
      {/* ================================================================ */}
      {step === 3 && (
        <div>
          <Card
            style={{ borderRadius: 14, border: '1px solid #e8e0d0', marginBottom: 0 }}
            title={
              <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 15 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  width: 30, height: 30, borderRadius: 8,
                  background: 'linear-gradient(135deg, #3d7a4f 0%, #5b9a6b 100%)',
                  color: '#fff', fontSize: 14, fontWeight: 700,
                }}>4</span>
                <FormOutlined />
                AI 生成报告内容
              </span>
            }
          >
            {/* Section selector buttons */}
            <div style={{ marginBottom: 20 }}>
              <Space size="small" wrap>
                {POSTLAB_SECTIONS.map((s) => (
                  <Button
                    key={s.key}
                    type={activePostSection === s.key ? 'primary' : 'default'}
                    icon={<FileTextOutlined />}
                    onClick={() => handleGenerateSection(s.key)}
                    style={{
                      borderRadius: 8,
                      fontWeight: activePostSection === s.key ? 600 : 400,
                    }}
                  >
                    {s.label}
                    {sectionContents[s.key] && (
                      <Tag color="success" style={{ marginLeft: 6, fontSize: 10, borderRadius: 6, lineHeight: '16px' }}>
                        ✓
                      </Tag>
                    )}
                  </Button>
                ))}
              </Space>
            </div>

            {/* Completed sections progress */}
            {completedSections.length > 0 && (
              <div style={{
                background: '#faf8f0', borderRadius: 10, padding: '10px 16px',
                border: '1px solid #e8e0d0', marginBottom: 18,
              }}>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  已完成：{completedSections.map(s => s.label).join(' · ')}
                </Typography.Text>
                <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
                  {POSTLAB_SECTIONS.map((s) => (
                    <div key={s.key} style={{
                      flex: 1, height: 4, borderRadius: 2,
                      background: sectionContents[s.key]
                        ? 'linear-gradient(90deg, #3d7a4f, #5b9a6b)'
                        : '#e8e0d0',
                      transition: 'all 0.3s',
                    }} />
                  ))}
                </div>
              </div>
            )}

            {/* Content preview */}
            {(sse.streaming || sse.content || reviseSse.content) && (
              <>
                <Divider style={{ margin: '16px 0' }} />
                <div style={{
                  borderRadius: 12, overflow: 'hidden',
                  border: '1px solid #e8e0d0',
                  boxShadow: '0 1px 4px rgba(44,36,22,0.04)',
                }}>
                  <MathPreview
                    html={reviseSse.content || sse.content}
                    loading={sse.streaming || reviseSse.streaming}
                    status={sse.status || reviseSse.status}
                    height="360px"
                  />
                </div>

                {sse.error && (
                  <Alert
                    message="生成失败" description={sse.error}
                    type="error" showIcon style={{ marginTop: 16, borderRadius: 10 }}
                    action={<Button onClick={() => handleGenerateSection(activePostSection)}>重试</Button>}
                  />
                )}

                {!sse.streaming && !reviseSse.streaming && (sse.content || reviseSse.content) && (
                  <div style={{ marginTop: 20, borderTop: '1px solid #f0ebe0', paddingTop: 18 }}>
                    <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>
                      💬 给 AI 提修改意见
                    </div>
                    <Input.TextArea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="例如：实验记录写得太简略，请按步骤详细描述操作和现象..."
                      rows={3}
                      style={{ borderRadius: 10 }}
                    />
                    <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between' }}>
                      <Space>
                        <Button
                          type="primary"
                          icon={<SendOutlined />}
                          onClick={handleRevisePostSection}
                          loading={reviseSse.streaming}
                          disabled={!feedback.trim()}
                          style={{ borderRadius: 8 }}
                        >
                          提交反馈让 AI 修改
                        </Button>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={() => handleGenerateSection(activePostSection)}
                          style={{ borderRadius: 8 }}
                        >
                          重新生成
                        </Button>
                      </Space>
                      <Button
                        type="primary"
                        ghost
                        icon={<CheckOutlined />}
                        onClick={handleSaveCurrentSection}
                        size="large"
                        style={{ borderRadius: 10, fontWeight: 600 }}
                      >
                        满意了，保存并继续
                      </Button>
                    </div>
                    {reviseSse.error && (
                      <Alert message={reviseSse.error} type="error" showIcon style={{ marginTop: 12, borderRadius: 8 }} />
                    )}
                  </div>
                )}
              </>
            )}

            {/* Initial prompt */}
            {!sse.content && !sse.streaming && !reviseSse.content && (
              <div style={{ textAlign: 'center', padding: '32px 0 12px' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: 'linear-gradient(135deg, #eef5ef 0%, #dce9df 100%)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 16,
                }}>
                  <RobotOutlined style={{ color: '#3d7a4f', fontSize: 24 }} />
                </div>
                <Typography.Text type="secondary">
                  点击上方的部分按钮，AI 将根据实验数据和讲义生成对应内容
                </Typography.Text>
              </div>
            )}

            {/* Skip to review if all done */}
            {completedSections.length === POSTLAB_SECTIONS.length && (
              <div style={{ marginTop: 20, textAlign: 'center', borderTop: '1px solid #f0ebe0', paddingTop: 20 }}>
                <Button type="primary" size="large" onClick={handleStartReview}
                  style={{ borderRadius: 12, fontWeight: 600, paddingInline: 32 }}>
                  全部完成，进入审查确认
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ================================================================ */}
      {/* Step 4: Review & Export                                          */}
      {/* ================================================================ */}
      {step === 4 && (
        <Card
          style={{ borderRadius: 14, border: '1px solid #e8e0d0' }}
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 15 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, borderRadius: 8,
                background: 'linear-gradient(135deg, #3d7a4f 0%, #5b9a6b 100%)',
                color: '#fff', fontSize: 14, fontWeight: 700,
              }}>5</span>
              <CheckCircleOutlined />
              审查确认 & 导出报告
            </span>
          }
        >
          {/* Section review cards */}
          <div style={{ marginBottom: 24 }}>
            <Typography.Text strong style={{ fontSize: 14, display: 'block', marginBottom: 14 }}>
              已生成的内容
            </Typography.Text>
            {POSTLAB_SECTIONS.map((s) => (
              <Card
                key={s.key}
                size="small"
                style={{
                  marginBottom: 10,
                  borderRadius: 10,
                  border: `1px solid ${sectionContents[s.key] ? '#dce9df' : '#f0ebe0'}`,
                  background: sectionContents[s.key] ? '#fafdf8' : '#fefdf8',
                }}
                title={
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {sectionContents[s.key]
                      ? <CheckCircleOutlined style={{ color: '#3d7a4f' }} />
                      : <span style={{ color: '#bfb5a4' }}>○</span>
                    }
                    <span style={{ fontWeight: 500 }}>{s.label}</span>
                  </span>
                }
                extra={
                  <Space size="small">
                    <Button
                      size="small"
                      icon={<EyeOutlined />}
                      onClick={() => {
                        setStep(3);
                        setActivePostSection(s.key);
                        sse.reset(); reviseSse.reset();
                        setTimeout(() => handleGenerateSection(s.key), 100);
                      }}
                      style={{ borderRadius: 6 }}
                    >
                      预览
                    </Button>
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={() => {
                        setStep(3);
                        setActivePostSection(s.key);
                        sse.reset(); reviseSse.reset();
                        setTimeout(() => handleGenerateSection(s.key), 100);
                      }}
                      style={{ borderRadius: 6 }}
                    >
                      重新生成
                    </Button>
                  </Space>
                }
              >
                {sectionContents[s.key] ? (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {sectionContents[s.key].replace(/<[^>]*>/g, '').slice(0, 200)}...
                  </Typography.Text>
                ) : (
                  <Tag color="warning" style={{ borderRadius: 6 }}>未生成</Tag>
                )}
              </Card>
            ))}
          </div>

          <Divider style={{ margin: '20px 0' }} />

          {/* Export section */}
          {!reviewResult && (
            <div style={{ textAlign: 'center', padding: '20px 0 8px' }}>
              <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
                所有内容已生成完毕。您可以直接导出，或返回上一步修改。
              </Typography.Text>
              <Space size="large">
                <Button size="large" onClick={() => setStep(3)} style={{ borderRadius: 10 }}>
                  返回修改
                </Button>
                <Button
                  type="primary"
                  size="large"
                  icon={<FileTextOutlined />}
                  onClick={handleFinalAssemble}
                  style={{ borderRadius: 12, fontWeight: 600, height: 48, paddingInline: 28 }}
                >
                  📄 生成完整报告
                </Button>
              </Space>
            </div>
          )}
        </Card>
      )}
    </div>
    </PostLabErrorBoundary>
  );
}
