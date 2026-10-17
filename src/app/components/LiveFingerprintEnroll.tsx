// src/app/components/LiveFingerprintEnroll.tsx
// -----------------------------------------------------------------------
// Live fingerprint enrollment view para sa Enroll Device modal.
// Gumagawa ng enrollment session sa backend, tapos pina-poll ang status
// habang kinukuha ng ZK9500 scanner app ang 3 scans.
// -----------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import { Fingerprint, CheckCircle2, ShieldAlert, Loader2, MonitorSmartphone, Check } from "lucide-react";
import { motion } from "motion/react";
import { api } from "../../lib/api";
import type { FingerprintEnrollSession } from "../../lib/api";
import MaskedPin from "./Maskedpin";

interface Props {
  employeeId: string;
  deviceName?: string;
  onSuccess?: () => void;
  onClose: () => void;
}

const POLL_MS = 800;
const MAX_POLL_ERRORS = 5;

const isActive = (s?: FingerprintEnrollSession | null) =>
  !!s && (s.status === "waiting" || s.status === "capturing");

const TONES = {
  active: {
    pad: "from-violet-600 via-primary to-indigo-700",
    ring: "border-primary/40",
    glow: "shadow-primary/30",
    text: "text-foreground",
  },
  success: {
    pad: "from-emerald-500 via-emerald-600 to-teal-600",
    ring: "border-emerald-400/50",
    glow: "shadow-emerald-500/30",
    text: "text-emerald-700",
  },
  error: {
    pad: "from-rose-500 via-red-600 to-red-700",
    ring: "border-red-400/50",
    glow: "shadow-red-500/30",
    text: "text-destructive",
  },
};

const GRID_STYLE = {
  backgroundImage:
    "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)",
  backgroundSize: "16px 16px",
};

