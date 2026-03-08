export default function LoadingDots({ label = "AI is thinking..." }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-indigo-400"
            style={{
              animation: "bounce 1s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <span className="text-sm text-slate-400 italic">{label}</span>
    </div>
  );
}
