import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card, Button, Space, Input, message, Result, Table, InputNumber,
  Typography, Divider, Spin, Collapse, Descriptions, Empty,
} from 'antd';
import {
  ArrowLeftOutlined, CalculatorOutlined, PictureOutlined,
  FileTextOutlined, CheckOutlined, SendOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  getDataTables, analyzeData, generateFigures as apiGenerateFigures,
  assemblePostlab as apiAssemblePostlab,
} from '../api/client';
import ProgressStepper from '../components/ProgressStepper';
import MathPreview from '../components/MathPreview';
import HtmlPreview from '../components/HtmlPreview';
import FigurePreview from '../components/FigurePreview';
import ReviewPanel from '../components/ReviewPanel';
import { useSSE } from '../hooks/useSSE';
import type { DataTableSchema } from '../types';

const POSTLAB_STEPS = [
  { title: '数据录入', description: '填写实验数据' },
  { title: '数据分析', description: '自动计算' },
  { title: '图形生成', description: '绘制图表' },
  { title: '内容生成', description: 'AI 生成讨论' },
  { title: '审查导出', description: '审查并下载' },
];

// --- Sub-components ---

function DataEntryStep({
  experimentId, onComplete,
}: {
  experimentId: string;
  onComplete: (data: Record<string, unknown>, temp: number, pres: number) => void;
}) {
  const [tables, setTables] = useState<DataTableSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [temperature, setTemperature] = useState<number | undefined>();
  const [pressure, setPressure] = useState<number | undefined>();
  const [cellData, setCellData] = useState<Record<string, number>>({});

  useEffect(() => {
    getDataTables(experimentId).then((res) => {
      setTables(res.tables as DataTableSchema[]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [experimentId]);

  const handleCellChange = (tableIdx: number, row: string, col: string, val: number | null) => {
    const key = `t${tableIdx}_${row}_${col}`;
    if (val !== null && val !== undefined) {
      setCellData((prev) => ({ ...prev, [key]: val }));
    }
  };

  const handleSubmit = () => {
    onComplete(cellData, temperature || 25, pressure || 101);
  };

  if (loading) return <Spin tip="加载数据表格..." />;
  if (tables.length === 0) return <Empty description="该实验暂无数据表格定义" />;

  return (
    <div>
      {(tables[0] as unknown as { temperature?: boolean }) && (
        <Space style={{ marginBottom: 16 }}>
          <span>实验温度：<InputNumber value={temperature} onChange={(v) => setTemperature(v ?? undefined)} placeholder="℃" suffix="℃" /></span>
          <span>大气压：<InputNumber value={pressure} onChange={(v) => setPressure(v ?? undefined)} placeholder="kPa" suffix="kPa" /></span>
        </Space>
      )}

      <Collapse accordion defaultActiveKey={['0']}>
        {tables.map((table, tIdx) => (
          <Collapse.Panel header={table.title} key={String(tIdx)}>
            {table.description && (
              <Typography.Text type="secondary">{table.description}</Typography.Text>
            )}
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
                width: cIdx === 0 ? 120 : 100,
                render: cIdx === 0 ? (text: string) => <strong>{text}</strong> : undefined,
              }))}
              pagination={false}
              bordered
              size="small"
              scroll={{ x: 'max-content' }}
            />
          </Collapse.Panel>
        ))}
      </Collapse>

      <div style={{ marginTop: 24, textAlign: 'center' }}>
        <Button type="primary" size="large" icon={<CalculatorOutlined />} onClick={handleSubmit}>
          提交数据并开始分析
        </Button>
      </div>
    </div>
  );
}

