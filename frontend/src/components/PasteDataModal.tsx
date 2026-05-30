import { useState } from 'react';
import { Modal, Input, Button, Typography, Table, Space, message, Tag } from 'antd';
import { CopyOutlined, CheckOutlined } from '@ant-design/icons';
import type { DataTableSchema } from '../types';

interface Props {
  open: boolean;
  tables: DataTableSchema[];
  currentData: Record<string, number>;
  onClose: () => void;
  onApply: (data: Record<string, number>) => void;
}

/**
 * Modal for pasting tabular data from Excel/Sheets.
 *
 * User pastes tab-separated values; we parse and map them
 * to the existing cell data structure.
 */
export default function PasteDataModal({
  open, tables, currentData, onClose, onApply,
}: Props) {
  const [pasteText, setPasteText] = useState('');
  const [parsed, setParsed] = useState<Record<string, number>>({});
  const [previewRows, setPreviewRows] = useState<string[][]>([]);

  const handlePaste = (text: string) => {
    setPasteText(text);
    if (!text.trim()) {
      setParsed({});
      setPreviewRows([]);
      return;
    }

    // Parse tab-separated or comma-separated lines
    const lines = text.trim().split(/\r?\n/).filter(Boolean);
    const rows: string[][] = [];

    for (const line of lines) {
      // Try tab first, then comma, then whitespace
      const cols = line.includes('\t')
        ? line.split('\t')
        : line.includes(',')
          ? line.split(',')
          : line.split(/\s{2,}/);
      rows.push(cols.map((c) => c.trim().replace(/^["']|["']$/g, '')));
    }

    setPreviewRows(rows);

    // Map to cell data: handle common Excel paste patterns
    const newData: Record<string, number> = {};

    if (tables.length === 0) return;

    // For each table, try to match rows
    let globalRowIdx = 0;
    for (let tIdx = 0; tIdx < tables.length; tIdx++) {
      const table = tables[tIdx];
      const headerRowIdx = globalRowIdx;

      for (let rIdx = 0; rIdx < table.rows.length; rIdx++) {
        const pasteRowIdx = headerRowIdx + 1 + rIdx; // skip header row
        if (pasteRowIdx >= rows.length) break;

        const pasteRow = rows[pasteRowIdx];
        const rowLabel = table.rows[rIdx];

        for (let cIdx = 1; cIdx < table.columns.length; cIdx++) {
          const colName = table.columns[cIdx];
          if (cIdx < pasteRow.length) {
            const val = parseFloat(pasteRow[cIdx]);
            if (!isNaN(val)) {
              newData[`t${tIdx}_${rowLabel}_${colName}`] = val;
            }
          }
        }
      }
      globalRowIdx += table.rows.length + 1; // +1 for header
    }

    setParsed(newData);
  };

  const handleApply = () => {
    const merged = { ...currentData, ...parsed };
    onApply(merged);
    message.success(`已应用 ${Object.keys(parsed).length} 个数据点`);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setPasteText('');
    setParsed({});
    setPreviewRows([]);
  };

  return (
    <Modal
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600 }}>
          <CopyOutlined style={{ color: '#3d7a4f' }} />
          从 Excel 粘贴数据
        </span>
      }
      open={open}
      onCancel={() => { handleReset(); onClose(); }}
      footer={
        <Space>
          <Button onClick={() => { handleReset(); onClose(); }}>取消</Button>
          <Button
            type="primary"
            icon={<CheckOutlined />}
            onClick={handleApply}
            disabled={Object.keys(parsed).length === 0}
          >
            应用数据
          </Button>
        </Space>
      }
      width={640}
      destroyOnClose
      styles={{ body: { padding: '24px 28px' } }}
    >
      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: 6, fontSize: 13 }}>
        从 Excel 或 Google Sheets 中复制数据（包含表头），粘贴到下方：
      </Typography.Text>

      <Input.TextArea
        value={pasteText}
        onChange={(e) => handlePaste(e.target.value)}
        placeholder={`实验编号\t温度(℃)\t浓度(mol/L)\t时间(s)\n1\t25.0\t0.100\t120\n2\t25.0\t0.200\t85\n...`}
        rows={8}
        style={{ fontFamily: 'monospace', fontSize: 12, borderRadius: 10, marginBottom: 16 }}
      />

      {previewRows.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Typography.Text strong style={{ fontSize: 13 }}>
              预览（前 10 行）
            </Typography.Text>
            <Tag color="processing" style={{ borderRadius: 6 }}>
              {Object.keys(parsed).length} 个数据点
            </Tag>
          </div>
          <div style={{
            maxHeight: 200, overflow: 'auto', borderRadius: 8,
            border: '1px solid #e8e0d0', background: '#faf8f0',
          }}>
            <table style={{
              width: '100%', borderCollapse: 'collapse',
              fontSize: 12, fontFamily: 'monospace',
            }}>
              <thead>
                <tr style={{ background: '#eef5ef' }}>
                  {previewRows[0]?.map((col, i) => (
                    <th key={i} style={{ padding: '6px 10px', border: '1px solid #ddd4c2', textAlign: 'left' }}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewRows.slice(1, 10).map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? '#fefdf8' : '#faf8f0' }}>
                    {row.map((col, j) => (
                      <td key={j} style={{ padding: '4px 10px', border: '1px solid #e8e0d0' }}>
                        {col}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}
