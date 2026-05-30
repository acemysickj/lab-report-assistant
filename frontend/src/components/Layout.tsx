import { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Select, Spin, Button, Divider, Tooltip } from 'antd';
import {
  ExperimentOutlined,
  HomeOutlined,
  HistoryOutlined,
  PlusOutlined,
  BookOutlined,
  SettingOutlined,
} from '@ant-design/icons';
import type { ItemType } from 'antd/es/menu/interface';
import { getCourses, getExperiments } from '../api/client';
import type { Course, Experiment } from '../types';
import NewCourseModal from './NewCourseModal';

const { Sider, Content } = Layout;
const { Text } = Typography;

export default function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState(() =>
    sessionStorage.getItem('selectedCourse') || '',
  );
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [loadingExperiments, setLoadingExperiments] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const loadCourses = useCallback(() => {
    setLoadingCourses(true);
    getCourses()
      .then((res) => {
        setCourses(res.courses);
        if (!selectedCourse || !res.courses.find((c) => c.id === selectedCourse)) {
          const first = res.courses[0]?.id || '';
          setSelectedCourse(first);
          sessionStorage.setItem('selectedCourse', first);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingCourses(false));
  }, [selectedCourse]);

  useEffect(() => { loadCourses(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!selectedCourse) return;
    sessionStorage.setItem('selectedCourse', selectedCourse);
    setLoadingExperiments(true);
    getExperiments(selectedCourse)
      .then((res) => setExperiments(res.experiments))
      .catch(() => setExperiments([]))
      .finally(() => setLoadingExperiments(false));
  }, [selectedCourse]);

  // Build menu items
  const menuItems: ItemType[] = useMemo(() => {
    const items: ItemType[] = [
      {
        key: '/',
        icon: <HomeOutlined />,
        label: '首页',
      },
      {
        key: '/history',
        icon: <HistoryOutlined />,
        label: '历史报告',
      },
    ];

    if (experiments.length > 0) {
      items.push({ type: 'divider' });
      experiments.forEach((exp, i) => {
        items.push({
          key: `/setup/${encodeURIComponent(selectedCourse)}/${encodeURIComponent(exp.id)}`,
          icon: (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 26,
                height: 26,
                borderRadius: 8,
                background: 'linear-gradient(135deg, #3d7a4f 0%, #5b9a6b 100%)',
                color: '#fff',
                fontSize: 12,
                fontWeight: 700,
                flexShrink: 0,
                boxShadow: '0 2px 4px rgba(61,122,79,0.3)',
              }}
            >
              {i + 1}
            </span>
          ),
          label: collapsed ? `${i + 1}` : exp.title,
        });
      });
    }

    return items;
  }, [selectedCourse, experiments, collapsed]);

  // Match current route to menu key
  const currentKey = useMemo(() => {
    const path = location.pathname;
    const exact = menuItems.find(
      (item) => item && 'key' in item && (item as { key: string }).key === path,
    );
    if (exact) return (exact as { key: string }).key;

    const prefix = menuItems.find((item) => {
      if (!item || !('key' in item)) return false;
      const key = (item as { key: string }).key;
      return key !== '/' && key !== '/history' && path.startsWith(key.split('/').slice(0, 3).join('/'));
    });
    if (prefix) return (prefix as { key: string }).key;

    return '/';
  }, [location.pathname, menuItems]);

  const siderWidth = collapsed ? 80 : 260;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={260}
        trigger={null}
        style={{
          background: '#f7f3e8',
          borderRight: '1px solid #e0d8c8',
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 10,
        }}
      >
        {/* ---- Logo & Brand ---- */}
        <div
          style={{
            padding: collapsed ? '24px 12px' : '32px 24px 24px',
            borderBottom: '1px solid #e8e0d0',
            textAlign: 'center',
            background: collapsed
              ? 'transparent'
              : 'linear-gradient(180deg, rgba(61,122,79,0.04) 0%, transparent 100%)',
          }}
        >
          {/* Logo image */}
          <div
            style={{
              width: collapsed ? 48 : 72,
              height: collapsed ? 48 : 72,
              margin: '0 auto',
              borderRadius: 16,
              background: 'linear-gradient(135deg, #eef5ef 0%, #dce9df 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(61,122,79,0.12)',
              marginBottom: collapsed ? 0 : 12,
              overflow: 'hidden',
            }}
          >
            <img
              src={`/common/image/${encodeURIComponent('实验室工作区插画生成.png')}`}
              alt="logo"
              style={{
                width: collapsed ? 36 : 56,
                height: 'auto',
                borderRadius: 8,
              }}
            />
          </div>

          {!collapsed && (
            <>
              <Text
                strong
                style={{
                  fontSize: 17,
                  color: '#2c2416',
                  display: 'block',
                  fontWeight: 700,
                  letterSpacing: 0.5,
                }}
              >
                实验报告助手
              </Text>
              <Text
                type="secondary"
                style={{
                  fontSize: 12,
                  display: 'block',
                  marginTop: 4,
                  letterSpacing: 0.3,
                }}
              >
                Lab Assistant
              </Text>

              <Divider style={{ margin: '16px 0 12px' }} />

              {/* Course selector */}
              <div style={{ textAlign: 'left' }}>
                <Text
                  type="secondary"
                  style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6, display: 'block' }}
                >
                  当前课程
                </Text>
                {loadingCourses ? (
                  <Spin size="small" />
                ) : (
                  <Select
                    size="middle"
                    value={selectedCourse || undefined}
                    onChange={(val) => setSelectedCourse(val)}
                    style={{ width: '100%' }}
                    options={courses.map((c) => ({
                      value: c.id,
                      label: (
                        <span>
                          <BookOutlined style={{ marginRight: 6, color: '#8b7a60', fontSize: 12 }} />
                          {c.name}
                        </span>
                      ),
                    }))}
                    placeholder="选择课程"
                    suffixIcon={<SettingOutlined style={{ color: '#b0a48e', fontSize: 12 }} />}
                  />
                )}
                <Button
                  type="text"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={() => setModalOpen(true)}
                  style={{
                    width: '100%',
                    marginTop: 8,
                    color: '#8b7a60',
                    fontWeight: 500,
                    borderRadius: 8,
                    transition: 'all 0.2s',
                  }}
                >
                  新建课程
                </Button>
              </div>
            </>
          )}
        </div>

        {/* ---- Navigation Menu ---- */}
        <Menu
          mode="inline"
          selectedKeys={[currentKey]}
          onClick={({ key }) => navigate(key)}
          items={menuItems}
          style={{
            background: 'transparent',
            borderRight: 0,
            padding: '16px 8px',
          }}
        />

        {/* ---- Collapse trigger (bottom) ---- */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '12px 16px',
            borderTop: '1px solid #e8e0d0',
            background: 'rgba(247, 243, 232, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            justifyContent: collapsed ? 'center' : 'flex-end',
          }}
        >
          <Tooltip title={collapsed ? '展开侧栏' : '收起侧栏'} placement="right">
            <Button
              type="text"
              size="small"
              icon={
                <span style={{ fontSize: 14, fontWeight: 700, color: '#8b7a60' }}>
                  {collapsed ? '☰' : '←'}
                </span>
              }
              onClick={() => setCollapsed(!collapsed)}
              style={{
                color: '#8b7a60',
                borderRadius: 8,
                width: collapsed ? 36 : 'auto',
              }}
            />
          </Tooltip>
        </div>
      </Sider>

      {/* ---- Content area ---- */}
      <Layout
        style={{
          marginLeft: siderWidth,
          transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <Content
          style={{
            padding: '36px 44px',
            background: '#f5f1e8',
            minHeight: '100vh',
            maxWidth: 1120,
            margin: '0 auto',
            width: '100%',
          }}
        >
          {children}
        </Content>
      </Layout>

      <NewCourseModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={loadCourses} />
    </Layout>
  );
}
