import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { JoinPage } from './pages/JoinPage';
import { QueuePage } from './pages/QueuePage';
import { DisplayPage } from './pages/DisplayPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/join/:organizationId" element={<JoinPage />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/queue/:ticketId" element={<QueuePage />} />
        <Route path="/display/:organizationId" element={<DisplayPage />} />
        <Route path="/display" element={<DisplayPage />} />
        <Route path="*" element={<JoinPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
