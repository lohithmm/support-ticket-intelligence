export function PriorityBadge({ priority }) {
  const styles = {
    CRITICAL: "bg-red-500/10 text-red-400 border border-red-500/30",
    HIGH:     "bg-orange-500/10 text-orange-400 border border-orange-500/30",
    MEDIUM:   "bg-yellow-500/10 text-yellow-400 border border-yellow-500/30",
    LOW:      "bg-slate-500/10 text-slate-400 border border-slate-500/30",
  };
  const dots = {
    CRITICAL: "bg-red-400",
    HIGH:     "bg-orange-400",
    MEDIUM:   "bg-yellow-400",
    LOW:      "bg-slate-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-md ${styles[priority] || styles.LOW}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[priority] || dots.LOW}`} />
      {priority}
    </span>
  );
}

export function StatusBadge({ status }) {
  const styles = {
    OPEN:        "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    IN_PROGRESS: "bg-purple-500/10 text-purple-400 border border-purple-500/20",
    RESOLVED:    "bg-green-500/10 text-green-400 border border-green-500/20",
    CLOSED:      "bg-slate-500/10 text-slate-400 border border-slate-500/20",
  };
  const dots = {
    OPEN:        "bg-blue-400 animate-pulse",
    IN_PROGRESS: "bg-purple-400 animate-pulse",
    RESOLVED:    "bg-green-400",
    CLOSED:      "bg-slate-400",
  };
  const label = status?.replace("_", " ") || status;
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md ${styles[status] || styles.CLOSED}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] || dots.CLOSED}`} />
      {label}
    </span>
  );
}

export function SlaBadge({ slaRisk, minutesUntilSla }) {
  if (!slaRisk || slaRisk === "GREEN") return null;

  const styles = {
    BREACHED: "bg-red-500/20 text-red-300 border border-red-500/40",
    RED:      "bg-red-500/10 text-red-400 border border-red-500/20",
    AMBER:    "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  };

  const formatTime = (mins) => {
    if (mins < 0) return `Breached ${Math.abs(Math.round(mins))}m ago`;
    if (mins < 60) return `${Math.round(mins)}m left`;
    return `${Math.round(mins / 60)}h left`;
  };

  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-md ${styles[slaRisk]}`}>
      🕐 {formatTime(minutesUntilSla)}
    </span>
  );
}

export function CategoryBadge({ category }) {
  const icons = {
    BILLING:     "💳",
    TECHNICAL:   "⚙️",
    ACCESS:      "🔐",
    PERFORMANCE: "⚡",
    OTHER:       "📋",
  };
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-md border border-slate-700">
      {icons[category] || "📋"} {category}
    </span>
  );
}
