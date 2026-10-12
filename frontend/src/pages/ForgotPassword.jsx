import { useState } from 'react';
import { Link } from 'react-router-dom';
import Field from '../components/common/Field';
import Logo from '../components/common/Logo';
import { Spinner } from '../components/common/Spinner';
import { api } from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Enter a valid email address');
    setBusy(true); setError('');
    try { const { data } = await api.post('/auth/forgot-password', { email: email.trim() }); setResult(data); }
    catch (err) { setError(err.fields?.email || err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold">Reset your password</h1>
          {result ? (
            <div className="mt-4 space-y-4" role="status">
              <p className="text-sm text-ink-soft">{result.message}</p>
              {result.devResetUrl && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                  <p className="font-semibold text-amber-900">Development only</p>
                  <p className="mt-1 text-amber-900">No email service is configured, so nothing was emailed.</p>
                  <a href={result.devResetUrl} className="mt-2 inline-block font-semibold text-brand-700 underline">Open reset link</a>
                </div>
              )}
              <Link to="/login" className="btn-secondary w-full">Back to log in</Link>
            </div>
          ) : (
            <>
              <p className="mt-1 text-sm text-ink-soft">Enter your email and we will send a reset link if an account exists.</p>
              <form onSubmit={submit} noValidate className="mt-6 space-y-4">
                <Field label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} error={error} />
                <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Send reset link</button>
              </form>
              <p className="mt-5 text-center text-sm"><Link to="/login" className="font-semibold text-brand-700 hover:underline">Back to log in</Link></p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
