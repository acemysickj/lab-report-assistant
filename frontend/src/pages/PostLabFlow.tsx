import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Button, Space, Input, message, Result, Table, InputNumber,
  Typography, Divider, Spin, Collapse, Descriptions, Empty, Tag, Alert, Row, Col,
} from 'antd';
import {
  ArrowLeftOutlined, CalculatorOutlined, PictureOutlined,
  FileTextOutlined, CheckOutlined, SendOutlined, ReloadOutlined,
  ExperimentOutlined, EyeOutlined, DatabaseOutlined,
  LineChartOutlined, FormOutlined, CheckCircleOutlined, RobotOutlined,
} from '@ant-design/icons';
import {
  getDataTables, analyzeData, generateFigures as apiGenerateFigures,
  assemblePostlab as apiAssemblePostlab,
} from '../api/client';
import ProgressStepper from '../components/ProgressStepper';
import MathPreview from '../components/MathPreview';
import FigurePreview from '../components/FigurePreview';
import { useSSE } from '../hooks/useSSE';
import type { DataTableSchema } from '../types';
import { blocksToHtml, type ReportBlock } from '../utils/blocksToHtml';
import { usePostlabStore, POSTLAB_SECTIONS } from '../stores/postlabStore';

const POSTLAB_STEPS = [
  { title: '数据录入', description: '填写实验数据', icon: <DatabaseOutlined /> },
  { title: '数据分析', description: '自动计算', icon: <CalculatorOutlined /> },
  { title: '图形生成', description: '绘制图表', icon: <PictureOutlined /> },
  { title: '内容生成', description: 'AI 生成讨论', icon: <FormOutlined /> },
  { title: '审查导出', description: '检查并下载', icon: <CheckCircleOutlined /> },
];

// ============================================================
// DataEntryStep — 保留原有逻辑，用 store.setRawData 完成
// ============================================================
function DataEntryStep({ experimentId }: { experimentId: string }) {
  const store = usePostlabStore();
  const [tables, setTables] = useState<DataTableSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [temperature, setTemperature] = useState<number | undefined>(store.temperature);
  const [pressure, setPressure] = useState<number | undefined>(store.pressure);
  const [cellData, setCellData] = useState<Record<string, number>>({});

  useEffect(() => {
    getDataTables(experimentId)
      .then((res) => { setTables(res.tables as DataTableSchema[]); setLoading(false); })
      .catch((err) => { setError(err.message || '加载数据表格失败'); setLoading(false); });
  }, [experimentId]);

  const handleCellChange = (tIdx: number, row: string, col: string, val: number | null) => {
    if (val !== null && val !== undefined) setCellData((prev) => ({ ...prev, [`t${tIdx}_${row}_${col}`]: val }));
  };

  const handleSubmit = () => {
    if (Object.keys(cellData).length === 0) { message.warning('请至少填写一项数据'); return; }
    store.setRawData(cellData, temperature || 25, pressure || 101);
  };

  if (loading) return <Spin tip="加载数据表格..." />;
  if (error) return <Alert message={error} type="error" showIcon style={{ borderRadius: 10 }} />;
  if (tables.length === 0) return <Empty description="该实验暂无数据表格定义，请检查讲义文件" />;

  const hasEnvParams = tables.some((t) => (t as unknown as { temperature?: boolean }).temperature);

  return (
    <div>
      {hasEnvParams && (
        <Card size="small" style={{ marginBottom: 20, borderRadius: 10, background: '#faf8f0', border: '1px solid #e8e0d0' }}>
          <Space size="large" wrap>
            <span style={{ fontWeight: 500, fontSize: 13 }}>🌡️ 实验温度：<InputNumber value={temperature} onChange={(v) => setTemperature(v ?? undefined)} placeholder="25" suffix="℃" style={{ width: 120 }} /></span>
            <span style={{ fontWeight: 500, fontSize: 13 }}>📊 大气压：<InputNumber value={pressure} onChange={(v) => setPressure(v ?? undefined)} placeholder="101" suffix="kPa" style={{ width: 120 }} /></span>
          </Space>
        </Card>
      )}
      <Collapse accordion defaultActiveKey={['0']} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #e8e0d0' }}>
        {tables.map((table, tIdx) => (
          <Collapse.Panel key={String(tIdx)} header={<span style={{ fontWeight: 600, fontSize: 14 }}>{table.title}</span>}>
            <Table
              dataSource={table.rows.map((row: string, rIdx: number) => {
                const record: Record<string, unknown> = { _key: row };
                table.columns.forEach((col: string, cIdx: number) => {
                  if (cIdx === 0) { record[col] = row; } else {
                    record[col] = <InputNumber size="small" style={{ width: '100%' }} value={(cellData as any)[`t${tIdx}_${row}_${col}`]} onChange={(v) => handleCellChange(tIdx, row, col, v)} placeholder="-" />;
                  }
                });
                return record;
              })}
              columns={table.columns.map((col: string, cIdx: number) => ({ title: col, dataIndex: col, key: col, width: cIdx === 0 ? 140 : 100 }))}
              pagination={false} bordered size="small" scroll={{ x: 'max-content' }}
            />
          </Collapse.Panel>
        ))}
      </Collapse>
      <div style={{ marginTop: 28, textAlign: 'center' }}>
        <Button type="primary" size="large" icon={<CalculatorOutlined />} onClick={handleSubmit} style={{ borderRadius: 12, height: 48, fontWeight: 600, paddingInline: 32, fontSize: 15 }}>提交数据并开始分析</Button>
        <div style={{ marginTop: 10 }}><Tag color="processing" style={{ borderRadius: 8 }}>已填写 {Object.keys(cellData).length} 个数据点</Tag></div>
      </div>
    </div>
  );
}

