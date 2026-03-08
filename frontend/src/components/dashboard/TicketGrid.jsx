import { useState } from "react";
import TicketCard from "./TicketCard";

const FILTERS = [
  { label: "All",         value: "ALL" },
  { label: "Open",        value: "OPEN" },
  { label: "In Progress", value: "IN_PROGRESS" },
  { label: "Critical",    value: "CRITICAL" },
  { label: "SLA Risk",    value: "SLA_RISK" },
  { label: "Escalated",   value: "ESCALATED" },
  { label: "Resolved",    value: "RESOLVED" },
];

export default function TicketGrid({ tickets, onTicketClick }) {
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("sla");

  const filtered = tickets
    .filter(t => {
      if (filter === "ALL") return true;
      if (filter === "OPEN") return t.status === "OPEN";
      if (filter === "IN_PROGRESS") return t.status === "IN_PROGRESS";
      if (filter === "CRITICAL") return t.priority === "CRITICAL";
      if (filter === "SLA_RISK") return ["RED", "AMBER", "BREACHED"].includes(t.slaRisk);
      if (filter === "ESCALATED") return t.escalated;
      if (filter === "RESOLVED") return t.status === "RESOLVED";
      return true;
    })
    .filter(t =>
      !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketNumber?.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName?.toLowerCase().includes(search.toLowerCase()) ||
      t.companyName?.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sort === "sla") {
        const order = { BREACHED: 0, RED: 1, AMBER: 2, GREEN: 3 };
        return (order[a.slaRisk] ?? 3) - (order[b.slaRisk] ?? 3);
      }
      if (sort === "priority") {
        const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (order[a.priority] ?? 3) - (order[b.priority] ?? 3);
      }
      if (sort === "newest") {
        return new Date(b.createdAt) - new Date(a.createdAt);
      }
      return 0;
    });

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tickets, customers..."
            className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 focus:bg-slate-800 transition-all"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 flex-wrap">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`text-xs px-3 py-2 rounded-lg font-medium transition-all ${
                filter === f.value
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "bg-slate-900 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sort}
          onChange={e => setSort(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-400 focus:outline-none focus:border-indigo-500/60"
        >
          <option value="sla">Sort: SLA Risk</option>
          <option value="priority">Sort: Priority</option>
          <option value="newest">Sort: Newest</option>
        </select>
      </div>

      {/* Results count */}
      <p className="text-xs text-slate-600 mb-4">
        Showing <span className="text-slate-400 font-medium">{filtered.length}</span> of {tickets.length} tickets
      </p>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-slate-600">
          <p className="text-4xl mb-3">🎫</p>
          <p className="text-sm">No tickets match your filter</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={onTicketClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}
