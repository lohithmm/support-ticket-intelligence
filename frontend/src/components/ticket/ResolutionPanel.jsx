export default function ResolutionPanel({ data }) {
  if (!data) return null;

  return (
    <div className="space-y-3">
      {/* AI suggestion */}
      <div className="rounded-lg bg-slate-800/60 border border-slate-700/60 p-4">
        <pre className="whitespace-pre-wrap font-sans text-sm text-slate-300 leading-relaxed">
          {data.suggestion}
        </pre>
      </div>

      {/* Similar tickets used as context */}
      {data.similarTickets && data.similarTickets.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mb-2">
            Based on {data.similarTickets.length} similar resolved ticket{data.similarTickets.length > 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap gap-2">
            {data.similarTickets.map((t, i) => (
              <span
                key={i}
                className="text-xs font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded-md"
              >
                {t.ticketNumber}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
