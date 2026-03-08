export default function SimilarTickets({ tickets }) {
  if (!tickets || tickets.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic">
        No similar resolved tickets found in the knowledge base.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {tickets.map((t, i) => (
        <div
          key={i}
          className="rounded-lg bg-slate-800/60 border border-slate-700/60 p-3 hover:border-slate-600 transition-colors"
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
              {t.ticketNumber}
            </span>
            <span className="text-xs text-slate-500">{t.category}</span>
            <span className="text-xs text-slate-600">·</span>
            <span className="text-xs text-slate-500">{t.priority}</span>
          </div>
          <p className="text-sm font-medium text-slate-200 mb-2">{t.title}</p>
          {t.resolutionNotes && (
            <div className="flex gap-2">
              <span className="text-green-400 text-xs mt-0.5 flex-shrink-0">✓</span>
              <p className="text-xs text-green-300/80 leading-relaxed line-clamp-2">
                {t.resolutionNotes}
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
