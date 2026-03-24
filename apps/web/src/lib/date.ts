export const formatRelativeTime = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  switch (true) {
    case diffMinutes < 1:
      return "Just now";
    case diffMinutes < 60:
      return `${diffMinutes}m ago`;
    case diffHours < 24:
      return `${diffHours}h ago`;
    case diffDays < 7:
      return `${diffDays}d ago`;
    default:
      return date.toLocaleDateString();
  }
};

export const formatElapsed = (ms: number) => {
  const seconds = ms / 1000;
  return seconds < 60
    ? `${seconds.toFixed(1)}s`
    : `${Math.floor(seconds / 60)}m ${(seconds % 60).toFixed(0)}s`;
};
