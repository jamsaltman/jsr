interface HealingStatusProps {
  message: string | null;
  kind: 'healing' | 'error';
}

export default function HealingStatus({ kind, message }: HealingStatusProps) {
  if (!message) {
    return null;
  }

  return (
    <div aria-live="polite" className={`inline-status ${kind === 'error' ? 'error' : ''}`} role="status">
      {kind === 'healing' ? <span className="pulse-dot" aria-hidden="true" /> : null}
      <span>{message}</span>
    </div>
  );
}
