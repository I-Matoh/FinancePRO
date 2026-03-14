import { useWallet } from '../hooks/useWallet';
import { useTransactions } from '../hooks/useTransactions';

export default function DashboardPage() {
  const { data: wallet } = useWallet();
  const { data: transactions } = useTransactions();

  return (
    <div className="grid cols-2">
      <div className="card fade-up" style={{ padding: 24 }}>
        <h3 style={{ marginTop: 0 }}>Wallet</h3>
        <div style={{ fontSize: 36, fontWeight: 700 }}>
          ${wallet?.balance ?? '0.00'}
        </div>
        <div style={{ color: 'var(--muted)' }}>{wallet?.currency ?? 'USD'}</div>
      </div>
      <div className="card fade-up" style={{ padding: 24, animationDelay: '120ms' }}>
        <h3 style={{ marginTop: 0 }}>Risk posture</h3>
        <div className="grid" style={{ gap: 12 }}>
          <div className="tag">Velocity checks enabled</div>
          <div className="tag">Amount thresholds active</div>
          <div className="tag">New recipient watchlist</div>
        </div>
      </div>
      <div className="card fade-up" style={{ padding: 24, gridColumn: '1 / -1', animationDelay: '200ms' }}>
        <h3 style={{ marginTop: 0 }}>Recent activity</h3>
        <div className="grid">
          {(transactions || []).slice(0, 5).map((tx: any) => (
            <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{tx.status}</div>
                <div style={{ color: 'var(--muted)', fontSize: 12 }}>{new Date(tx.created_at).toLocaleString()}</div>
              </div>
              <div style={{ fontWeight: 600 }}>${tx.amount}</div>
            </div>
          ))}
          {(!transactions || transactions.length === 0) && (
            <div style={{ color: 'var(--muted)' }}>No transactions yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
