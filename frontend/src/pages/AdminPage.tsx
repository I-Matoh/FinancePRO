import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function AdminPage() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    api.get('/admin/fraud-alerts').then((res) => setAlerts(res.data.alerts || [])).catch(() => null);
    api.get('/admin/audit-logs').then((res) => setLogs(res.data.logs || [])).catch(() => null);
    api.get('/admin/transactions').then((res) => setTransactions(res.data.transactions || [])).catch(() => null);
  }, []);

  return (
    <div className="grid cols-3">
      <div className="card fade-up" style={{ padding: 20 }}>
        <h3 style={{ marginTop: 0 }}>Fraud alerts</h3>
        <div className="grid">
          {alerts.map((a) => (
            <div key={a.id}>
              <div style={{ fontWeight: 600 }}>{a.rule}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>{a.severity}</div>
            </div>
          ))}
          {alerts.length === 0 && <div style={{ color: 'var(--muted)' }}>No alerts.</div>}
        </div>
      </div>
      <div className="card fade-up" style={{ padding: 20, animationDelay: '120ms' }}>
        <h3 style={{ marginTop: 0 }}>Audit logs</h3>
        <div className="grid">
          {logs.slice(0, 6).map((l) => (
            <div key={l.id}>
              <div style={{ fontWeight: 600 }}>{l.action}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>{l.created_at}</div>
            </div>
          ))}
          {logs.length === 0 && <div style={{ color: 'var(--muted)' }}>No logs.</div>}
        </div>
      </div>
      <div className="card fade-up" style={{ padding: 20, animationDelay: '220ms' }}>
        <h3 style={{ marginTop: 0 }}>Recent transactions</h3>
        <div className="grid">
          {transactions.slice(0, 6).map((t) => (
            <div key={t.id}>
              <div style={{ fontWeight: 600 }}>${t.amount}</div>
              <div style={{ color: 'var(--muted)', fontSize: 12 }}>{t.status}</div>
            </div>
          ))}
          {transactions.length === 0 && <div style={{ color: 'var(--muted)' }}>No transactions.</div>}
        </div>
      </div>
    </div>
  );
}
