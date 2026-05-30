import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Typography, Select, Spin, Button } from 'antd';
import { ExperimentOutlined, HomeOutlined, HistoryOutlined, PlusOutlined } from '@ant-design/icons';
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
  const [selectedCourse, setSelectedCourse] = useState('');
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  const loadCourses = useCallback(() => {
    getCourses()
      .then((res) => {
        setCourses(res.courses);
        if (!selectedCourse || !res.courses.find((c) => c.id === selectedCourse)) {
          setSelectedCourse(res.courses[0]?.id || '');
        }
      })
      .catch(() => {});
  }, [selectedCourse]);

  useEffect(() => { loadCourses(); }, [loadCourses]);
  useEffect(() => { setLoading(false); }, [courses]);

  useEffect(() => {
    if (!selectedCourse) return;
    sessionStorage.setItem('selectedCourse', selectedCourse);
    getExperiments(selectedCourse)
      .then((res) => setExperiments(res.experiments))
      .catch(() => setExperiments([]));
  }, [selectedCourse]);

  const menuItems = [
    { key: '/', icon: <HomeOutlined />, label: '首页' },
    { key: '/history', icon: <HistoryOutlined />, label: '历史报告' },
    { type: 'divider' as const },
    ...experiments.map((exp, i) => ({
      key: `/setup/${encodeURIComponent(selectedCourse)}/${encodeURIComponent(exp.id)}`,
      icon: (
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 24, height: 24, borderRadius: 6,
          background: '#3d7a4f', color: '#fff', fontSize: 12, fontWeight: 600,
          flexShrink: 0,
        }}>
          {i + 1}
        </span>
      ),
      label: collapsed ? `${i + 1}` : exp.title,
    })),
  ];

  const matchedItem = menuItems.find(
    (item) => 'key' in item && location.pathname.startsWith(String(item.key).split('/').slice(0, 3).join('/')),
  );
  const currentKey = (matchedItem as { key?: string })?.key || '/';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        collapsible collapsed={collapsed} onCollapse={setCollapsed}
        width={260}
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
        {/* Logo */}
        <div style={{
          padding: collapsed ? '20px 8px' : '28px 20px 20px',
          borderBottom: '1px solid #e0d8c8',
          textAlign: 'center',
        }}>
          <img
            src={`/common/image/${encodeURIComponent('实验室工作区插画生成.png')}`}
            alt="logo"
            style={{
              width: collapsed ? 40 : 64,
              height: 'auto',
              borderRadius: 12,
              marginBottom: collapsed ? 0 : 8,
            }}
          />
          {!collapsed && (
            <>
              <Text strong style={{ fontSize: 16, color: '#2c2416', display: 'block' }}>
                实验报告助手
              </Text>
              {loading ? (
                <Spin size="small" style={{ marginTop: 12 }} />
              ) : (
                <Select
                  size="middle"
                  value={selectedCourse}
                  onChange={setSelectedCourse}
                  style={{ width: '100%', marginTop: 14 }}
                  options={courses.map((c) => ({ value: c.id, label: c.name }))}
                />
              )}
              <Button
                type="text"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => setModalOpen(true)}
                style={{ width: '100%', marginTop: 8, color: '#8b7a60', fontWeight: 500 }}
              >
                新建课程
              </Button>
            </>
          )}
        </div>

        <Menu
          mode="inline"
          selectedKeys={[currentKey]}
          onClick={({ key }) => navigate(key)}
          items={menuItems as never}
          style={{
            background: 'transparent',
            borderRight: 0,
            padding: '12px 6px',
          }}
        />
      </Sider>

      {/* Content offset for fixed sidebar */}
      <Layout style={{ marginLeft: collapsed ? 80 : 260, transition: 'margin-left 0.2s' }}>
        <Content style={{
          padding: '32px 40px',
          background: '#f5f1e8',
          minHeight: '100vh',
          maxWidth: 1100,
          margin: '0 auto',
          width: '100%',
        }}>
          {children}
        </Content>
      </Layout>

      <NewCourseModal open={modalOpen} onClose={() => setModalOpen(false)} onCreated={loadCourses} />
    </Layout>
  );
}
