import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

export default function RegisterPage() {
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await register(email, password);
    } catch (err) {
      setError('Unable to register');
    }
  }

  return (
    <div className="card fade-up" style={{ padding: 28, maxWidth: 420, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0 }}>Create your wallet</h2>
      <p style={{ color: 'var(--muted)' }}>Instant onboarding with fraud-aware guardrails.</p>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
        <input
          className="input"
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="input"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <div className="tag" style={{ background: '#fee2e2', color: '#b91c1c' }}>{error}</div> : null}
        <button className="btn" type="submit">Create account</button>
      </form>
    </div>
  );
}
