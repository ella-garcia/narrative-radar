export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg width="28" height="28" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
        <circle cx="16" cy="16" r="15" fill="#003399" />
        <g stroke="#FFCC00" strokeWidth="1.2" strokeLinecap="round" fill="none">
          <path d="M16 16 L16 5" />
          <path d="M16 16 L24 11" />
          <path d="M16 16 L27 16" />
          <path d="M16 16 L24 21" />
          <path d="M16 16 L16 27" />
          <path d="M16 16 L8 21" />
          <path d="M16 16 L5 16" />
          <path d="M16 16 L8 11" />
        </g>
        <circle cx="16" cy="16" r="7.5" fill="none" stroke="#FFCC00" strokeOpacity=".4" strokeWidth="0.8" />
        <circle cx="16" cy="16" r="11.5" fill="none" stroke="#FFCC00" strokeOpacity=".25" strokeWidth="0.7" />
        <circle cx="16" cy="16" r="2" fill="#FFCC00" />
      </svg>
      <div className="flex flex-col leading-none">
        <span className="font-serif text-[15px] font-bold tracking-tight text-eu-ink">
          Narrative Radar
        </span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-eu-slate-500">
          DSA · AI Act monitor
        </span>
      </div>
    </div>
  );
}
