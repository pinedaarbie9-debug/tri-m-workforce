// src/app/pages/Login.tsx
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff, Fingerprint, AlertCircle, Loader2, Camera, X, Mail, Lock, ShieldCheck, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import * as faceapi from "face-api.js";
import { useAuth } from "../context/AuthContext";
import { api } from "../../lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import logo from "../assets/tri-m-logo.png";

const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginForm = z.infer<typeof loginSchema>;

const SMOOTH_EASE = [0.22, 1, 0.36, 1] as const;
const BOUNCE_EASE = [0.34, 1.56, 0.64, 1] as const;

// 🔒 DEVICE-LEVEL lockout key
const DEVICE_LOCKOUT_KEY = "wms_device_lockout_until";
const LAST_EMAIL_KEY = "wms_last_email";

function formatMMSS(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function getDeviceLockout(): { seconds: number; message: string | null } {
  try {
    const stored = localStorage.getItem(DEVICE_LOCKOUT_KEY);
    if (!stored) return { seconds: 0, message: null };
    const lockoutUntil = Number(stored);
    if (isNaN(lockoutUntil)) {
      localStorage.removeItem(DEVICE_LOCKOUT_KEY);
      return { seconds: 0, message: null };
    }
    const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
    if (remaining > 0) {
      return { seconds: remaining, message: "Too many login attempts." };
    }
    localStorage.removeItem(DEVICE_LOCKOUT_KEY);
    return { seconds: 0, message: null };
  } catch {
    return { seconds: 0, message: null };
  }
}

// ----- Animated Background Orbs -----
function BackgroundOrbs() {
  return (
    <>
      <motion.div
        animate={{ x: [0, 60, -20, 0], y: [0, -40, 30, 0], scale: [1, 1.15, 0.95, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-20 -left-20 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-[100px] pointer-events-none"
      />
      <motion.div
        animate={{ x: [0, -70, 30, 0], y: [0, 50, -30, 0], scale: [1, 1.2, 0.9, 1] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-20 -right-20 w-[26rem] h-[26rem] rounded-full bg-cyan-400/20 blur-[100px] pointer-events-none"
      />
      <motion.div
        animate={{ x: [0, 40, -40, 0], y: [0, -25, 25, 0], scale: [1, 1.1, 1.1, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[24rem] h-[24rem] rounded-full bg-violet-500/15 blur-[100px] pointer-events-none"
      />
    </>
  );
}

// ----- Animated Logo -----
function AnimatedLogo() {
  return (
    <motion.div
      initial={{ scale: 0, rotate: -180, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: BOUNCE_EASE }}
      className="relative flex items-center justify-center w-24 h-24 mx-auto mb-5"
    >
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full border-2 border-dashed border-white/30"
      />
      <motion.div
        animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-2 rounded-full bg-white/25"
      />
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
        className="absolute inset-4 rounded-full bg-white/40 blur-sm"
      />
      <motion.div
        animate={{ scale: [1, 1.06, 1], y: [0, -2, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        className="relative w-14 h-14 rounded-2xl overflow-hidden shadow-2xl z-10"
      >
        <img src={logo} alt="Tri-M Global" className="w-full h-full object-contain bg-white p-1.5" />
        <motion.div
          animate={{ x: ["-120%", "220%"] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.5 }}
          className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/80 to-transparent -skew-x-12"
        />
      </motion.div>
    </motion.div>
  );
}

// ----- Animated Illustration -----
function WorkforceIllustration() {
  return (
    <motion.svg
      viewBox="0 0 420 300"
      className="w-full h-auto max-w-[400px]"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1, y: [0, -12, 0] }}
      transition={{
        opacity: { duration: 0.8, delay: 0.4, ease: SMOOTH_EASE },
        scale: { duration: 0.8, delay: 0.4, ease: SMOOTH_EASE },
        y: { duration: 4.5, repeat: Infinity, ease: "easeInOut" },
      }}
      role="img"
      aria-label="Tri-M Global illustration"
    >
      <defs>
        <linearGradient id="wfTopFace" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#c4b5fd" />
          <stop offset="100%" stopColor="#a78bfa" />
        </linearGradient>
        <linearGradient id="wfRightFace" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="wfLeftFace" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#6d28d9" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
        <linearGradient id="wfAccentTop" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#67e8f9" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
        <linearGradient id="wfAccentRight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="wfAccentLeft" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0e7490" />
          <stop offset="100%" stopColor="#155e75" />
        </linearGradient>
        <radialGradient id="wfGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="wfScreenGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#67e8f9" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#67e8f9" stopOpacity="0" />
        </radialGradient>
      </defs>
      <g opacity="0.16" stroke="#ffffff" strokeWidth="1">
        <line x1="30" y1="35" x2="80" y2="58" />
        <line x1="80" y1="58" x2="55" y2="95" />
        <line x1="80" y1="58" x2="130" y2="40" />
      </g>
      <ellipse cx="230" cy="272" rx="185" ry="16" fill="url(#wfGlow)" opacity="0.5" />
      <path d="M118,258 C165,278 215,268 255,246 C280,232 300,232 322,222" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="3" strokeDasharray="1 9" strokeLinecap="round" />
      <g>
        <polygon points="95,240 121,225 95,210 69,225" fill="url(#wfTopFace)" />
        <polygon points="69,225 95,240 95,270 69,255" fill="url(#wfLeftFace)" />
        <polygon points="95,240 121,225 121,255 95,270" fill="url(#wfRightFace)" />
      </g>
      <g>
        <polygon points="95,210 121,195 95,180 69,195" fill="url(#wfTopFace)" />
        <polygon points="69,195 95,210 95,240 69,225" fill="url(#wfLeftFace)" />
        <polygon points="95,210 121,195 121,225 95,240" fill="url(#wfRightFace)" />
      </g>
      <g>
        <polygon points="95,180 121,165 95,150 69,165" fill="url(#wfTopFace)" />
        <polygon points="69,165 95,180 95,210 69,195" fill="url(#wfLeftFace)" />
        <polygon points="95,180 121,165 121,195 95,210" fill="url(#wfRightFace)" />
        <polygon points="73,171 95,183 95,201 73,189" fill="url(#wfScreenGlow)" opacity="0.35" />
      </g>
      <motion.g animate={{ y: [0, -4, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>
        <polygon points="95,150 121,135 95,120 69,135" fill="url(#wfAccentTop)" />
        <polygon points="69,135 95,150 95,158 69,143" fill="url(#wfAccentLeft)" />
        <polygon points="95,150 121,135 121,143 95,158" fill="url(#wfAccentRight)" />
      </motion.g>
      <motion.circle
        cx="95"
        cy="100"
        r="3.5"
        fill="#67e8f9"
        animate={{ r: [3.5, 5.5, 3.5], opacity: [1, 0.4, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
    </motion.svg>
  );
}

export function LoginPage() {
  const { signIn, faceSignIn, verifyMfa } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // 🔒 DEVICE-LEVEL lockout
  const initialLockout = getDeviceLockout();
  const [error, setError] = useState<string | null>(initialLockout.message);
  const [lockoutSeconds, setLockoutSeconds] = useState(initialLockout.seconds);

  const [lastEmail] = useState<string>(() => {
    return localStorage.getItem(LAST_EMAIL_KEY) || "";
  });

  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaTempToken, setMfaTempToken] = useState("");
  const [mfaCode, setMfaCode] = useState("");
  const [mfaError, setMfaError] = useState<string | null>(null);
  const [mfaLoading, setMfaLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    defaultValues: {
      email: lastEmail,
      password: "",
    },
  });

  // 🔒 Check kung may session message (from another device login)
  useEffect(() => {
    const message = sessionStorage.getItem("wms_session_message");
    if (message) {
      setError(message);
      sessionStorage.removeItem("wms_session_message");
    }
  }, []);

  // 🔒 Countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError(null);
          localStorage.removeItem(DEVICE_LOCKOUT_KEY);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // 🔒 Sync sa visibility change at storage change
  useEffect(() => {
    const checkLockout = () => {
      const result = getDeviceLockout();
      if (result.seconds > 0) {
        setLockoutSeconds(result.seconds);
        setError("Too many login attempts.");
      } else {
        setLockoutSeconds(0);
        if (error === "Too many login attempts.") setError(null);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") checkLockout();
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DEVICE_LOCKOUT_KEY) checkLockout();
    };
    window.addEventListener("storage", handleStorageChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [error]);

  const isLocked = lockoutSeconds > 0;

  async function onSubmit(data: LoginForm) {
    if (isLocked) return;

    const normalizedEmail = data.email.toLowerCase().trim();
    localStorage.setItem(LAST_EMAIL_KEY, normalizedEmail);

    setIsLoading(true);
    setError(null);
    const res = await signIn(data.email, data.password);

    if (res.error) {
      if (res.error.lockedUntil) {
        const lockoutUntil = new Date(res.error.lockedUntil).getTime();
        localStorage.setItem(DEVICE_LOCKOUT_KEY, lockoutUntil.toString());
        const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
        setLockoutSeconds(remaining);
        setError("Too many login attempts.");
      } else if (res.error.secondsLeft && res.error.secondsLeft > 0) {
        const lockoutUntil = Date.now() + res.error.secondsLeft * 1000;
        localStorage.setItem(DEVICE_LOCKOUT_KEY, lockoutUntil.toString());
        setLockoutSeconds(res.error.secondsLeft);
        setError("Too many login attempts.");
      } else {
        setError(res.error.message);
      }
      setIsLoading(false);
      return;
    }

    if (res.requiresMfa && res.tempToken) {
      setMfaRequired(true);
      setMfaTempToken(res.tempToken);
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate("/"), 600);
  }

  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!mfaCode.trim()) {
      setMfaError("Please enter the 6-digit code from your authenticator app.");
      return;
    }
    setMfaLoading(true);
    setMfaError(null);
    const { error } = await verifyMfa(mfaTempToken, mfaCode.trim());
    if (error) {
      setMfaError(error.message);
      setMfaLoading(false);
      return;
    }
    setSuccess(true);
    setTimeout(() => navigate("/"), 600);
  }

  const [showFaceModal, setShowFaceModal] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [faceError, setFaceError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    async function loadModels() {
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Failed to load face-api models:", err);
        setModelsError("Unable to load face recognition models. Please check your internet connection.");
      }
    }
    loadModels();
  }, []);

  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera error:", err);
      setCameraError("Unable to access the camera. Please allow camera access in your browser.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  function openFaceModal() {
    setFaceError(null);
    setCameraError(null);
    setShowFaceModal(true);
  }

  function closeFaceModal() {
    stopCamera();
    setShowFaceModal(false);
  }

  useEffect(() => {
    if (showFaceModal) startCamera();
    return () => {
      if (!showFaceModal) stopCamera();
    };
  }, [showFaceModal]);

  async function handleFaceCapture() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !modelsLoaded) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setDetecting(true);
    setFaceError(null);
    try {
      const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setFaceError("No face detected. Please make sure you are clearly facing the camera.");
        setDetecting(false);
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      const res = await faceSignIn(descriptor);

      if (res.error) {
        if (res.error.lockedUntil) {
          const lockoutUntil = new Date(res.error.lockedUntil).getTime();
          localStorage.setItem(DEVICE_LOCKOUT_KEY, lockoutUntil.toString());
          const remaining = Math.ceil((lockoutUntil - Date.now()) / 1000);
          setLockoutSeconds(remaining);
          setFaceError("Too many login attempts.");
        } else if (res.error.secondsLeft && res.error.secondsLeft > 0) {
          const lockoutUntil = Date.now() + res.error.secondsLeft * 1000;
          localStorage.setItem(DEVICE_LOCKOUT_KEY, lockoutUntil.toString());
          setLockoutSeconds(res.error.secondsLeft);
          setFaceError("Too many login attempts.");
        } else {
          setFaceError(res.error.message);
        }
        setDetecting(false);
        return;
      }

      if (res.requiresMfa && res.tempToken) {
        closeFaceModal();
        setMfaRequired(true);
        setMfaTempToken(res.tempToken);
        setDetecting(false);
        return;
      }

      try {
        await api.checkInMe("biometric");
      } catch (checkinErr: any) {
        console.warn("Auto check-in skipped:", checkinErr.message);
      }

      closeFaceModal();
      setSuccess(true);
      setTimeout(() => navigate("/"), 600);
    } catch (err) {
      console.error("Face login error:", err);
      setFaceError("Verification failed. Please try again.");
    } finally {
      setDetecting(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
        <BackgroundOrbs />
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: BOUNCE_EASE }}
          className="relative z-10 text-center"
        >
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.6, ease: BOUNCE_EASE }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-500/50"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, duration: 0.4, ease: BOUNCE_EASE }}
            >
              <Check className="w-12 h-12 text-white" strokeWidth={3} />
            </motion.div>
          </motion.div>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5, ease: SMOOTH_EASE }}
            className="text-2xl font-bold text-foreground"
          >
            Welcome back!
          </motion.p>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            className="text-sm text-muted-foreground mt-2"
          >
            Redirecting to your dashboard...
          </motion.p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background relative overflow-hidden">
      <BackgroundOrbs />

      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, ease: SMOOTH_EASE }}
        className="hidden lg:flex flex-col w-[480px] bg-sidebar relative overflow-hidden z-10"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-transparent" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col h-full p-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6, ease: SMOOTH_EASE }}
            className="flex items-center gap-3"
          >
            <motion.img
              src={logo}
              alt="Tri-M Global Logistics & Trading Inc."
              animate={{ rotate: [0, 6, -6, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              className="w-10 h-10 rounded-xl object-contain bg-white p-1 shadow-lg"
            />
            <div>
              <p className="text-white font-semibold">Tri-M Global</p>
              <p className="text-white/50 text-xs">Logistics & Trading Inc.</p>
            </div>
          </motion.div>

          <div className="flex-1 flex items-center justify-center py-4">
            <WorkforceIllustration />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.7, ease: SMOOTH_EASE }}
            className="mt-auto space-y-6"
          >
            <div>
              <h1 className="text-4xl font-bold text-white leading-tight">
                Manage Your<br />Workforce<br />
                <span className="text-primary">Smarter</span>
              </h1>
              <p className="mt-4 text-white/60 text-sm leading-relaxed">
                Complete workforce management — attendance, shifts, leaves, timesheets, and analytics — all in one platform.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Employees Tracked", value: "2,400+" },
                { label: "Attendance Rate", value: "98.2%" },
                { label: "Departments", value: "24" },
                { label: "Reports Generated", value: "1,200+" },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + i * 0.12, duration: 0.5, ease: SMOOTH_EASE }}
                  whileHover={{ scale: 1.04, y: -3 }}
                  className="bg-white/5 rounded-xl p-3 border border-white/10 cursor-default backdrop-blur-sm"
                >
                  <p className="text-white font-semibold text-lg">{stat.value}</p>
                  <p className="text-white/50 text-xs">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>

      <div className="flex-1 relative overflow-hidden flex items-center justify-center p-4 sm:p-8 z-10">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.15) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.94 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, ease: SMOOTH_EASE, delay: 0.15 }}
          className="relative z-10 w-full max-w-[440px]"
        >
          <div className="flex lg:hidden items-center gap-3 mb-6 justify-center">
            <motion.img
              src={logo}
              alt="Tri-M Global"
              animate={{ scale: [1, 1.06, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
              className="w-10 h-10 rounded-xl object-contain bg-white p-1 shadow-md"
            />
            <div>
              <p className="font-semibold text-foreground text-sm">Tri-M Global</p>
              <p className="text-xs text-muted-foreground">Logistics & Trading Inc.</p>
            </div>
          </div>

          <div className="bg-background/95 backdrop-blur-xl rounded-3xl border border-border shadow-[0_30px_80px_-20px_rgba(124,58,237,0.25)] overflow-hidden">
            <div className="relative overflow-hidden bg-gradient-to-r from-primary via-violet-600 to-indigo-600 px-6 sm:px-8 py-7">
              <motion.div
                animate={{
                  background: [
                    "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15), transparent 50%)",
                    "radial-gradient(circle at 80% 50%, rgba(255,255,255,0.15), transparent 50%)",
                    "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.15), transparent 50%)",
                  ],
                }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 pointer-events-none"
              />

              <motion.div
                animate={{ x: ["-150%", "250%"] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1.8 }}
                className="absolute inset-y-0 w-40 bg-gradient-to-r from-transparent via-white/15 to-transparent -skew-x-12 pointer-events-none"
              />

              <div className="relative z-10">
                {!mfaRequired && <AnimatedLogo />}
                <motion.h2
                  key={mfaRequired ? "mfa" : "login"}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.5, ease: SMOOTH_EASE }}
                  className="text-xl sm:text-2xl font-bold text-white text-center"
                >
                  {mfaRequired ? "Two-Factor Verification" : "Welcome back"}
                </motion.h2>
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                  className="mt-1 text-white/70 text-xs sm:text-sm text-center"
                >
                  {mfaRequired
                    ? "Enter the 6-digit code from your authenticator app"
                    : "Sign in to your workspace account"}
                </motion.p>
              </div>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <AnimatePresence mode="wait">
                {mfaRequired ? (
                  <motion.form
                    key="mfa-form"
                    initial={{ opacity: 0, x: 30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    transition={{ duration: 0.4, ease: SMOOTH_EASE }}
                    onSubmit={handleMfaSubmit}
                    className="space-y-5"
                  >
                    {mfaError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: "auto" }}
                        className="flex items-start gap-3 p-3.5 bg-destructive/10 border border-destructive/20 rounded-lg"
                      >
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                        <p className="text-sm text-destructive">{mfaError}</p>
                      </motion.div>
                    )}

                    <div className="flex justify-center">
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center"
                      >
                        <ShieldCheck className="w-8 h-8 text-primary" />
                      </motion.div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground text-center block">
                        Verification code
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="123456"
                        autoFocus
                        className="w-full px-3 py-3 text-center text-2xl tracking-[0.5em] font-mono border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-300"
                        maxLength={6}
                      />
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      type="submit"
                      disabled={mfaLoading || mfaCode.length < 6}
                      className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                    >
                      {mfaLoading ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Verifying...</>
                      ) : "Verify & Sign In"}
                    </motion.button>

                    <button
                      type="button"
                      onClick={() => {
                        setMfaRequired(false);
                        setMfaTempToken("");
                        setMfaCode("");
                        setMfaError(null);
                      }}
                      className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors duration-300"
                    >
                      ← Back to login
                    </button>
                  </motion.form>
                ) : (
                  <motion.div
                    key="login-form"
                    initial={{ opacity: 0, x: -30 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 30 }}
                    transition={{ duration: 0.4, ease: SMOOTH_EASE }}
                    className="space-y-5"
                  >
                    <AnimatePresence>
                      {error && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, height: 0 }}
                          animate={{ opacity: 1, y: 0, height: "auto" }}
                          exit={{ opacity: 0, y: -10, height: 0 }}
                          transition={{ duration: 0.3, ease: SMOOTH_EASE }}
                          className="flex items-center gap-3 p-3.5 bg-destructive/10 border border-destructive/20 rounded-lg overflow-hidden"
                        >
                          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                          <p className="text-sm text-destructive">
                            {isLocked
                              ? `Too many login attempts. Try again in ${formatMMSS(lockoutSeconds)}.`
                              : error}
                          </p>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7, duration: 0.5, ease: SMOOTH_EASE }}
                        className="space-y-1.5"
                      >
                        <label className="text-sm font-medium text-foreground">Email address</label>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors duration-300 group-focus-within:text-primary" />
                          <input
                            {...register("email")}
                            type="email"
                            autoComplete="email"
                            disabled={isLocked || isLoading}
                            className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                            placeholder="you@company.com"
                          />
                        </div>
                        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.8, duration: 0.5, ease: SMOOTH_EASE }}
                        className="space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-foreground">Password</label>
                          <button type="button" className="text-xs text-primary hover:underline transition-all duration-300">
                            Forgot password?
                          </button>
                        </div>
                        <div className="relative group">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors duration-300 group-focus-within:text-primary" />
                          <input
                            {...register("password")}
                            type={showPassword ? "text" : "password"}
                            autoComplete="current-password"
                            disabled={isLocked || isLoading}
                            className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
                            placeholder="••••••••"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((s) => !s)}
                            aria-label={showPassword ? "Hide password" : "Show password"}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-300"
                          >
                            <AnimatePresence mode="wait" initial={false}>
                              <motion.span
                                key={showPassword ? "eye-off" : "eye"}
                                initial={{ opacity: 0, scale: 0.7 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.7 }}
                                transition={{ duration: 0.2 }}
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </motion.span>
                            </AnimatePresence>
                          </button>
                        </div>
                        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
                      </motion.div>

                      <motion.button
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9, duration: 0.5, ease: SMOOTH_EASE }}
                        whileHover={{ scale: isLocked || isLoading ? 1 : 1.02, y: isLocked || isLoading ? 0 : -2 }}
                        whileTap={{ scale: isLocked || isLoading ? 1 : 0.98 }}
                        type="submit"
                        disabled={isLoading || isLocked}
                        className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors duration-300 flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                      >
                        {isLocked ? (
                          `Locked (${formatMMSS(lockoutSeconds)})`
                        ) : isLoading ? (
                          <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</>
                        ) : "Sign In"}
                      </motion.button>
                    </form>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 1.0, duration: 0.5 }}
                      className="relative flex items-center gap-3"
                    >
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">or continue with</span>
                      <div className="flex-1 h-px bg-border" />
                    </motion.div>

                    <motion.button
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1, duration: 0.5, ease: SMOOTH_EASE }}
                      whileHover={{ scale: isLocked ? 1 : 1.02, y: isLocked ? 0 : -2 }}
                      whileTap={{ scale: isLocked ? 1 : 0.98 }}
                      type="button"
                      onClick={openFaceModal}
                      disabled={isLocked}
                      className="w-full py-2.5 px-4 border border-border rounded-lg flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors duration-300 text-sm font-medium text-foreground disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <motion.span
                        animate={{ scale: [1, 1.15, 1] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <Fingerprint className="w-4 h-4 text-primary" />
                      </motion.span>
                      Sign in with Biometrics
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.5 }}
            className="text-center text-xs text-muted-foreground mt-6"
          >
            Protected by biometric &amp; multi-factor security
          </motion.p>
        </motion.div>
      </div>

      <Dialog open={showFaceModal} onOpenChange={(open) => { if (!open) closeFaceModal(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Sign in with Face ID</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {faceError && (
              <div className="flex items-start gap-2 p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {faceError}
              </div>
            )}
            {!modelsLoaded && !modelsError && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Loading face recognition models...
              </p>
            )}
            {modelsError && <p className="text-xs text-destructive">{modelsError}</p>}
            <div className="relative rounded-xl overflow-hidden bg-muted aspect-video flex items-center justify-center border border-border">
              {cameraError ? (
                <p className="text-xs text-destructive text-center px-4">{cameraError}</p>
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <p className="text-xs text-muted-foreground text-center">Face the camera clearly, then click the button below.</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={closeFaceModal} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                type="button"
                onClick={handleFaceCapture}
                disabled={detecting || !modelsLoaded || !!cameraError}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors flex items-center gap-1.5"
              >
                {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {detecting ? "Verifying..." : "Verify Face"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}