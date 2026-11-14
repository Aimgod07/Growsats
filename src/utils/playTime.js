export function formatPlayTime(stats = {}) {
  const seconds = Math.max(0, Math.floor(stats.secondsPlayed ?? (stats.hoursPlayed || 0) * 3600));
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
}
