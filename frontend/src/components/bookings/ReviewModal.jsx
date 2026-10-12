import { useState } from 'react';
import Modal from '../common/Modal';
import { StarPicker } from '../common/Stars';
import { Spinner } from '../common/Spinner';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';

export default function ReviewModal({ booking, onClose, onDone }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  async function submit() {
    if (!rating) return setError('Choose a rating from 1 to 5.');
    setBusy(true); setError('');
    try {
      await api.post('/reviews', { booking: booking.id, rating, comment: comment || undefined });
      toast.success('Thanks. Your review has been posted.');
      onDone();
    } catch (e) { setError(e.fields?.comment || e.message); }
    finally { setBusy(false); }
  }

  return (
    <Modal open title={`Review: ${booking.skillTitle}`} onClose={onClose}
      footer={<><button className="btn-secondary" onClick={onClose} disabled={busy}>Cancel</button><button className="btn-primary" onClick={submit} disabled={busy}>{busy && <Spinner className="h-4 w-4" />}Post review</button></>}>
      <StarPicker value={rating} onChange={setRating} />
      <label htmlFor="review-comment" className="label mt-4">Comment (optional)</label>
      <textarea id="review-comment" className="input" rows={4} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="What went well? What could be better?" />
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
    </Modal>
  );
}
