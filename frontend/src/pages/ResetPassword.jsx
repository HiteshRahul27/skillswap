import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Field from '../components/common/Field';
import Logo from '../components/common/Logo';
import { Spinner } from '../components/common/Spinner';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();
  const toast = useToast();

  async function submit(e) {
    e.preventDefault();
    const local = {};
    if (form.password.length < 8) local.password = 'Password must be at least 8 characters';
    else if (!/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) local.password = 'Password needs at least one letter and one number';
    if (form.confirm !== form.password) local.confirm = 'Passwords do not match';
    setErrors(local); setFormError('');
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      toast.success('Password updated. You can now log in.');
      nav('/login', { replace: true });
    } catch (err) { err.fields?.password ? setErrors({ password: err.fields.password }) : setFormError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold">Choose a new password</h1>
          {!token ? (
            <div className="mt-4 space-y-4"><p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">This reset link is missing its token.</p><Link to="/forgot-password" className="btn-primary w-full">Request a new link</Link></div>
          ) : (
            <form onSubmit={submit} noValidate className="mt-6 space-y-4">
              {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError} <Link to="/forgot-password" className="font-semibold underline">Request a new link</Link></p>}
              <Field label="New password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} error={errors.password} hint="At least 8 characters, with a letter and a number." />
              <Field label="Confirm new password" type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={errors.confirm} />
              <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Update password</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
