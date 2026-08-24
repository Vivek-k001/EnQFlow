
import { useAuthStore } from './stores/authStore';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';

function App() {
  const token = useAuthStore(state => state.token);

  if (!token) {
    return <LoginPage />;
  }

  return <Dashboard />;
}

export default App;
