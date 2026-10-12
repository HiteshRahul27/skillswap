import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-page flex min-h-[60vh] flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold text-brand-700">404</p>
      <h1 className="mt-2 text-3xl font-bold">We couldn't find that page</h1>
      <p className="mt-2 text-ink-soft">The link may be broken or the page may have moved.</p>
      <div className="mt-6 flex gap-3"><Link to="/" className="btn-primary">Go home</Link><Link to="/marketplace" className="btn-secondary">Explore Skills</Link></div>
    </div>
  );
}
