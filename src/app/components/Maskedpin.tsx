// src/app/components/MaskedPin.tsx
// -----------------------------------------------------------------------
// Naka-mask (****) na PIN display para sa privacy. May eye button para
// i-reveal saglit; awtomatikong nagtatago ulit pagkalipas ng revealMs.
// -----------------------------------------------------------------------
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

interface Props {
  value?: string | null;
  className?: string;
  revealMs?: number;
}

export default function MaskedPin({ value, className = "", revealMs = 5000 }: Props) {
  const [visible, setVisible] = useState(false);

  // Awtomatikong itago ulit pagkatapos ng ilang segundo
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), revealMs);
    return () => clearTimeout(t);
  }, [visible, revealMs]);

  if (!value) return <span className={className}>—</span>;

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="font-mono tracking-widest select-none">
        {visible ? value : "*".repeat(value.length)}
      </span>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        title={visible ? "Hide PIN" : "Show PIN"}
        aria-label={visible ? "Hide PIN" : "Show PIN"}
        className="w-5 h-5 shrink-0 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
      >
        {visible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
      </button>
    </span>
  );
}