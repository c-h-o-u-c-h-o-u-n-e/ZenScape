export function getEstDate(): Date {
  const now = new Date();
  const estTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  return estTime;
}

export function getEstDateString(): string {
  return getEstDate().toISOString().split('T')[0];
}
