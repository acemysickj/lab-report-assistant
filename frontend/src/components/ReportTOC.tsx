import { useMemo, useState, useCallback } from 'react';
import { Tree, Typography, Empty } from 'antd';
import { FileTextOutlined, MenuOutlined } from '@ant-design/icons';
import type { DataNode } from 'antd/es/tree';

interface TOCItem {
  id: string;
  text: string;
  level: number; // 2 = h2, 3 = h3
  children: TOCItem[];
}

interface Props {
  html: string;
  onNavigate?: (elementId: string) => void;
  /** Height of the TOC panel */
  height?: number;
}

/**
 * Extracts headings (h2, h3) from HTML and renders a clickable
 * table of contents tree.
 */
export default function ReportTOC({ html, onNavigate, height = 500 }: Props) {
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);

  // Parse headings from HTML
  const tocItems = useMemo(() => {
    if (!html) return [];
    return parseHeadings(html);
  }, [html]);

  // Build Tree data
  const treeData: DataNode[] = useMemo(() => {
    return tocItems.map((item) => toTreeNode(item));
  }, [tocItems]);

  // Expand all by default
  const allKeys = useMemo(() => {
    const keys: string[] = [];
    const collect = (items: TOCItem[]) => {
      for (const item of items) {
        keys.push(item.id);
        if (item.children.length > 0) collect(item.children);
      }
    };
    collect(tocItems);
    return keys;
  }, [tocItems]);

  const handleSelect = useCallback(
    (keys: React.Key[]) => {
      if (keys.length === 0) return;
      const key = String(keys[0]);
      onNavigate?.(key);
    },
    [onNavigate],
  );

  if (tocItems.length === 0) {
    return (
      <div style={{ padding: '20px 14px', textAlign: 'center' }}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="无标题"
          style={{ fontSize: 12 }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        height,
        overflow: 'auto',
        padding: '8px 4px',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 10px 12px',
        borderBottom: '1px solid #e8e0d0',
        marginBottom: 6,
      }}>
        <MenuOutlined style={{ color: '#8b7a60', fontSize: 14 }} />
        <Typography.Text strong style={{ fontSize: 13, color: '#5c4f3a' }}>
          目录
        </Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 11 }}>
          ({tocItems.length} 个章节)
        </Typography.Text>
      </div>
      <Tree
        treeData={treeData}
        showIcon={false}
        selectedKeys={[]}
        expandedKeys={allKeys}
        onSelect={handleSelect}
        style={{
          background: 'transparent',
          fontSize: 13,
        }}
        switcherIcon={<span style={{ fontSize: 10, color: '#b0a48e' }}>›</span>}
      />
    </div>
  );
}

// ============================================================
// Helpers
// ============================================================

function parseHeadings(html: string): TOCItem[] {
  const items: TOCItem[] = [];
  const stack: TOCItem[] = [];

  // Match h2 and h3 tags with optional id attributes
  const headingRegex = /<h([23])(?:\s+[^>]*?id=["']([^"']+)["'])?[^>]*?>(.*?)<\/h[23]>/gi;

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(html)) !== null) {
    const level = parseInt(match[1], 10);
    const existingId = match[2] || '';
    const innerHTML = match[3];
    const text = stripTags(innerHTML).trim();
    if (!text) continue;

    const id = existingId || `toc-${items.length}`;

    const item: TOCItem = { id, text, level, children: [] };

    // Pop stack until we find a parent with a lower level
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      items.push(item);
    } else {
      stack[stack.length - 1].children.push(item);
    }

    stack.push(item);
  }

  return items;
}

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[^;]+;/g, (m) => {
    const entities: Record<string, string> = {
      '&amp;': '&', '&lt;': '<', '&gt;': '>',
      '&quot;': '"', '&#39;': "'", '&nbsp;': ' ',
    };
    return entities[m] || m;
  });
}

function toTreeNode(item: TOCItem): DataNode {
  return {
    key: item.id,
    title: (
      <span
        style={{
          fontWeight: item.level === 2 ? 600 : 400,
          fontSize: item.level === 2 ? 13 : 12,
          color: item.level === 2 ? '#2c2416' : '#6b5e4a',
          cursor: 'pointer',
          display: 'block',
          padding: '2px 0',
          lineHeight: 1.4,
        }}
        title={item.text}
      >
        {item.text.length > 30 ? item.text.slice(0, 30) + '...' : item.text}
      </span>
    ),
    children: item.children.length > 0 ? item.children.map(toTreeNode) : undefined,
  };
}
