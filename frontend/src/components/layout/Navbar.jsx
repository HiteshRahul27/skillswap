import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, Coins } from 'lucide-react';
import Logo from '../common/Logo';
import { useAuth } from '../../context/AuthContext';

const linkCls = ({ isActive }) => `rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'text-brand-700 bg-brand-50' : 'text-ink-soft hover:text-ink hover:bg-slate-100'}`;

export default function Navbar() {
  const { user, wallet, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const close = () => setOpen(false);
  const links = user
    ? [['/dashboard', 'Dashboard'], ['/marketplace', 'Explore'], ['/teach', 'Teach'], ['/bookings', 'Bookings'], ['/wallet', 'Wallet'], ...(user.role === 'admin' ? [['/admin', 'Admin']] : [])]
    : [['/marketplace', 'Explore Skills']];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Logo to={user ? '/dashboard' : '/'} />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            {links.map(([to, label]) => <NavLink key={to} to={to} className={linkCls}>{label}</NavLink>)}
          </nav>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <Link to="/wallet" className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700" aria-label="Available credits">
                <Coins className="h-4 w-4" aria-hidden="true" />{wallet ? wallet.available : '–'}
              </Link>
              <Link to="/profile" className="text-sm font-medium text-ink-soft hover:text-ink">{user.name.split(' ')[0]}</Link>
              <button className="btn-secondary btn-sm" onClick={async () => { await logout(); nav('/'); }}>Log out</button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost btn-sm">Log in</Link>
              <Link to="/signup" className="btn-primary btn-sm">Sign up</Link>
            </>
          )}
        </div>
        <button className="rounded-md p-2 text-ink md:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-menu" aria-label="Toggle menu">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>
      {open && (
        <div id="mobile-menu" className="border-t border-slate-100 bg-white px-4 pb-4 md:hidden">
          <nav className="flex flex-col gap-1 py-3" aria-label="Mobile">
            {links.map(([to, label]) => <NavLink key={to} to={to} className={linkCls} onClick={close}>{label}</NavLink>)}
            {user && <NavLink to="/profile" className={linkCls} onClick={close}>Profile</NavLink>}
          </nav>
          {user ? (
            <button className="btn-secondary w-full" onClick={async () => { close(); await logout(); nav('/'); }}>Log out</button>
          ) : (
            <div className="flex gap-2"><Link to="/login" onClick={close} className="btn-secondary flex-1">Log in</Link><Link to="/signup" onClick={close} className="btn-primary flex-1">Sign up</Link></div>
          )}
        </div>
      )}
    </header>
  );
}
