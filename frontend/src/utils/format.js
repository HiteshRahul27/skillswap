export const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtTime = (d) => new Date(d).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
export const fmtDateTime = (d) => `${fmtDate(d)}, ${fmtTime(d)}`;
export const fmtFull = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
export const plural = (n, one, many = one + 's') => `${n} ${n === 1 ? one : many}`;
export const CATEGORIES = ['Programming', 'Design', 'Languages', 'Mathematics', 'Science', 'Music', 'Business', 'Writing', 'Study Skills', 'Other'];
export const LEVELS = ['Beginner', 'Intermediate', 'Advanced'];
// value for <input type="datetime-local"> in local time
export const toLocalInput = (d) => { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); };
