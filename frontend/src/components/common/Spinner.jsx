import { Loader2 } from 'lucide-react';

export const Spinner = ({ className = 'h-5 w-5' }) => <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />;

export const PageLoader = ({ label = 'Loading' }) => (
  <div className="flex min-h-[40vh] items-center justify-center text-ink-mute" role="status">
    <Spinner className="h-6 w-6" /><span className="ml-3 text-sm">{label}…</span>
  </div>
);