function AnalysisStep({
  experimentId, data, temperature, pressure,
  onComplete,
}: {
  experimentId: string; data: Record<string, unknown>;
  temperature?: number; pressure?: number;
  onComplete: (results: Record<string, unknown>, logs: string) => void;
}) {
  const [analysing, setAnalysing] = useState(true);
  const [results, setResults] = useState<Record<string, unknown>>({});
  const [logs, setLogs] = useState('');

  useEffect(() => {
    analyzeData({ experiment_id: experimentId, data, temperature, pressure })
      .then((res) => {
        setResults(res.results);
        setLogs(res.logs);
        setAnalysing(false);
      })
      .catch(() => setAnalysing(false));
  }, [experimentId, data, temperature, pressure]);

  if (analysing) return <Spin tip="数据分析中..." />;

  return (
    <div>
      <Card title="分析结果">
        <Descriptions column={2} size="small" bordered>
          {Object.entries(results).slice(0, 15).map(([k, v]) => (
            <Descriptions.Item key={k} label={k}>
              {typeof v === 'number' ? v.toFixed(6) : String(v)}
            </Descriptions.Item>
          ))}
        </Descriptions>

        {logs && (
          <pre style={{
            background: '#f5f5f5', padding: 12, borderRadius: 4,
            whiteSpace: 'pre-wrap', marginTop: 12, fontSize: 13,
          }}>
            {logs}
          </pre>
        )}
      </Card>

      <div style={{ marginTop: 16, textAlign: 'center' }}>
        <Button type="primary" onClick={() => onComplete(results, logs)}>
          确认分析结果
        </Button>
      </div>
    </div>
  );
}

// --- Main PostLabFlow ---

