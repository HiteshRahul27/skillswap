import { useState } from 'react';
import { Link } from 'react-router-dom';
import Field from '../components/common/Field';
import { Spinner } from '../components/common/Spinner';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Profile() {
  const { user, updateUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: user.name, bio: user.bio || '', skillsWanted: (user.skillsWanted || []).join(', ') });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErrors({});
    try {
      const { data } = await api.patch('/users/me', { name: form.name.trim(), bio: form.bio.trim(), skillsWanted: form.skillsWanted.split(',').map((s) => s.trim()).filter(Boolean) });
      updateUser(data.user); toast.success('Profile saved.');
    } catch (err) { Object.keys(err.fields || {}).length ? setErrors(err.fields) : toast.error(err.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="container-page max-w-2xl py-8">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Your profile</h1><Link to={`/u/${user.id}`} className="text-sm font-semibold text-brand-700 hover:underline">View public profile</Link></div>
      <form onSubmit={submit} noValidate className="card mt-5 space-y-5 p-6">
        <Field label="Display name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} error={errors.name} />
        <div><label className="label">Email</label><p className="input bg-slate-50 text-ink-soft">{user.email}</p></div>
        <Field as="textarea" rows={4} label="Short bio" maxLength={500} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} error={errors.bio} hint="Tell other students about your experience." />
        <Field label="Skills you want to learn" value={form.skillsWanted} onChange={(e) => setForm({ ...form, skillsWanted: e.target.value })} error={errors.skillsWanted} hint="Separate with commas, e.g. Guitar, Statistics, Figma" />
        <div className="flex justify-end"><button className="btn-primary" disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Save profile</button></div>
      </form>
    </div>
  );
}