// ============================================================
// AnalysisStep — 保留原有逻辑
// ============================================================
function AnalysisStep({ experimentId }: { experimentId: string }) {
  const store = usePostlabStore();
  const [analysing, setAnalysing] = useState(true);
  const [results, setResults] = useState<Record<string, unknown>>({});
  const [logs, setLogs] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    analyzeData({ experiment_id: experimentId, data: store.rawData, temperature: store.temperature, pressure: store.pressure })
      .then((res) => { setResults(res.results); setLogs(res.logs); setAnalysing(false); })
      .catch((err) => { setError(err.message || '数据分析失败'); setAnalysing(false); });
  }, [experimentId]);

  if (analysing) return <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /><Typography.Text type="secondary" style={{ display: 'block', marginTop: 16, fontSize: 14 }}>后台计算中，请稍候...</Typography.Text></div>;
  if (error) return <Alert message="数据分析失败" description={error} type="error" showIcon style={{ borderRadius: 10 }} action={<Button onClick={() => window.location.reload()}>重试</Button>} />;

  return (
    <div>
      <Card title={<span style={{ fontWeight: 600, fontSize: 14 }}><LineChartOutlined style={{ marginRight: 8, color: '#3d7a4f' }} />分析结果</span>} style={{ borderRadius: 12, border: '1px solid #e8e0d0' }}>
        <Descriptions column={2} size="small" bordered>
          {Object.entries(results).slice(0, 20).map(([k, v]) => (
            <Descriptions.Item key={k} label={<strong>{k}</strong>}><code>{typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(6)) : String(v)}</code></Descriptions.Item>
          ))}
        </Descriptions>
        {logs && <pre style={{ background: '#faf8f0', padding: 14, borderRadius: 8, whiteSpace: 'pre-wrap', marginTop: 16, fontSize: 12, maxHeight: 200, overflow: 'auto', border: '1px solid #e8e0d0', lineHeight: 1.5 }}>{logs}</pre>}
      </Card>
      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Button type="primary" size="large" onClick={() => store.setAnalysisRes(results)} style={{ borderRadius: 12, fontWeight: 600, paddingInline: 28 }}>确认结果，继续</Button>
      </div>
    </div>
  );
}

