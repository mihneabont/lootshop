const TZ = 'Europe/Bucharest';

const dateTime = new Intl.DateTimeFormat('ro-RO', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: TZ,
});

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));

export const formatPrice = (ron: number) =>
  `${Number(ron).toLocaleString('ro-RO', { maximumFractionDigits: 2 })} lei`;

export type Phase = 'draft' | 'upcoming' | 'open' | 'closed' | 'drawn';

// What visitors see, combining the stored status with the clock.
export function phaseOf(g: { status: string; opens_at: string; closes_at: string }, now = Date.now()): Phase {
  if (g.status === 'draft' || g.status === 'drawn' || g.status === 'closed') return g.status as Phase;
  if (now < new Date(g.opens_at).getTime()) return 'upcoming';
  if (now >= new Date(g.closes_at).getTime()) return 'closed';
  return 'open';
}

export const phaseLabel: Record<Phase, string> = {
  draft: 'Ciornă',
  upcoming: 'În curând',
  open: 'Live',
  closed: 'Înscrieri închise',
  drawn: 'Câștigător ales',
};

// Converts between <input type="datetime-local"> values and ISO strings,
// treating the input as Romanian local time.
export function toLocalInput(iso: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const get = (t: string) => parts.find((p) => p.type === t)!.value;
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;
}

export function fromLocalInput(value: string) {
  // Find the Bucharest offset at that moment and apply it.
  const guess = new Date(`${value}:00Z`);
  const local = new Date(guess.toLocaleString('en-US', { timeZone: TZ }));
  const utc = new Date(guess.toLocaleString('en-US', { timeZone: 'UTC' }));
  return new Date(guess.getTime() - (local.getTime() - utc.getTime())).toISOString();
}
