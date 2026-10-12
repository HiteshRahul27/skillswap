import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Field from '../components/common/Field';
import Logo from '../components/common/Logo';
import { Spinner } from '../components/common/Spinner';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const from = loc.state?.from || '/dashboard';
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const local = {};
    if (!form.email.trim()) local.email = 'Enter your email';
    if (!form.password) local.password = 'Enter your password';
    setErrors(local); setFormError('');
    if (Object.keys(local).length) return;
    setBusy(true);
    try { await login({ email: form.email.trim(), password: form.password }); nav(from, { replace: true }); }
    catch (err) { err.fields && Object.keys(err.fields).length ? setErrors(err.fields) : setFormError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-soft">Log in to manage your sessions and credits.</p>
          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
            <Field label="Email" type="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
            <Field label="Password" type="password" autoComplete="current-password" value={form.password} onChange={set('password')} error={errors.password} />
            <div className="text-right"><Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:underline">Forgot password?</Link></div>
            <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Log in</button>
          </form>
          <p className="mt-5 text-center text-sm text-ink-soft">New to SkillSwap? <Link to="/signup" className="font-semibold text-brand-700 hover:underline">Create an account</Link></p>
        </div>
      </div>
    </div>
  );
}
