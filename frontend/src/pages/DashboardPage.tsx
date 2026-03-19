import { useWallet } from '../hooks/useWallet';
import { useTransactions } from '../hooks/useTransactions';

const MAX_PREVIEW_TRANSACTIONS = 5;

export default function DashboardPage() {
  const { data: wallet } = useWallet();
  const { data: transactions } = useTransactions();

  const transactionsList = transactions ?? [];
  const latestTransactions = transactionsList.slice(0, MAX_PREVIEW_TRANSACTIONS);
  const currency = wallet?.currency ?? 'USD';
  const wholeFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  });

  const totalVolume = transactionsList.reduce(
    (sum, tx: any) => sum + Number(tx?.amount ?? 0),
    0
  );
  const averageTransaction = latestTransactions.length
    ? totalVolume / latestTransactions.length
    : 0;
  const averageFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  });

  const flaggedCount = transactionsList.filter((tx: any) => {
    const status = String(tx?.status ?? '').toUpperCase();
    return status.includes('FLAG') || status.includes('SUSPICIOUS') || status.includes('REVIEW');
  }).length;

  const insightStats = [
    {
      label: 'Live transfers',
      value: `${transactionsList.length}`,
      hint: `${latestTransactions.length} previewed`,
    },
    {
      label: 'Avg. transfer',
      value: averageFormatter.format(averageTransaction || 0),
      hint: latestTransactions.length ? 'Rolling five entries' : 'Awaiting first transfer',
    },
    {
      label: 'Flagged checks',
      value: `${flaggedCount}`,
      hint: 'Under active monitoring',
    },
  ];

  const activityLabel = transactionsList.length
    ? `${Math.min(latestTransactions.length, transactionsList.length)} of ${transactionsList.length} total transfers`
    : 'No transactions yet';

  const flaggedPercentage = transactionsList.length
    ? Math.min(100, Math.round((flaggedCount / transactionsList.length) * 100))
    : 0;

  return (
    <main className="space-y-6 pb-8">
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <section
          aria-labelledby="wallet-summary-heading"
          className="rounded-2xl bg-white/80 p-6 shadow-lg ring-1 ring-slate-900/5 backdrop-blur"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p
                className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-500"
                id="wallet-summary-heading"
              >
                Wallet summary
              </p>
              <h2 className="mt-2 text-3xl font-semibold text-slate-900">
                {wholeFormatter.format(wallet?.balance ?? 0)}
              </h2>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase text-emerald-700">
              {currency}
            </span>
          </div>
          <p className="mt-3 text-sm text-slate-500" aria-live="polite">
            {wallet?.last_reconciled
              ? `Last synced on ${new Date(wallet.last_reconciled).toLocaleDateString()}`
              : 'Sync pending'}
          </p>
        </section>

        <section
          aria-labelledby="insight-card-title"
          className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 p-6 text-white shadow-2xl ring-1 ring-white/20"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.4em] text-emerald-300/80">
                Security pulse
              </p>
              <h3 id="insight-card-title" className="mt-3 text-2xl font-semibold tracking-tight">
                Guardrails active
              </h3>
              <p className="mt-2 text-sm text-emerald-100/70">
                {latestTransactions.length
                  ? `Processing ${latestTransactions.length} of ${transactionsList.length} recent transfers.`
                  : 'Waiting for the first transfer to populate metrics.'}
              </p>
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/10 px-4 py-1.5 text-sm font-semibold text-white transition hover:border-white hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-white"
              aria-label="Open guardrail settings"
            >
              Review
            </button>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2">
            {insightStats.map(({ label, value, hint }) => (
              <div key={label} className="rounded-2xl bg-white/5 p-4">
                <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200/80">
                  {label}
                </dt>
                <dd className="mt-2 text-2xl font-semibold" aria-live="polite">
                  {value}
                </dd>
                <p className="mt-1 text-xs text-emerald-100/80">{hint}</p>
              </div>
            ))}
          </dl>

          <div className="mt-6 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300/80">
              Flagged signal
            </p>
            <div className="rounded-full bg-white/10 p-0.5">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-200 transition-all"
                style={{ width: `${flaggedPercentage}%` }}
              />
            </div>
            <p className="text-xs text-emerald-100/70">
              Ratio of flagged transfers (updated in real time)
            </p>
          </div>
        </section>
      </div>

      <section className="rounded-2xl bg-white/80 p-6 shadow-lg ring-1 ring-slate-900/5 backdrop-blur">
        <h3 className="text-xl font-semibold text-slate-900">Risk posture</h3>
        <div className="mt-4 flex flex-wrap gap-3">
          {[
            'Velocity checks enabled',
            'Amount thresholds active',
            'New recipient watchlist',
            'Device fingerprinting',
          ].map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700"
            >
              {tag}
            </span>
          ))}
        </div>
      </section>

      <section
        aria-labelledby="recent-activity-heading"
        className="rounded-2xl bg-white/80 p-6 shadow-lg ring-1 ring-slate-900/5 backdrop-blur"
      >
        <div className="flex flex-col gap-1 text-slate-500 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 id="recent-activity-heading" className="text-xl font-semibold text-slate-900">
              Recent activity
            </h3>
            <p className="text-sm text-slate-500">{activityLabel}</p>
          </div>
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Live feed</span>
        </div>

        <ol className="mt-5 divide-y divide-slate-200">
          {latestTransactions.length > 0 ? (
            latestTransactions.map((tx: any) => (
              <li
                key={tx.id}
                className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{tx.status}</p>
                  <p className="text-xs text-slate-500">{new Date(tx.created_at).toLocaleString()}</p>
                </div>
                <p className="text-lg font-semibold text-slate-900">
                  {wholeFormatter.format(Number(tx.amount ?? 0))}
                </p>
              </li>
            ))
          ) : (
            <li className="py-4 text-sm text-slate-500">No transactions yet.</li>
          )}
        </ol>
      </section>
    </main>
  );
}
