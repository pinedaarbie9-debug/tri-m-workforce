// src/app/components/LiveFingerprintEnroll.tsx
// -----------------------------------------------------------------------
// Live fingerprint enrollment view para sa Enroll Device modal.
// Gumagawa ng enrollment session sa backend, tapos pina-poll ang status
// habang kinukuha ng ZK9500 scanner app ang 3 scans.
// -----------------------------------------------------------------------
import { useEffect, useRef, useState } from "react";
import { Fingerprint, CheckCircle2, ShieldAlert, Loader2, MonitorSmartphone } from "lucide-react";
import { api } from "../../lib/api";
import type { FingerprintEnrollSession } from "../../lib/api";

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
  active: { core: "text-primary border-primary bg-primary/10", ping: "bg-primary/30", text: "text-foreground" },
  success: { core: "text-emerald-600 border-emerald-500 bg-emerald-50", ping: "bg-emerald-400/30", text: "text-emerald-700" },
  error: { core: "text-destructive border-destructive bg-destructive/10", ping: "bg-destructive/30", text: "text-destructive" },
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
  const Icon = succeeded ? CheckCircle2 : failed ? ShieldAlert : Fingerprint;

  return (
    <div className="flex flex-col items-center text-center py-2">
      <div className="relative w-28 h-28 flex items-center justify-center">
        {live && <span className={`absolute inset-0 rounded-full animate-ping ${tone.ping}`} />}
        <div className={`relative w-24 h-24 rounded-full border-2 flex items-center justify-center ${tone.core}`}>
          {starting ? <Loader2 className="w-10 h-10 animate-spin" /> : <Icon className="w-10 h-10" />}
        </div>
      </div>

      <div className="flex gap-2.5 mt-5" aria-label={`Scan ${Math.min(step, 3)} ng 3`}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={`w-3 h-3 rounded-full border-2 border-primary transition-colors ${i < step || succeeded ? "bg-primary" : ""}`}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-1.5">
        {succeeded ? "Kumpleto" : `Scan ${Math.min(step + 1, 3)} / 3`}
      </p>

      <p role="status" aria-live="polite" className={`mt-3 text-sm font-semibold px-2 ${tone.text}`}>
        {message}
      </p>

      {session && status === "waiting" && !session.bridge_online && (
        <div className="mt-3 flex items-start gap-1.5 text-left text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
          <MonitorSmartphone className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Hindi nakikita ang scanner app. Buksan ang ZK9500 bridge app sa PC kung saan nakakabit ang scanner.
        </div>
      )}

      {session && (
        <p className="mt-3 text-xs text-muted-foreground">
          {session.employee_name} · Device PIN: <span className="font-mono font-medium text-foreground">{session.credential_id}</span> (auto-generated)
        </p>
      )}

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
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors">
            Done
          </button>
        )}
      </div>
    </div>
  );
}