export default function PostLabFlow() {
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
  const [sectionContents, setSectionContents] = useState<Record<string, string>>({});
  const [activePostSection, setActivePostSection] = useState('records');
  const [feedback, setFeedback] = useState('');
  const [complete, setComplete] = useState(false);

  const sse = useSSE();
  const reviseSse = useSSE();
  const studentInfo = JSON.parse(sessionStorage.getItem('studentInfo') || '{}');

  const handleDataComplete = useCallback((d: Record<string, unknown>, temp: number, pres: number) => {
    setRawData(d);
    setTemperature(temp);
    setPressure(pres);
    setStep(1);
  }, []);

  const handleAnalysisComplete = useCallback(async (results: Record<string, unknown>, _logs: string) => {
    setAnalysisRes(results);
    setStep(2);

    // Auto-generate figures
    message.loading({ content: '生成图形中...', key: 'figs' });
    try {
      const figRes = await apiGenerateFigures({ experiment_id: eId, analysis_results: results });
      setFigures(figRes.figures as string[]);
      setFigureDir(figRes.output_dir || '');
    } catch { /* figures optional */ }
    message.destroy('figs');
    setStep(3);
  }, [eId]);

  const handleGenerateSection = useCallback((section: string) => {
    setActivePostSection(section);
    sse.startStream('/reports/postlab/generate', {
      course_id: cId,
      experiment_id: eId,
      section,
      data: rawData,
      analysis_results: analysisRes,
      student_info: studentInfo,
    });
  }, [cId, eId, rawData, analysisRes, studentInfo, sse]);

  const handleRevisePostSection = useCallback(() => {
    if (!feedback.trim()) return;
    const content = sse.content;
    reviseSse.startStream('/reports/postlab/revise', {
      course_id: cId,
      experiment_id: eId,
      section: activePostSection,
      content,
      feedback: feedback.trim(),
    });
    setFeedback('');
  }, [cId, eId, activePostSection, sse.content, feedback, reviseSse]);

  const handleFinalAssemble = useCallback(async () => {
    message.loading({ content: '组装完整报告中...', key: 'assemble' });
    const result = await apiAssemblePostlab({
      course_id: cId,
      experiment_id: eId,
      prelab_sections: {},
      records: sectionContents.records || '',
      data_analysis: `<pre>${JSON.stringify(analysisRes, null, 2)}</pre>`,
      discussion: sectionContents.discussion || '',
      questions: sectionContents.questions || '',
      student_info: studentInfo,
    });
    message.destroy('assemble');
    sessionStorage.setItem('lastReportHtml', result.html);
    sessionStorage.setItem('lastReportId', result.report_id);
    sessionStorage.setItem('lastReportPath', result.html_path);
    setComplete(true);
  }, [eId, sectionContents, analysisRes, studentInfo]);

  if (complete) {
    return (
      <Result
        status="success"
        title="完整报告生成完成！"
        extra={[
          <Button key="preview" type="primary" onClick={() => navigate(`/preview/${sessionStorage.getItem('lastReportId') || ''}`)}>
            预览报告
          </Button>,
          <Button key="home" onClick={() => navigate('/')}>返回首页</Button>,
        ]}
      />
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <ProgressStepper current={step} steps={POSTLAB_STEPS} />

      {step === 0 && (
        <Card title="第 1 步：填写实验数据">
          <DataEntryStep experimentId={eId} onComplete={handleDataComplete} />
        </Card>
      )}

      {step === 1 && (
        <AnalysisStep
          experimentId={eId}
          data={rawData}
          temperature={temperature}
          pressure={pressure}
          onComplete={handleAnalysisComplete}
        />
      )}

      {step === 2 && figures.length > 0 && (
        <Card title="第 3 步：图形预览">
          <FigurePreview figures={figures} outputDir={figureDir} />
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Button type="primary" onClick={() => setStep(3)}>确认图形，继续</Button>
          </div>
        </Card>
      )}

      {step >= 3 && step < 5 && (
        <Card title="第 4 步：AI 生成报告内容">
          <Space style={{ marginBottom: 16 }}>
            {['records', 'discussion', 'questions'].map((s) => (
              <Button
                key={s}
                type={activePostSection === s ? 'primary' : 'default'}
                icon={<FileTextOutlined />}
                onClick={() => {
                  setActivePostSection(s);
                  handleGenerateSection(s);
                }}
              >
                {s === 'records' ? '实验记录' : s === 'discussion' ? '结果讨论' : '思考题'}
              </Button>
            ))}
          </Space>

          {(sse.streaming || sse.content || reviseSse.content) && (
            <>
              <MathPreview
                html={reviseSse.content || sse.content}
                loading={sse.streaming || reviseSse.streaming}
                status={sse.status || reviseSse.status}
                height="300px"
              />
              {!sse.streaming && !reviseSse.streaming && (sse.content || reviseSse.content) && (
                <div style={{ marginTop: 20, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: 8 }}>💬 给 AI 提修改意见</div>
                  <Input.TextArea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="例如：实验记录写得太简略，请按步骤详细描述操作和现象..."
                    rows={3}
                  />
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
                    <Button
                      type="primary"
                      icon={<SendOutlined />}
                      onClick={handleRevisePostSection}
                      loading={reviseSse.streaming}
                      disabled={!feedback.trim()}
                    >
                      提交反馈让 AI 修改
                    </Button>
                    <Button
                      icon={<CheckOutlined />}
                      onClick={() => {
                        const content = reviseSse.content || sse.content;
                        setSectionContents((prev) => ({ ...prev, [activePostSection]: content }));
                        if (activePostSection === 'questions') {
                          setStep(4);
                        } else {
                          message.success('已保存，继续生成下一部分');
                        }
                      }}
                    >
                      满意了，保存并继续
                    </Button>
                  </div>
                  {reviseSse.error && (
                    <div style={{ color: 'red', marginTop: 8 }}>{reviseSse.error}</div>
                  )}
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {step === 4 && (
        <Card title="第 5 步：导出报告">
          <div style={{ textAlign: 'center', padding: 24 }}>
            <Button type="primary" size="large" onClick={handleFinalAssemble}>
              📄 生成完整报告
            </Button>
          </div>
        </Card>
      )}

      <div style={{ marginTop: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(`/setup/${encodeURIComponent(cId)}/${encodeURIComponent(eId)}`)}>
          返回
        </Button>
      </div>
    </div>
  );
}
