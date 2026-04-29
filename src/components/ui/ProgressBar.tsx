interface ProgressBarProps {
  current: number;
  goal: number;
  label?: string;
  color?: string; // e.g. 'bg-primary' or 'bg-tertiary'
}

export function ProgressBar({ current, goal, label = "Goal Progress", color = "bg-primary" }: ProgressBarProps) {
  const percent = Math.min(100, Math.round((current / (goal || 1)) * 100));

  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs font-semibold text-secondary mb-1.5">
        <span>{label}</span>
        <span>{percent}%</span>
      </div>
      <div className="h-1.5 w-full bg-surface-variant rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${percent}%` }}></div>
      </div>
    </div>
  );
}