// ============================================================
// PostLabFlow Main
// ============================================================
export default function PostLabFlow() {
  const { courseId, experimentId } = useParams<{ courseId: string; experimentId: string }>();
  const navigate = useNavigate();
  const cId = courseId || sessionStorage.getItem('courseId') || '';
  const eId = experimentId || sessionStorage.getItem('experimentId') || '';

  const store = usePostlabStore();
  const sse = useSSE();
  const reviseSse = useSSE();
  const studentInfo = JSON.parse(sessionStorage.getItem('studentInfo') || '{}');

  // ── Figures generation (on phase=figures) ──
  const [figuresLoading, setFiguresLoading] = useState(false);
  useEffect(() => {
    if (store.phase === 'figures' && store.figures.length === 0 && !figuresLoading) {
      setFiguresLoading(true);
      apiGenerateFigures({ experiment_id: eId, analysis_results: store.analysisRes })
        .then((res) => { store.setFigures(res.figures as string[], res.output_dir || ''); setFiguresLoading(false); })
        .catch(() => { store.setFigures([], ''); setFiguresLoading(false); });
    }
  }, [store.phase, eId]);

  // ── SSE for AI generation ──
  const doGenerate = (section: string) => {
    store.setActiveSection(section);
    sse.reset();
    store.startGenerate();
    sse.startStream('/reports/postlab/generate', {
      course_id: cId, experiment_id: eId, section, data: store.rawData,
      analysis_results: store.analysisRes, student_info: studentInfo,
    });
  };

  const doRevise = () => {
    if (!store.feedback.trim()) { message.warning('请输入修改意见'); return; }
    const content = store.revisedContent || store.generatedContent;
    reviseSse.reset();
    store.startRevise();
    reviseSse.startStream('/reports/postlab/revise', {
      course_id: cId, experiment_id: eId, section: store.activeSection,
      content, feedback: store.feedback.trim(),
    });
  };

  const isStreaming = sse.streaming || reviseSse.streaming;
  useEffect(() => {
    if (store.phase === 'content_gen' && !isStreaming && (sse.content || reviseSse.content)) {
      if (reviseSse.content) store.finishRevise(reviseSse.content);
      else if (sse.content) store.finishGenerate(sse.content);
    }
  }, [store.phase, isStreaming, sse.content, reviseSse.content]);

  // ── Display HTML ──
  const contentToShow = store.revisedContent || store.generatedContent;
  const displayHtml = useMemo(() => {
    const saved = store.sectionContents[store.activeSection];
    if (saved?.length) return blocksToHtml(saved);
    if (contentToShow && !isStreaming) {
      try {
        const parsed = JSON.parse(contentToShow.trim());
        const blocks = Array.isArray(parsed) ? parsed : (parsed.blocks || []);
        if (blocks.length) return blocksToHtml(blocks);
      } catch { /* ignore */ }
    }
    return '';
  }, [store.activeSection, store.sectionContents, contentToShow, isStreaming]);

  // ── Assemble ──
  const doAssemble = async () => {
    message.loading({ content: '组装完整报告中...', key: 'assemble', duration: 0 });
    try {
      const result = await apiAssemblePostlab({
        course_id: cId, experiment_id: eId,
        prelab_sections: {}, records: store.sectionContents.records || [],
        data_analysis: store.sectionContents.records ? [{ type: 'body' as const, text: `数据分析结果：${JSON.stringify(store.analysisRes)}` }] : [],
        discussion: store.sectionContents.discussion || [], questions: store.sectionContents.questions || [],
        student_info: studentInfo,
      } as any);
      message.destroy('assemble');
      sessionStorage.setItem('lastReportHtml', result.html);
      sessionStorage.setItem('lastReportId', result.report_id);
      store.finishAssemble();
    } catch (err) {
      message.destroy('assemble');
      message.error(`组装失败：${(err as Error).message}`);
    }
  };

  useEffect(() => { if (store.phase === 'review_export') doAssemble(); }, [store.phase]); // eslint-disable-line

  // ── Done ──
  if (store.phase === 'done') {
    const reportId = sessionStorage.getItem('lastReportId') || '';
    return (
      <Result status="success" title="完整报告生成完成！" subTitle="报告已保存，可以预览或下载"
        extra={[
          <Button key="preview" type="primary" size="large" onClick={() => navigate(`/preview/${reportId}`)} style={{ borderRadius: 10, fontWeight: 600 }}>预览报告</Button>,
          <Button key="history" size="large" onClick={() => navigate('/history')} style={{ borderRadius: 10 }}>历史报告</Button>,
          <Button key="home" size="large" onClick={() => navigate('/')} style={{ borderRadius: 10 }}>返回首页</Button>,
        ]}
      />
    );
  }

  const StepCard = ({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) => (
    <Card style={{ borderRadius: 14, border: '1px solid #e8e0d0' }} title={<span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 15 }}>{icon}{title}</span>}>{children}</Card>
  );

  return (
    <div style={{ maxWidth: 920, margin: '0 auto' }}>
      <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(`/setup/${encodeURIComponent(cId)}/${encodeURIComponent(eId)}`)} style={{ color: '#6b5e4a', paddingLeft: 0, fontWeight: 500, marginBottom: 24 }}>返回</Button>
      <ProgressStepper current={store.phase === 'data_entry' ? 0 : store.phase === 'analysis' ? 1 : store.phase === 'figures' ? 2 : store.phase === 'content_gen' ? 3 : 4} steps={POSTLAB_STEPS} />

      {/* ── DATA ENTRY ── */}
      {store.phase === 'data_entry' && <StepCard title="填写实验数据" icon={<DatabaseOutlined />}><DataEntryStep experimentId={eId} /></StepCard>}

      {/* ── ANALYSIS ── */}
      {store.phase === 'analysis' && <StepCard title="数据分析" icon={<CalculatorOutlined />}><AnalysisStep experimentId={eId} /></StepCard>}

      {/* ── FIGURES ── */}
      {store.phase === 'figures' && (
        <StepCard title="图形生成" icon={<PictureOutlined />}>
          {figuresLoading ? <div style={{ textAlign: 'center', padding: 48 }}><Spin size="large" /><Typography.Text type="secondary" style={{ display: 'block', marginTop: 16 }}>正在生成图形...</Typography.Text></div>
          : store.figures.length > 0 ? <><FigurePreview figures={store.figures} outputDir={store.figureDir} /><div style={{ marginTop: 24, textAlign: 'center' }}><Button type="primary" size="large" onClick={() => store.setPhase('content_gen')} style={{ borderRadius: 12, fontWeight: 600, paddingInline: 28 }}>确认图形，继续生成内容</Button></div></>
          : <div style={{ textAlign: 'center', padding: 32 }}><Empty description="未生成图形" /><Button type="primary" onClick={() => store.setPhase('content_gen')} style={{ marginTop: 16, borderRadius: 10 }}>跳过，继续</Button></div>}
        </StepCard>
      )}

      {/* ── CONTENT GEN ── */}
      {store.phase === 'content_gen' && (
        <Card style={{ borderRadius: 14, border: '1px solid #e8e0d0' }} title={<span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 15 }}><FormOutlined />AI 生成报告内容</span>}>
          <div style={{ marginBottom: 20 }}>
            <Space size="small" wrap>
              {POSTLAB_SECTIONS.map((s) => (
                <Button key={s.key} type={store.activeSection === s.key ? 'primary' : 'default'} icon={<FileTextOutlined />} onClick={() => doGenerate(s.key)} style={{ borderRadius: 8, fontWeight: store.activeSection === s.key ? 600 : 400 }}>
                  {s.label}{store.sectionContents[s.key] && <Tag color="success" style={{ marginLeft: 6, fontSize: 10, borderRadius: 6, lineHeight: '16px' }}>✓</Tag>}
                </Button>
              ))}
            </Space>
          </div>

          {Object.keys(store.sectionContents).length > 0 && (
            <div style={{ background: '#faf8f0', borderRadius: 10, padding: '10px 16px', border: '1px solid #e8e0d0', marginBottom: 18 }}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>已完成：{POSTLAB_SECTIONS.filter((s) => store.sectionContents[s.key]).map((s) => s.label).join(' · ')}</Typography.Text>
            </div>
          )}

          {(store.generatedContent || sse.streaming || reviseSse.content) && (
            <>
              <Divider style={{ margin: '16px 0' }} />
              <MathPreview html={displayHtml} loading={isStreaming} status={sse.status || reviseSse.status} height="360px" />
              {sse.error && <Alert message="生成失败" description={sse.error} type="error" showIcon style={{ marginTop: 16, borderRadius: 10 }} action={<Button onClick={() => doGenerate(store.activeSection)}>重试</Button>} />}
              {!isStreaming && (store.generatedContent || store.revisedContent) && (
                <div style={{ marginTop: 20, borderTop: '1px solid #f0ebe0', paddingTop: 18 }}>
                  <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 14 }}>💬 给 AI 提修改意见</div>
                  <Input.TextArea value={store.feedback} onChange={(e) => store.setFeedback(e.target.value)} placeholder="请在此输入修改意见..." rows={3} style={{ borderRadius: 10 }} />
                  <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between' }}>
                    <Space>
                      <Button type="primary" icon={<SendOutlined />} onClick={doRevise} loading={reviseSse.streaming} disabled={!store.feedback.trim()} style={{ borderRadius: 8 }}>提交反馈让 AI 修改</Button>
                      <Button icon={<ReloadOutlined />} onClick={() => doGenerate(store.activeSection)} style={{ borderRadius: 8 }}>重新生成</Button>
                    </Space>
                    <Button type="primary" ghost icon={<CheckOutlined />} onClick={store.acceptSection} size="large" style={{ borderRadius: 10, fontWeight: 600 }}>满意了，保存并继续</Button>
                  </div>
                  {reviseSse.error && <Alert message={reviseSse.error} type="error" showIcon style={{ marginTop: 12, borderRadius: 8 }} />}
                </div>
              )}
            </>
          )}

          {!store.generatedContent && !sse.streaming && !reviseSse.content && (
            <div style={{ textAlign: 'center', padding: '32px 0 12px' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #eef5ef 0%, #dce9df 100%)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <RobotOutlined style={{ color: '#3d7a4f', fontSize: 24 }} />
              </div>
              <Typography.Text type="secondary">点击上方的部分按钮，AI 将根据实验数据和讲义生成对应内容</Typography.Text>
            </div>
          )}

          {POSTLAB_SECTIONS.every((s) => store.sectionContents[s.key]) && (
            <div style={{ marginTop: 20, textAlign: 'center', borderTop: '1px solid #f0ebe0', paddingTop: 20 }}>
              <Button type="primary" size="large" onClick={() => store.setPhase('review_export')} style={{ borderRadius: 12, fontWeight: 600, paddingInline: 32 }}>全部完成，进入审查确认</Button>
            </div>
          )}
        </Card>
      )}

      {/* ── REVIEW EXPORT ── */}
      {store.phase === 'review_export' && (
        <Card style={{ borderRadius: 14, border: '1px solid #e8e0d0' }} title={<span style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 600, fontSize: 15 }}><CheckCircleOutlined />正在组装导出...</span>}>
          <div style={{ textAlign: 'center', padding: 40 }}><Spin size="large" /></div>
        </Card>
      )}
    </div>
  );
}
