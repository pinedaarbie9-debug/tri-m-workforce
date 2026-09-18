// src/app/components/MfaSettings.tsx
import { useState, useEffect } from "react";
import { ShieldCheck, ShieldOff, Loader2, Copy, Check, AlertCircle, KeyRound } from "lucide-react";
import { api } from "../../lib/api";

export function MfaSettings() {
  const [status, setStatus] = useState<"loading" | "disabled" | "enabled">("loading");
  const [error, setError] = useState<string | null>(null);

  const [setupData, setSetupData] = useState<{ secret: string; qr_code: string } | null>(null);
  const [setupCode, setSetupCode] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const [showDisable, setShowDisable] = useState(false);
  const [disableCode, setDisableCode] = useState("");
  const [disableLoading, setDisableLoading] = useState(false);
  const [disableError, setDisableError] = useState<string | null>(null);

  useEffect(() => {
    loadStatus();
  }, []);

  async function loadStatus() {
    setStatus("loading");
    setError(null);
    try {
      const res = await api.mfaStatus();
      setStatus(res.mfa_enabled ? "enabled" : "disabled");
    } catch (err: any) {
      setError(err.message ?? "Failed to load MFA status.");
      setStatus("disabled");
    }
  }

  async function handleStartSetup() {
    setSetupLoading(true);
    setSetupError(null);
    try {
      const res = await api.mfaSetup();
      setSetupData({ secret: res.secret, qr_code: res.qr_code });
    } catch (err: any) {
      setSetupError(err.message ?? "Failed to start MFA setup.");
    } finally {
      setSetupLoading(false);
    }
  }

  async function handleVerifySetup(e: React.FormEvent) {
    e.preventDefault();
    if (setupCode.trim().length < 6) {
      setSetupError("Please enter the 6-digit code.");
      return;
    }
    setSetupLoading(true);
    setSetupError(null);
    try {
      const res = await api.mfaVerifySetup(setupCode.trim());
      setBackupCodes(res.backup_codes);
      setStatus("enabled");
      setSetupData(null);
      setSetupCode("");
    } catch (err: any) {
      setSetupError(err.message ?? "Invalid code. Please try again.");
    } finally {
      setSetupLoading(false);
    }
  }

  function handleCancelSetup() {
    setSetupData(null);
    setSetupCode("");
    setSetupError(null);
  }

  async function handleDisable(e: React.FormEvent) {
    e.preventDefault();
    if (!disableCode.trim()) {
      setDisableError("Please enter a code.");
      return;
    }
    setDisableLoading(true);
    setDisableError(null);
    try {
      await api.mfaDisable(disableCode.trim());
      setStatus("disabled");
      setShowDisable(false);
      setDisableCode("");
    } catch (err: any) {
      setDisableError(err.message ?? "Invalid code.");
    } finally {
      setDisableLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 1500);
  }

  if (status === "loading") {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading MFA status...
      </div>
    );
  }

  if (backupCodes) {
    return (
      <div className="space-y-4 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="font-semibold text-amber-900">Save your backup codes</h3>
            <p className="text-sm text-amber-800 mt-1">
              These codes can be used once each if you lose access to your authenticator app.
              Store them somewhere safe — they will not be shown again.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {backupCodes.map((code) => (
            <button
              key={code}
              onClick={() => copyToClipboard(code)}
              className="flex items-center justify-between px-3 py-2 bg-white border border-amber-200 rounded-lg text-sm font-mono hover:bg-amber-100 transition-colors"
            >
              <span className="truncate">{code}</span>
              {copiedCode === code ? (
                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0 ml-2" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground shrink-0 ml-2" />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => setBackupCodes(null)}
          className="w-full py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-sm font-medium"
        >
          I've saved my backup codes
        </button>
      </div>
    );
  }

  if (setupData) {
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">Set up two-factor authentication</h3>
          <p className="text-sm text-muted-foreground">
            Scan this QR code with Google Authenticator (or any TOTP app), then enter the
            6-digit code below to verify.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 p-4 bg-muted/30 rounded-xl">
          <img
            src={setupData.qr_code}
            alt="MFA QR Code"
            className="w-48 h-48 sm:w-56 sm:h-56 rounded-lg border-2 border-primary/30 bg-white p-2"
          />
          <div className="text-center w-full">
            <p className="text-xs text-muted-foreground">Or manually enter this secret:</p>
            <button
              onClick={() => copyToClipboard(setupData.secret)}
              className="mt-1 inline-flex items-center gap-2 px-3 py-1.5 bg-background border border-border rounded-lg text-xs font-mono hover:bg-muted transition-colors max-w-full"
            >
              <span className="truncate">{setupData.secret}</span>
              {copiedCode === setupData.secret ? (
                <Check className="w-3 h-3 text-emerald-600 shrink-0" />
              ) : (
                <Copy className="w-3 h-3 shrink-0" />
              )}
            </button>
          </div>
        </div>

        <form onSubmit={handleVerifySetup} className="space-y-3">
          {setupError && (
            <div className="flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {setupError}
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground block mb-1.5">
              Enter the 6-digit code from your app
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={setupCode}
              onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              className="w-full px-3 py-2.5 text-center text-xl tracking-[0.4em] font-mono border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
              maxLength={6}
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={handleCancelSetup}
              disabled={setupLoading}
              className="flex-1 py-2.5 px-4 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={setupLoading || setupCode.length < 6}
              className="flex-1 py-2.5 px-4 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              {setupLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
              ) : (
                "Verify & Enable"
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (showDisable) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <h3 className="font-semibold text-foreground">Disable two-factor authentication</h3>
          <p className="text-sm text-muted-foreground">
            Enter a code from your authenticator app or one of your backup codes to confirm.
          </p>
        </div>

        <form onSubmit={handleDisable} className="space-y-3">
          {disableError && (
            <div className="flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {disableError}
            </div>
          )}

          <input
            type="text"
            value={disableCode}
            onChange={(e) => setDisableCode(e.target.value.toUpperCase().trim())}
            placeholder="123456 or backup code"
            className="w-full px-3 py-2.5 text-center text-lg tracking-widest font-mono border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50"
            autoFocus
          />

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => { setShowDisable(false); setDisableCode(""); setDisableError(null); }}
              disabled={disableLoading}
              className="flex-1 py-2.5 px-4 border border-border rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={disableLoading || !disableCode.trim()}
              className="flex-1 py-2.5 px-4 bg-destructive text-white rounded-lg hover:bg-destructive/90 disabled:opacity-60 transition-colors text-sm font-medium flex items-center justify-center gap-2"
            >
              {disableLoading ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Disabling...</>
              ) : (
                "Disable MFA"
              )}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 p-4 border border-border rounded-xl">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            status === "enabled" ? "bg-emerald-50 text-emerald-600" : "bg-muted text-muted-foreground"
          }`}>
            {status === "enabled" ? <ShieldCheck className="w-5 h-5" /> : <ShieldOff className="w-5 h-5" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-foreground">Two-Factor Authentication (TOTP)</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {status === "enabled"
                ? "Enabled — your account is protected with an additional verification step."
                : "Add an extra layer of security to your account by requiring a code from an authenticator app."}
            </p>
          </div>
        </div>

        <button
          onClick={status === "enabled" ? () => setShowDisable(true) : handleStartSetup}
          disabled={setupLoading}
          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            status === "enabled"
              ? "border border-destructive/30 text-destructive hover:bg-destructive/10"
              : "bg-primary text-white hover:bg-primary/90"
          } disabled:opacity-60`}
        >
          {setupLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <KeyRound className="w-4 h-4" />
          )}
          {status === "enabled" ? "Disable" : "Enable MFA"}
        </button>
      </div>
    </div>
  );
}