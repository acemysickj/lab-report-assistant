import { Empty, Typography } from 'antd';
import type { ReactNode } from 'react';

type EmptyType = 'experiment' | 'report' | 'data' | 'figure' | 'general';

interface Props {
  type?: EmptyType;
  description?: string;
  children?: ReactNode;
}

/**
 * Lab-themed empty state with inline SVG illustrations.
 *
 * Types:
 * - experiment: flask/beaker — no experiments found
 * - report: document — no reports generated
 * - data: spreadsheet/table — no data tables
 * - figure: chart — no figures
 * - general: clipboard — generic empty
 */
export default function LabEmpty({ type = 'general', description, children }: Props) {
  const svg = ILLUSTRATIONS[type] || ILLUSTRATIONS.general;
  const desc = description || DEFAULT_DESC[type];

  return (
    <Empty
      image={
        <div style={{ display: 'inline-block', marginBottom: 8 }}>
          {svg}
        </div>
      }
      description={
        <Typography.Text type="secondary" style={{ fontSize: 13 }}>
          {desc}
        </Typography.Text>
      }
    >
      {children}
    </Empty>
  );
}

const DEFAULT_DESC: Record<EmptyType, string> = {
  experiment: '暂无实验',
  report: '暂无报告',
  data: '暂无数据表格定义',
  figure: '暂无图形',
  general: '暂无内容',
};

// ============================================================
// Inline SVG illustrations — lab/science themed
// ============================================================

const SHARED_STYLE: React.CSSProperties = {
  width: 80,
  height: 80,
  opacity: 0.6,
};

