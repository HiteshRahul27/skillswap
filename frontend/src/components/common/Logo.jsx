import { Link } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';

export default function Logo({ to = '/' }) {
  return (
    <Link to={to} className="flex items-center gap-2 font-bold text-ink" aria-label="SkillSwap home">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white"><ArrowLeftRight className="h-4 w-4" aria-hidden="true" /></span>
      <span className="text-lg">SkillSwap</span>
    </Link>
  );
}
