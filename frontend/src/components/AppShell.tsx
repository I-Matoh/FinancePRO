import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function AppShell() {
  const { user, logout } = useAuth();

  return (
    <div className="container">
      <nav className="nav">
        <div className="brand">SecurePay</div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <NavLink to="/" style={{ opacity: 0.8 }}>
            Dashboard
          </NavLink>
          <NavLink to="/transfer" style={{ opacity: 0.8 }}>
            Transfer
          </NavLink>
          <NavLink to="/transactions" style={{ opacity: 0.8 }}>
            Activity
          </NavLink>
          {user?.role === 'ADMIN' || user?.role === 'AUDITOR' ? (
            <NavLink to="/admin" style={{ opacity: 0.8 }}>
              Admin
            </NavLink>
          ) : null}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user ? (
            <>
              <span className="tag">{user.email}</span>
              <button className="btn secondary" onClick={logout}>
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className="btn secondary">
                Login
              </NavLink>
              <NavLink to="/register" className="btn">
                Get Started
              </NavLink>
            </>
          )}
        </div>
      </nav>
      <Outlet />
    </div>
  );
}
