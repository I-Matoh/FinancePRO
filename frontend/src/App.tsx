import { Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/AppShell';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import TransferPage from './pages/TransferPage';
import TransactionsPage from './pages/TransactionsPage';
import AdminPage from './pages/AdminPage';
import { useAuth } from './hooks/useAuth';

export default function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={user ? <DashboardPage /> : <Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/transfer"
          element={user ? <TransferPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/transactions"
          element={user ? <TransactionsPage /> : <Navigate to="/login" replace />}
        />
        <Route
          path="/admin"
          element={user?.role === 'ADMIN' || user?.role === 'AUDITOR' ? <AdminPage /> : <Navigate to="/" replace />}
        />
      </Route>
    </Routes>
  );
}
