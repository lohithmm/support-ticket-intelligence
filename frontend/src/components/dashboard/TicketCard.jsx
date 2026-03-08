import { PriorityBadge, StatusBadge, SlaBadge, CategoryBadge } from "../ui/Badge";

const PRIORITY_GLOW = {
  CRITICAL: "hover:border-red-500/40 hover:shadow-red-500/5",
  HIGH:     "hover:border-orange-500/40 hover:shadow-orange-500/5",
  MEDIUM:   "hover:border-yellow-500/40 hover:shadow-yellow-500/5",
  LOW:      "hover:border-slate-500/40 hover:shadow-slate-500/5",
};

const PRIORITY_TOP = {
  CRITICAL: "bg-red-500",
  HIGH:     "bg-orange-500",
  MEDIUM:   "bg-yellow-500",
  LOW:      "bg-slate-600",
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function TicketCard({ ticket, onClick }) {
  const glow = PRIORITY_GLOW[ticket.priority] || PRIORITY_GLOW.LOW;
  const topBar = PRIORITY_TOP[ticket.priority] || PRIORITY_TOP.LOW;

  return (
    <div
      onClick={() => onClick(ticket)}
      className={`relative group cursor-pointer rounded-xl bg-slate-900 border border-slate-800 overflow-hidden transition-all duration-200 hover:shadow-xl ${glow} hover:-translate-y-0.5`}
    >
      {/* Priority top bar */}
      <div className={`h-0.5 w-full ${topBar} opacity-60 group-hover:opacity-100 transition-opacity`} />

      <div className="p-4">
        {/* Top row */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-md border border-indigo-500/20">
            {ticket.ticketNumber}
          </span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {ticket.escalated && (
              <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-1.5 py-0.5 rounded-md">
                🚨 Escalated
              </span>
            )}
            <SlaBadge slaRisk={ticket.slaRisk} minutesUntilSla={ticket.minutesUntilSla} />
          </div>
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-slate-100 leading-snug mb-2 line-clamp-2 group-hover:text-white transition-colors">
          {ticket.title}
        </h3>

        {/* Description preview */}
        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 mb-3">
          {ticket.description}
        </p>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          <PriorityBadge priority={ticket.priority} />
          <StatusBadge status={ticket.status} />
          <CategoryBadge category={ticket.category} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white">
              {ticket.customerName?.charAt(0) || "?"}
            </div>
            <div>
              <p className="text-xs text-slate-300 font-medium leading-none">{ticket.customerName}</p>
              <p className="text-xs text-slate-600 mt-0.5">{ticket.companyName}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">{timeAgo(ticket.createdAt)}</p>
            <p className="text-xs text-slate-600 mt-0.5">
              {ticket.assignedAgent && ticket.assignedAgent !== "Unassigned"
                ? `→ ${ticket.assignedAgent}`
                : "Unassigned"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
