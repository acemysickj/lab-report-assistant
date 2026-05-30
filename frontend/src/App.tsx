import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/Layout';
import Home from './pages/Home';
import ExperimentSetup from './pages/ExperimentSetup';
import PreLabFlow from './pages/PreLabFlow';
import PostLabFlow from './pages/PostLabFlow';
import ReportPreview from './pages/ReportPreview';
import ReportHistory from './pages/ReportHistory';

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/setup/:courseId/:experimentId" element={<ExperimentSetup />} />
        <Route path="/prelab/:courseId/:experimentId" element={<PreLabFlow />} />
        <Route path="/postlab/:courseId/:experimentId" element={<PostLabFlow />} />
        <Route path="/preview/:reportId" element={<ReportPreview />} />
        <Route path="/history" element={<ReportHistory />} />
      </Routes>
    </AppLayout>
  );
}