const ILLUSTRATIONS: Record<EmptyType, ReactNode> = {
  // Flask + beaker for experiments
  experiment: (
    <svg viewBox="0 0 200 160" style={SHARED_STYLE} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Flask */}
      <path d="M85 20 L85 75 L60 125 Q55 135 65 140 L105 140 Q115 135 110 125 L85 75 Z"
        stroke="#8db893" strokeWidth="3" fill="#eef5ef" />
      <rect x="68" y="50" width="34" height="3" rx="1" fill="#dce9df" />
      <rect x="72" y="40" width="26" height="3" rx="1" fill="#dce9df" />
      {/* Liquid */}
      <path d="M65 130 L65 140 L105 140 L105 130 Q85 135 65 130 Z" fill="#a8d4b0" opacity="0.6" />
      {/* Bubbles */}
      <circle cx="78" cy="122" r="3" fill="#5b9a6b" opacity="0.5" />
      <circle cx="92" cy="118" r="2" fill="#5b9a6b" opacity="0.4" />
      <circle cx="85" cy="126" r="2.5" fill="#5b9a6b" opacity="0.3" />
      {/* Beaker */}
      <path d="M125 55 L125 130 Q125 150 155 150 Q185 150 185 130 L185 55"
        stroke="#8db893" strokeWidth="3" fill="#faf8f0" />
      <line x1="130" y1="75" x2="180" y2="75" stroke="#dce9df" strokeWidth="2" />
      <line x1="130" y1="90" x2="180" y2="90" stroke="#dce9df" strokeWidth="2" />
      <line x1="130" y1="105" x2="170" y2="105" stroke="#dce9df" strokeWidth="2" />
      {/* Liquid in beaker */}
      <path d="M135 125 Q155 120 175 125 L175 145 Q155 142 135 145 Z" fill="#c4d8c4" opacity="0.5" />
    </svg>
  ),

  // Document for reports
  report: (
    <svg viewBox="0 0 200 160" style={SHARED_STYLE} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Document */}
      <rect x="50" y="15" width="100" height="130" rx="8"
        stroke="#8db893" strokeWidth="3" fill="#fefdf8" />
      {/* Fold corner */}
      <path d="M130 15 L130 35 Q130 45 140 45 L150 45 L150 15 Z"
        fill="#eef5ef" stroke="#8db893" strokeWidth="2" />
      {/* Lines */}
      <rect x="65" y="55" width="55" height="4" rx="2" fill="#dce9df" />
      <rect x="65" y="68" width="70" height="3" rx="1.5" fill="#e8e0d0" />
      <rect x="65" y="78" width="65" height="3" rx="1.5" fill="#e8e0d0" />
      <rect x="65" y="88" width="60" height="3" rx="1.5" fill="#e8e0d0" />
      <rect x="65" y="98" width="55" height="3" rx="1.5" fill="#e8e0d0" />
      <rect x="65" y="108" width="50" height="3" rx="1.5" fill="#e8e0d0" />
      <rect x="65" y="118" width="40" height="3" rx="1.5" fill="#e8e0d0" />
      {/* Checkmark circle */}
      <circle cx="135" cy="135" r="16" fill="#eef7f0" stroke="#8db893" strokeWidth="2" />
      <path d="M128 135 L132 139 L142 129" stroke="#3d7a4f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),

  // Table/spreadsheet for data
  data: (
    <svg viewBox="0 0 200 160" style={SHARED_STYLE} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Table */}
      <rect x="25" y="25" width="150" height="115" rx="6"
        stroke="#8db893" strokeWidth="3" fill="#fefdf8" />
      {/* Header */}
      <rect x="25" y="25" width="150" height="30" rx="6" fill="#eef5ef" />
      <rect x="25" y="47" width="150" height="1" fill="#dce9df" />
      {/* Grid lines */}
      <line x1="85" y1="25" x2="85" y2="55" stroke="#dce9df" strokeWidth="1" />
      <line x1="140" y1="25" x2="140" y2="140" stroke="#e8e0d0" strokeWidth="1" />
      <line x1="85" y1="55" x2="85" y2="140" stroke="#e8e0d0" strokeWidth="1" />
      {/* Rows */}
      <line x1="25" y1="70" x2="175" y2="70" stroke="#f0ebe0" strokeWidth="1" />
      <line x1="25" y1="90" x2="175" y2="90" stroke="#f0ebe0" strokeWidth="1" />
      <line x1="25" y1="110" x2="175" y2="110" stroke="#f0ebe0" strokeWidth="1" />
      {/* Header text */}
      <rect x="38" y="37" width="30" height="6" rx="1" fill="#8db893" opacity="0.6" />
      <rect x="98" y="37" width="35" height="6" rx="1" fill="#8db893" opacity="0.4" />
      <rect x="153" y="37" width="15" height="6" rx="1" fill="#8db893" opacity="0.4" />
      {/* Cell data */}
      <rect x="35" y="62" width="25" height="4" rx="1" fill="#e8e0d0" opacity="0.6" />
      <rect x="95" y="62" width="30" height="4" rx="1" fill="#e8e0d0" opacity="0.4" />
    </svg>
  ),

  // Chart for figures
  figure: (
    <svg viewBox="0 0 200 160" style={SHARED_STYLE} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Axes */}
      <line x1="40" y1="20" x2="40" y2="135" stroke="#8db893" strokeWidth="2.5" />
      <line x1="40" y1="135" x2="180" y2="135" stroke="#8db893" strokeWidth="2.5" />
      {/* Bars */}
      <rect x="55" y="95" width="22" height="40" rx="3" fill="#dce9df" />
      <rect x="85" y="65" width="22" height="70" rx="3" fill="#c4d8c4" />
      <rect x="115" y="45" width="22" height="90" rx="3" fill="#5b9a6b" opacity="0.7" />
      <rect x="145" y="80" width="22" height="55" rx="3" fill="#8db893" />
      {/* Trend line */}
      <polyline points="66,95 96,85 126,63 156,80"
        stroke="#3d7a4f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {/* Dots */}
      <circle cx="66" cy="93" r="4" fill="#3d7a4f" />
      <circle cx="96" cy="83" r="4" fill="#3d7a4f" />
      <circle cx="126" cy="61" r="4" fill="#3d7a4f" />
      <circle cx="156" cy="78" r="4" fill="#3d7a4f" />
    </svg>
  ),

  // Clipboard for general
  general: (
    <svg viewBox="0 0 200 160" style={SHARED_STYLE} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Clipboard */}
      <rect x="55" y="25" width="90" height="120" rx="8"
        stroke="#8db893" strokeWidth="3" fill="#fefdf8" />
      {/* Clip */}
      <rect x="80" y="15" width="40" height="20" rx="5"
        stroke="#8db893" strokeWidth="2" fill="#eef5ef" />
      {/* Lines */}
      <rect x="68" y="58" width="50" height="5" rx="2" fill="#dce9df" />
      <rect x="68" y="72" width="64" height="4" rx="2" fill="#e8e0d0" />
      <rect x="68" y="84" width="55" height="4" rx="2" fill="#e8e0d0" />
      <rect x="68" y="96" width="60" height="4" rx="2" fill="#e8e0d0" />
      <rect x="68" y="108" width="45" height="4" rx="2" fill="#e8e0d0" />
      {/* Pencil */}
      <g transform="translate(135, 110) rotate(15)">
        <rect x="0" y="0" width="4" height="35" rx="2" fill="#c8923e" />
        <polygon points="0,0 4,0 2,-8" fill="#f5e6c8" />
        <rect x="0" y="33" width="4" height="6" rx="1" fill="#e8d0a0" />
      </g>
    </svg>
  ),
};
