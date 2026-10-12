import { Link } from 'react-router-dom';
import Logo from '../common/Logo';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-white">
      <div className="container-page flex flex-col gap-6 py-10 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm text-ink-soft">Learn Together. Grow Together. A student community that exchanges knowledge, not money.</p>
        </div>
        <div className="flex gap-12 text-sm">
          <div>
            <h3 className="font-semibold text-ink">Platform</h3>
            <ul className="mt-3 space-y-2 text-ink-soft">
              <li><Link className="hover:text-ink" to="/marketplace">Explore Skills</Link></li>
              <li><Link className="hover:text-ink" to="/teach">Share Your Skills</Link></li>
              <li><Link className="hover:text-ink" to="/#how-it-works">How it works</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="font-semibold text-ink">Account</h3>
            <ul className="mt-3 space-y-2 text-ink-soft">
              <li><Link className="hover:text-ink" to="/login">Log in</Link></li>
              <li><Link className="hover:text-ink" to="/signup">Sign up</Link></li>
              <li><Link className="hover:text-ink" to="/forgot-password">Reset password</Link></li>
            </ul>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 py-4 text-center text-xs text-ink-mute">© {new Date().getFullYear()} SkillSwap. Credits have no cash value.</div>
    </footer>
  );
}
