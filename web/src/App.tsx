import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { JoinPage } from './pages/JoinPage';
import { QueuePage } from './pages/QueuePage';
import { DisplayPage } from './pages/DisplayPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/join/:organizationId" element={<JoinPage />} />
        <Route path="/queue/:ticketId" element={<QueuePage />} />
        <Route path="/display/:organizationId" element={<DisplayPage />} />
        {/* Default route for demo purposes */}
        <Route path="*" element={<Navigate to="/join/ac003c02-db2a-4498-93e6-7a02cb7341d9" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
