"use client";

// Shared field primitives for the five register-interest forms — matches the design's
// pill inputs, chip groups and toggle exactly. `dark` = theme has a coloured background
// (Teacher/blue, GEM/olive, Partner/purple) vs a light background needing filled inputs
// (Social Stretch/yellow, Venue/yellow).

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[9px] font-extrabold tracking-[0.12em] mb-1.5">{children}</div>
  );
}

export function PillInput({
  dark,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { dark?: boolean }) {
  return (
    <input
      {...props}
      className={
        dark
          ? "w-full h-11 lg:h-10 flex items-center border-2 border-cream rounded-pill px-[15px] lg:px-[15px] text-xs bg-transparent text-cream placeholder:text-cream/70 outline-none"
          : "w-full h-11 lg:h-10 flex items-center border-2 border-ink rounded-pill px-[15px] text-xs bg-cream text-ink placeholder:text-ink/50 outline-none"
      }
    />
  );
}

export function PillTextarea({
  dark,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { dark?: boolean }) {
  return (
    <textarea
      {...props}
      className={
        dark
          ? "w-full min-h-[96px] border-2 border-cream rounded-2xl px-[17px] py-3.5 text-xs bg-transparent text-cream placeholder:text-cream/70 outline-none resize-none"
          : "w-full min-h-[96px] border-2 border-ink rounded-2xl px-[17px] py-3.5 text-xs bg-cream text-ink placeholder:text-ink/50 outline-none resize-none"
      }
    />
  );
}

export function ChipGroup({
  options,
  value,
  onChange,
  dark,
  otherValue,
  onOtherChange,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  dark?: boolean;
  otherValue?: string;
  onOtherChange?: (v: string) => void;
}) {
  const isOther = value === "Other";
  return (
    <div>
      <div className="flex flex-wrap gap-[7px]">
        {options.map((opt) => {
          const selected = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className="rounded-pill px-[13px] py-2 text-[12px] font-semibold"
              style={
                selected
                  ? { background: dark ? "#F7F0E8" : "#14110F", color: dark ? "#14110F" : "#F7F0E8", border: `2px solid ${dark ? "#14110F" : "#14110F"}` }
                  : { background: "transparent", color: dark ? "#F7F0E8" : "#14110F", border: `2px solid ${dark ? "#F7F0E8" : "#14110F"}` }
              }
            >
              {opt}
            </button>
          );
        })}
      </div>
      {isOther && onOtherChange && (
        <input
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder="If other, tell us what"
          className={
            dark
              ? "w-full h-11 mt-2 border-2 border-dashed border-cream/60 rounded-pill px-[15px] text-xs bg-transparent text-cream placeholder:text-cream/70 outline-none"
              : "w-full h-11 mt-2 border-2 border-dashed border-ink/40 rounded-pill px-[15px] text-xs bg-cream text-ink placeholder:text-ink/50 outline-none"
          }
        />
      )}
    </div>
  );
}

export function MultiChipGroup({
  options,
  values,
  onChange,
  dark,
  otherValue,
  onOtherChange,
}: {
  options: string[];
  values: string[];
  onChange: (v: string[]) => void;
  dark?: boolean;
  otherValue?: string;
  onOtherChange?: (v: string) => void;
}) {
  const isOtherSelected = values.includes("Other");
  function toggle(opt: string) {
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt]);
  }
  return (
    <div>
      <div className="flex flex-wrap gap-[7px]">
        {options.map((opt) => {
          const selected = values.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => toggle(opt)}
              className="rounded-pill px-[13px] py-2 text-[12px] font-semibold"
              style={
                selected
                  ? { background: dark ? "#F7F0E8" : "#14110F", color: dark ? "#14110F" : "#F7F0E8", border: "2px solid #14110F" }
                  : { background: "transparent", color: dark ? "#F7F0E8" : "#14110F", border: `2px solid ${dark ? "#F7F0E8" : "#14110F"}` }
              }
            >
              {opt}
            </button>
          );
        })}
      </div>
      {isOtherSelected && onOtherChange && (
        <input
          value={otherValue}
          onChange={(e) => onOtherChange(e.target.value)}
          placeholder="If other, tell us what"
          className={
            dark
              ? "w-full h-11 mt-2 border-2 border-dashed border-cream/60 rounded-pill px-[15px] text-xs bg-transparent text-cream placeholder:text-cream/70 outline-none"
              : "w-full h-11 mt-2 border-2 border-dashed border-ink/40 rounded-pill px-[15px] text-xs bg-cream text-ink placeholder:text-ink/50 outline-none"
          }
        />
      )}
    </div>
  );
}

export function ThreeWayChoice({
  options = ["Yes", "No", "Can become"],
  value,
  onChange,
  dark,
}: {
  options?: string[];
  value: string;
  onChange: (v: string) => void;
  dark?: boolean;
}) {
  return (
    <div className="flex gap-[7px]">
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            className="flex-1 h-10 rounded-pill text-xs font-semibold"
            style={
              selected
                ? { background: dark ? "#F7F0E8" : "#14110F", color: dark ? "#14110F" : "#F7F0E8", border: "2px solid #14110F" }
                : { background: "transparent", color: dark ? "#F7F0E8" : "#14110F", border: `2px solid ${dark ? "#F7F0E8" : "#14110F"}` }
            }
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function FormSubmitButton({
  dark,
  loading,
  children,
}: {
  dark?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="w-full h-11 lg:h-11 rounded-pill text-sm font-bold disabled:opacity-60"
      style={
        dark
          ? { background: "#F7F0E8", color: "#14110F", border: "2px solid #14110F" }
          : { background: "#14110F", color: "#F7F0E8", border: "2px solid #14110F" }
      }
    >
      {loading ? "Sending…" : children}
    </button>
  );
}
