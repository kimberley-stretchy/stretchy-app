export type BoardSuggestion = {
  id: string;
  session_type: string;
  preferred_neighbourhood: string | null;
  preferred_time: string | null;
  notes: string | null;
  vote_count: number;
  isPlaceholder?: boolean;
};

export const BECOMING_SESSION_THRESHOLD = 40;

export function suggestionTitle(s: BoardSuggestion): string {
  const parts = [s.preferred_neighbourhood, s.preferred_time].filter(Boolean);
  return parts.length ? parts.join(" | ").toUpperCase() : s.session_type.toUpperCase();
}

// Shared board card — used on the homepage's Suggest band and the standalone /suggest
// page's demand board, so a suggestion looks identical wherever it appears.
export default function SuggestionCard({
  s,
  voted,
  onVote,
  highlighted = false,
}: {
  s: BoardSuggestion;
  voted: boolean;
  onVote: (id: string) => void;
  highlighted?: boolean;
}) {
  const becoming = s.vote_count >= BECOMING_SESSION_THRESHOLD;
  const olive = highlighted;

  return (
    <div
      className="border-2 border-ink rounded-2xl lg:rounded-[20px] p-4 lg:p-[22px] flex flex-col gap-3"
      style={olive ? { background: "#716F39", color: "#F7F0E8" } : { background: "#F7F0E8", color: "#14110F" }}
    >
      <div className="flex flex-col items-start gap-2.5">
        <div
          className="inline-flex items-center gap-1.5 rounded-pill px-[11px] py-1 lg:px-3 lg:py-[5px]"
          style={{ border: `2px solid ${olive ? "#F7F0E8" : "#14110F"}` }}
        >
          <span className="font-mono text-sm lg:text-[15px] font-extrabold">{s.vote_count}</span>
          <span className="font-mono text-[9px] font-extrabold tracking-[0.09em]">WANT IT</span>
        </div>
        <div className="font-display text-[21px] leading-none min-w-0">{suggestionTitle(s)}</div>
      </div>
      {s.notes && <div className="text-xs lg:text-[13px]">{s.notes}</div>}

      {becoming ? (
        <div
          className="mt-auto h-11 rounded-pill bg-transparent flex items-center justify-center gap-2 text-[13px] font-bold"
          style={{ border: `2px solid ${olive ? "#F7F0E8" : "#14110F"}` }}
        >
          <span className="w-[7px] h-[7px] rounded-pill bg-current" />
          Becoming a session
        </div>
      ) : voted ? (
        <div
          className="mt-auto h-11 rounded-pill flex items-center justify-center gap-2 text-[13px] font-bold"
          style={{ background: "#14110F", border: "2px solid #14110F", color: "#F7F0E8" }}
        >
          <span className="w-[7px] h-[7px] rounded-pill bg-current" />
          You said me too
        </div>
      ) : (
        <button
          onClick={() => onVote(s.id)}
          className="mt-auto h-11 bg-transparent rounded-pill text-[13px] font-bold"
          style={{ border: `2px solid ${olive ? "#F7F0E8" : "#14110F"}`, color: olive ? "#F7F0E8" : "#14110F" }}
        >
          Me too
        </button>
      )}
    </div>
  );
}
