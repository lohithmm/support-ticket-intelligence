export default function StatsBar({ tickets }) {
  const stats = [
    {
      label: "Total Tickets",
      value: tickets.length,
      icon: "📊",
      color: "text-slate-200",
      accent: "from-slate-500/20 to-transparent",
      border: "border-slate-700",
    },
    {
      label: "Open",
      value: tickets.filter(t => t.status === "OPEN").length,
      icon: "🔵",
      color: "text-blue-300",
      accent: "from-blue-500/10 to-transparent",
      border: "border-blue-500/20",
    },
    {
      label: "In Progress",
      value: tickets.filter(t => t.status === "IN_PROGRESS").length,
      icon: "🟣",
      color: "text-purple-300",
      accent: "from-purple-500/10 to-transparent",
      border: "border-purple-500/20",
    },
    {
      label: "Critical",
      value: tickets.filter(t => t.priority === "CRITICAL").length,
      icon: "🔴",
      color: "text-red-300",
      accent: "from-red-500/10 to-transparent",
      border: "border-red-500/20",
    },
    {
      label: "SLA At Risk",
      value: tickets.filter(t => t.slaRisk === "RED" || t.slaRisk === "BREACHED" || t.slaRisk === "AMBER").length,
      icon: "⚠️",
      color: "text-yellow-300",
      accent: "from-yellow-500/10 to-transparent",
      border: "border-yellow-500/20",
    },
    {
      label: "Escalated",
      value: tickets.filter(t => t.escalated).length,
      icon: "🚨",
      color: "text-orange-300",
      accent: "from-orange-500/10 to-transparent",
      border: "border-orange-500/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
      {stats.map((s, i) => (
        <div
          key={i}
          className={`relative overflow-hidden rounded-xl bg-slate-900 border ${s.border} p-4 group hover:scale-[1.02] transition-transform duration-200`}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${s.accent} opacity-60`} />
          <div className="relative">
            <div className="flex items-center justify-between mb-3">
              <span className="text-base">{s.icon}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color} leading-none mb-1`}>{s.value}</p>
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
