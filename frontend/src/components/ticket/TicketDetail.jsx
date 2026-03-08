import { useState } from "react";
import { PriorityBadge, StatusBadge, SlaBadge, CategoryBadge } from "../ui/Badge";
import AiPanel from "./AiPanel";
import SimilarTickets from "./SimilarTickets";
import ResolutionPanel from "./ResolutionPanel";
import { api } from "../../services/api";

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <span className="text-xs text-slate-600 w-24 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-xs text-slate-300 flex-1">{value}</span>
    </div>
  );
}

export default function TicketDetail({ ticket, onClose }) {
  const [summary, setSummary]       = useState(null);
  const [similar, setSimilar]       = useState(null);
  const [resolution, setResolution] = useState(null);
  const [draft, setDraft]           = useState(null);

  const [loading, setLoading] = useState({
    summary: false, similar: false, resolution: false, draft: false,
  });

  const run = async (key, apiFn, setter) => {
    setLoading(l => ({ ...l, [key]: true }));
    try {
      const data = await apiFn(ticket.id);
      setter(data);
    } catch (e) {
      console.error(`${key} error:`, e);
    }
    setLoading(l => ({ ...l, [key]: false }));
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString() : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-slate-950 border border-slate-700/60 shadow-2xl">

        {/* Modal Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-700/60 bg-slate-900/60 rounded-t-2xl">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-2 mb-2">
                <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20">
                  {ticket.ticketNumber}
                </span>
                <PriorityBadge priority={ticket.priority} />
                <StatusBadge status={ticket.status} />
                {ticket.escalated && (
                  <span className="text-xs bg-orange-500/10 text-orange-400 border border-orange-500/20 px-2 py-1 rounded-md">
                    🚨 Escalated
                  </span>
                )}
                <SlaBadge slaRisk={ticket.slaRisk} minutesUntilSla={ticket.minutesUntilSla} />
              </div>
              <h2 className="text-base font-bold text-white leading-snug">{ticket.title}</h2>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors text-lg"
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* Ticket info grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Description */}
            <div className="md:col-span-2 rounded-xl bg-slate-900/60 border border-slate-700/60 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Description</p>
              <p className="text-sm text-slate-300 leading-relaxed">{ticket.description}</p>
            </div>

            {/* Customer info */}
            <div className="rounded-xl bg-slate-900/60 border border-slate-700/60 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Customer</p>
              <div className="space-y-2">
                <InfoRow label="Name" value={ticket.customerName} />
                <InfoRow label="Email" value={ticket.customerEmail} />
                <InfoRow label="Company" value={ticket.companyName} />
                <InfoRow label="Plan" value={ticket.customerPlan} />
              </div>
            </div>

            {/* Ticket meta */}
            <div className="rounded-xl bg-slate-900/60 border border-slate-700/60 p-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">Details</p>
              <div className="space-y-2">
                <InfoRow label="Agent" value={ticket.assignedAgent} />
                <InfoRow label="Team" value={ticket.agentTeam} />
                <InfoRow label="SLA Policy" value={ticket.slaPolicy} />
                <InfoRow label="Created" value={formatDate(ticket.createdAt)} />
                <InfoRow label="Reopen Count" value={ticket.reopenCount > 0 ? `${ticket.reopenCount}x` : null} />
              </div>
            </div>

            {/* Resolution notes (if resolved) */}
            {ticket.resolutionNotes && (
              <div className="md:col-span-2 rounded-xl bg-green-500/5 border border-green-500/20 p-4">
                <p className="text-xs font-semibold text-green-500 uppercase tracking-widest mb-2">✓ Resolution</p>
                <p className="text-sm text-green-300/80 leading-relaxed">{ticket.resolutionNotes}</p>
                {ticket.rootCause && (
                  <p className="text-xs text-green-400/60 mt-2">Root cause: {ticket.rootCause}</p>
                )}
              </div>
            )}
          </div>

          {/* ── AI Panels ──────────────────────────────────────── */}

          {/* 1. Summarise */}
          <AiPanel
            title="AI Ticket Summary" icon="🤖"
            onGenerate={() => run("summary", api.summariseTicket, d => setSummary(d.summary))}
            loading={loading.summary}
            generated={!!summary}
          >
            <p className="text-sm text-slate-300 leading-relaxed">{summary}</p>
          </AiPanel>

          {/* 2. Similar Tickets */}
          <AiPanel
            title="Similar Resolved Tickets" icon="🔍"
            onGenerate={() => run("similar", api.getSimilarTickets, setSimilar)}
            loading={loading.similar}
            generated={!!similar}
          >
            <SimilarTickets tickets={similar} />
          </AiPanel>

          {/* 3. Resolution Suggester */}
          <AiPanel
            title="Resolution Suggester" icon="💡"
            onGenerate={() => run("resolution", api.getResolution, setResolution)}
            loading={loading.resolution}
            generated={!!resolution}
          >
            <ResolutionPanel data={resolution} />
          </AiPanel>

          {/* 4. Draft Response */}
          <AiPanel
            title="Client Response Drafter" icon="✉️"
            onGenerate={() => run("draft", api.draftResponse, d => setDraft(d.draft))}
            loading={loading.draft}
            generated={!!draft}
          >
            {draft && (
              <div>
                <div className="rounded-lg bg-slate-800/60 border border-slate-700/60 p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                  {draft}
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(draft)}
                  className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                >
                  📋 Copy to clipboard
                </button>
              </div>
            )}
          </AiPanel>

        </div>
      </div>
    </div>
  );
}
