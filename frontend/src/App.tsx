import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router-dom';
import { Spin } from 'antd';
import AppLayout from './components/Layout';

// Page-level code splitting
const Home = lazy(() => import('./pages/Home'));
const ExperimentSetup = lazy(() => import('./pages/ExperimentSetup'));
const PreLabFlow = lazy(() => import('./pages/PreLabFlow'));
const PostLabFlow = lazy(() => import('./pages/PostLabFlow'));
const ReportPreview = lazy(() => import('./pages/ReportPreview'));
const ReportHistory = lazy(() => import('./pages/ReportHistory'));

function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '80px 0',
    }}>
      <Spin size="large" />
    </div>
  );
}

export default function App() {
  return (
    <AppLayout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/setup/:courseId/:experimentId" element={<ExperimentSetup />} />
          <Route path="/prelab/:courseId/:experimentId" element={<PreLabFlow />} />
          <Route path="/postlab/:courseId/:experimentId" element={<PostLabFlow />} />
          <Route path="/preview/:reportId" element={<ReportPreview />} />
          <Route path="/history" element={<ReportHistory />} />
        </Routes>
      </Suspense>
    </AppLayout>
  );
}
