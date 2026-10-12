import { Link } from 'react-router-dom';
import { CalendarClock, Coins } from 'lucide-react';
import StatusBadge from '../common/StatusBadge';
import { fmtDateTime, fmtTime } from '../../utils/format';

const NOTE = {
  pending: (role) => (role === 'teacher' ? 'Waiting for your response. Credits are held until you decide.' : 'Waiting for the teacher. Your credits are reserved.'),
  confirmed: () => 'Confirmed. Credits are reserved until the session is completed.',
  completed: (role) => (role === 'teacher' ? 'Completed. Credits were added to your balance.' : 'Completed. Credits were paid to the teacher.'),
  cancelled: (role) => (role === 'learner' ? 'Cancelled. Reserved credits were refunded.' : 'Cancelled. The learner was refunded.'),
  rejected: (role) => (role === 'learner' ? 'Declined. Reserved credits were refunded.' : 'Declined. The learner was refunded.'),
};

export default function BookingCard({ booking, role, onAction, onReview }) {
  const ended = new Date(booking.endsAt) <= new Date();
  const other = role === 'teacher' ? booking.learner : booking.teacher;
  const s = booking.status;
  return (
    <article className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold text-ink">{booking.skill ? <Link to={`/skills/${booking.skill}`} className="hover:text-brand-700">{booking.skillTitle}</Link> : booking.skillTitle}</h3>
          <p className="mt-1 text-sm text-ink-soft">{role === 'teacher' ? 'Learner' : 'Teacher'}: <Link to={`/u/${other.id}`} className="font-medium text-ink hover:text-brand-700">{other.name}</Link></p>
        </div>
        <StatusBadge status={s} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink-soft">
        <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4" aria-hidden="true" />{fmtDateTime(booking.startsAt)} – {fmtTime(booking.endsAt)}</span>
        <span className="inline-flex items-center gap-1.5"><Coins className="h-4 w-4" aria-hidden="true" />{booking.credits} credit{booking.credits > 1 ? 's' : ''}</span>
      </div>
      {booking.note && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-ink-soft">“{booking.note}”</p>}
      <p className="mt-3 text-xs text-ink-mute">{NOTE[s](role)}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {role === 'teacher' && s === 'pending' && (<>
          <button className="btn-primary btn-sm" onClick={() => onAction('confirm', booking)}>Confirm</button>
          <button className="btn-secondary btn-sm" onClick={() => onAction('reject', booking)}>Decline</button>
        </>)}
        {role === 'teacher' && s === 'confirmed' && (
          <button className="btn-primary btn-sm" disabled={!ended} title={ended ? undefined : 'Available after the session ends'} onClick={() => onAction('complete', booking)}>Mark completed</button>
        )}
        {(s === 'pending' || s === 'confirmed') && (
          <button className="btn-secondary btn-sm" onClick={() => onAction('cancel', booking)}>Cancel booking</button>
        )}
        {role === 'learner' && s === 'completed' && (
          <button className="btn-secondary btn-sm" onClick={() => onReview(booking)}>Leave a review</button>
        )}
      </div>
    </article>
  );
}
