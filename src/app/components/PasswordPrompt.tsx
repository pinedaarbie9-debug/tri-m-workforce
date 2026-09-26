// src/app/components/PasswordPrompt.tsx
import { useState } from "react";
import { Lock, Eye, EyeOff, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { api } from "../../lib/api";

interface PasswordPromptProps {
  open: boolean;
  title?: string;
  description?: string;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}

export function PasswordPrompt({
  open,
  title = "Password Required",
  description = "Enter the file export password to continue with this download.",
  onClose,
  onSuccess,
}: PasswordPromptProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  function reset() {
    setPassword("");
    setShowPassword(false);
    setError(null);
    setVerifying(false);
  }

  function handleClose() {
    if (verifying) return;
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!password.trim()) {
      setError("Password is required.");
      return;
    }

    setVerifying(true);
    try {
      // 🔒 I-verify ang FILE EXPORT PASSWORD
      await api.verifyFilePassword(password);
      await onSuccess();
      reset();
      onClose();
    } catch (err: any) {
      setError(err.message ?? "Incorrect password.");
      setPassword("");
    } finally {
      setVerifying(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
          onClick={handleClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-card rounded-2xl shadow-2xl border border-border overflow-hidden"
          >
            <div className="flex items-start justify-between p-5 border-b border-border">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">{title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {description}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={verifying}
                className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted transition-colors shrink-0 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {error && (
                <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  File Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoFocus
                    disabled={verifying}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
                    placeholder="Enter file export password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Ask your administrator for the file export password. This
                  action will be logged.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={verifying}
                  className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors disabled:opacity-60"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
                >
                  {verifying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {verifying ? "Verifying..." : "Confirm"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}