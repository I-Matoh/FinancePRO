import { useTransactions } from '../hooks/useTransactions';

export default function TransactionsPage() {
  const { data: transactions } = useTransactions();

  return (
    <div className="card fade-up" style={{ padding: 24 }}>
      <h2 style={{ marginTop: 0 }}>Transaction history</h2>
      <div className="grid">
        {(transactions || []).map((tx: any) => (
          <div key={tx.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
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
  );
}
