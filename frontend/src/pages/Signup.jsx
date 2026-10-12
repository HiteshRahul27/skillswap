import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Field from '../components/common/Field';
import Logo from '../components/common/Logo';
import { Spinner } from '../components/common/Spinner';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

function check(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Name must be at least 2 characters';
  if (!/^\S+@\S+\.\S+$/.test(f.email.trim())) e.email = 'Enter a valid email address';
  if (f.password.length < 8) e.password = 'Password must be at least 8 characters';
  else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) e.password = 'Password needs at least one letter and one number';
  if (f.confirmPassword !== f.password) e.confirmPassword = 'Passwords do not match';
  return e;
}

export default function Signup() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const { register } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    const local = check(form);
    setErrors(local); setFormError('');
    if (Object.keys(local).length) return;
    setBusy(true);
    try {
      await register({ ...form, email: form.email.trim(), name: form.name.trim() });
      toast.success('Welcome to SkillSwap. Your welcome credits are ready.');
      nav('/dashboard', { replace: true });
    } catch (err) {
      if (err.fields && Object.keys(err.fields).length) setErrors(err.fields);
      else setFormError(err.message);
    } finally { setBusy(false); }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="card p-6 sm:p-8">
          <h1 className="text-xl font-bold">Create your account</h1>
          <p className="mt-1 text-sm text-ink-soft">Join SkillSwap and start with welcome credits.</p>
          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            {formError && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
            <Field label="Full name" name="name" autoComplete="name" value={form.name} onChange={set('name')} error={errors.name} />
            <Field label="Email" type="email" name="email" autoComplete="email" value={form.email} onChange={set('email')} error={errors.email} />
            <Field label="Password" type="password" name="password" autoComplete="new-password" value={form.password} onChange={set('password')} error={errors.password} hint="At least 8 characters, with a letter and a number." />
            <Field label="Confirm password" type="password" name="confirmPassword" autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
            <button className="btn-primary w-full" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Create account</button>
          </form>
          <p className="mt-5 text-center text-sm text-ink-soft">Already have an account? <Link to="/login" className="font-semibold text-brand-700 hover:underline">Log in</Link></p>
        </div>
      </div>
    </div>
  );
}
