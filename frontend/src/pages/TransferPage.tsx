import { useState } from 'react';
import api from '../lib/api';

export default function TransferPage() {
  const [recipientEmail, setRecipientEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('');
    try {
      const res = await api.post('/transfer', { recipientEmail, amount: Number(amount) });
      if (res.data.fraudAlerts?.length) {
        setStatus('Transfer queued for review. Fraud alerts raised.');
      } else {
        setStatus('Transfer completed.');
      }
    } catch (err) {
      setStatus('Transfer failed.');
    }
  }

  return (
    <div className="card fade-up" style={{ padding: 24, maxWidth: 520 }}>
      <h2 style={{ marginTop: 0 }}>Send funds</h2>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <input
          className="input"
          placeholder="Recipient email"
          type="email"
          value={recipientEmail}
          onChange={(e) => setRecipientEmail(e.target.value)}
        />
        <input
          className="input"
          placeholder="Amount"
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <button className="btn" type="submit">Transfer</button>
        {status ? <div className="tag">{status}</div> : null}
      </form>
    </div>
  );
}
