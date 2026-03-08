import LoadingDots from "../ui/LoadingDots";

export default function AiPanel({ title, icon, onGenerate, loading, generated, children }) {
  return (
    <div className="rounded-xl border border-slate-700/60 bg-slate-900/60 overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/60 bg-slate-800/40">
        <div className="flex items-center gap-2">
          <span className="text-base">{icon}</span>
          <span className="text-sm font-semibold text-slate-200">{title}</span>
          {generated && (
            <span className="text-xs bg-green-500/10 text-green-400 border border-green-500/20 px-1.5 py-0.5 rounded-md">
              ✓ Generated
            </span>
          )}
        </div>
        {!generated && (
          <button
            onClick={onGenerate}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium transition-all shadow-lg shadow-indigo-500/10"
          >
            {loading ? (
              <>
                <span className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                Generating
              </>
            ) : (
              <>✨ Generate</>
            )}
          </button>
        )}
        {generated && (
          <button
            onClick={onGenerate}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            ↻ Regenerate
          </button>
        )}
      </div>

      {/* Panel body */}
      <div className="p-4 min-h-[80px]">
        {loading && <LoadingDots label="llama3.2 is thinking..." />}
        {!loading && !generated && (
          <p className="text-xs text-slate-600 italic">
            Click Generate to run AI analysis on this ticket
          </p>
        )}
        {!loading && generated && children}
      </div>
    </div>
  );
}