export default function LiveFingerprintEnroll({ employeeId, deviceName, onSuccess, onClose }: Props) {
  const [session, setSession] = useState<FingerprintEnrollSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(true);

  const sessionRef = useRef<FingerprintEnrollSession | null>(null); // para sa cleanup
  const startedRef = useRef(false); // iwas dobleng create (React StrictMode)
  const unmountedRef = useRef(false);
  const successFiredRef = useRef(false);

  async function start() {
    setStarting(true);
    setError(null);
    setSession(null);
    successFiredRef.current = false;
    try {
      const s = await api.startFingerprintEnrollment(employeeId, deviceName);
      if (unmountedRef.current) {
        api.cancelFingerprintEnrollment(s.id).catch(() => {});
        return;
      }
      sessionRef.current = s;
      setSession(s);
    } catch (e: any) {
      if (!unmountedRef.current) setError(e?.message ?? "Hindi masimulan ang enrollment.");
    } finally {
      if (!unmountedRef.current) setStarting(false);
    }
  }

  // Simulan agad pagbukas; i-cancel ang session kapag isinara ang modal habang aktibo pa.
  useEffect(() => {
    unmountedRef.current = false;
    if (!startedRef.current) {
      startedRef.current = true;
      start();
    }
    return () => {
      unmountedRef.current = true;
      const s = sessionRef.current;
      if (s && isActive(s)) api.cancelFingerprintEnrollment(s.id).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live polling habang aktibo ang session
  const sessionId = session?.id;
  const active = isActive(session);
  useEffect(() => {
    if (!sessionId || !active) return;
    let errors = 0;
    const timer = setInterval(async () => {
      try {
        const s = await api.getFingerprintEnrollment(sessionId);
        errors = 0;
        sessionRef.current = s;
        setSession(s);
      } catch {
        errors += 1;
        if (errors >= MAX_POLL_ERRORS) {
          clearInterval(timer);
          setError("Nawalan ng koneksyon sa server. Subukan ulit.");
        }
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [sessionId, active]);

  // Abisuhan ang parent nang isang beses lang kapag success
  useEffect(() => {
    if (session?.status === "success" && !successFiredRef.current) {
      successFiredRef.current = true;
      onSuccess?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status]);

  async function cancel() {
    if (session && isActive(session)) {
      await api.cancelFingerprintEnrollment(session.id).catch(() => {});
    }
    onClose();
  }

  const status = error ? "failed" : session?.status ?? "waiting";
  const succeeded = status === "success";
  const failed = status === "failed" || status === "expired" || status === "cancelled";
  const tone = TONES[succeeded ? "success" : failed ? "error" : "active"];
  const live = !error && !starting && (status === "waiting" || status === "capturing");
  const finished = !starting && !live;
  const step = session?.step ?? 0;

  const message = error ?? session?.message ?? "Sinisimulan ang enrollment...";

  const initials = (session?.employee_name ?? "")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col items-center text-center py-1">
      {/* ---------------- Scanner pad ---------------- */}
      <div className="relative w-40 h-40 flex items-center justify-center">
        {live && (
          <>
            <span className={`absolute inset-0 rounded-[2rem] border-2 animate-ping ${tone.ring}`} />
            <span className={`absolute inset-3 rounded-[1.6rem] border opacity-60 ${tone.ring}`} />
          </>
        )}

        <div
          className={`relative w-32 h-32 rounded-[1.75rem] bg-gradient-to-br shadow-xl flex items-center justify-center overflow-hidden ${tone.pad} ${tone.glow}`}
        >
          <div className="absolute inset-0 opacity-20" style={GRID_STYLE} />
          <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/10" />

          {starting ? (
            <Loader2 className="relative w-12 h-12 text-white animate-spin" />
          ) : succeeded ? (
            <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 18 }}>
              <CheckCircle2 className="relative w-14 h-14 text-white" strokeWidth={1.75} />
            </motion.div>
          ) : failed ? (
            <ShieldAlert className="relative w-14 h-14 text-white" strokeWidth={1.75} />
          ) : (
            <Fingerprint className="relative w-14 h-14 text-white" strokeWidth={1.5} />
          )}

          {live && (
            <motion.div
              className="absolute left-2 right-2 h-0.5 rounded-full bg-white/90 shadow-[0_0_12px_3px_rgba(255,255,255,0.7)]"
              initial={{ top: "12%" }}
              animate={{ top: ["12%", "88%", "12%"] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
          )}
        </div>
      </div>

      {/* ---------------- Step progress ---------------- */}
      <div
        className="mt-5 flex items-center"
        role="progressbar"
        aria-label={`Scan ${Math.min(step, 3)} ng 3`}
        aria-valuemin={0}
        aria-valuemax={3}
        aria-valuenow={Math.min(step, 3)}
      >
        {[0, 1, 2].map((i) => {
          const done = i < step || succeeded;
          const current = !done && i === step && live;
          return (
            <div key={i} className="flex items-center">
              <motion.div
                animate={current ? { scale: [1, 1.1, 1] } : { scale: 1 }}
                transition={current ? { duration: 1.2, repeat: Infinity } : { duration: 0.2 }}
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors ${
                  done
                    ? succeeded
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "bg-primary border-primary text-white"
                    : current
                      ? "border-primary text-primary bg-primary/10"
                      : "border-border text-muted-foreground bg-muted/40"
                }`}
              >
                {done ? <Check className="w-4 h-4" strokeWidth={3} /> : i + 1}
              </motion.div>
              {i < 2 && (
                <div
                  className={`w-9 h-0.5 mx-1.5 rounded-full transition-colors ${
                    i + 1 < step || succeeded ? (succeeded ? "bg-emerald-500" : "bg-primary") : "bg-border"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        {succeeded ? "Kumpleto ang 3 scans" : failed ? "Hindi natapos" : `Scan ${Math.min(step + 1, 3)} ng 3`}
      </p>

      {/* ---------------- Status message ---------------- */}
      <p role="status" aria-live="polite" className={`mt-2.5 text-sm font-semibold px-3 ${tone.text}`}>
        {message}
      </p>

      {session && status === "waiting" && !session.bridge_online && (
        <div className="mt-3 w-full flex items-start gap-1.5 text-left text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          <MonitorSmartphone className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Hindi nakikita ang scanner app. Buksan ang ZK9500 bridge app sa PC kung saan nakakabit ang scanner.
        </div>
      )}

      {/* ---------------- Employee + PIN (naka-mask) ---------------- */}
      {session && (
        <div className="mt-4 w-full flex items-center gap-3 rounded-xl border border-border bg-muted/30 px-3 py-2.5 text-left">
          <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold shrink-0">
            {initials || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground truncate">{session.employee_name}</p>
            <p className="text-[11px] text-muted-foreground">Device PIN (auto-generated)</p>
          </div>
          <span className="bg-card border border-border rounded-lg px-2.5 py-1 text-sm font-semibold text-foreground">
            <MaskedPin value={session.credential_id} />
          </span>
        </div>
      )}

      {/* ---------------- Actions ---------------- */}
      <div className="flex justify-center gap-2 mt-5">
        {live && (
          <button type="button" onClick={cancel} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors">
            Cancel
          </button>
        )}
        {finished && !succeeded && (
          <>
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors">
              Close
            </button>
            <button type="button" onClick={start} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
              Try Again
            </button>
          </>
        )}
        {succeeded && (
          <button type="button" onClick={onClose} className="px-5 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
            Done
          </button>
        )}
      </div>
    </div>
  );
}