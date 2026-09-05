import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Eye, EyeOff, Fingerprint, AlertCircle, Loader2, Camera, X, Mail, Lock } from "lucide-react";
import { motion } from "motion/react";
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

// ---------------------------------------------------------------------------
// v2: Isometric "attendance pipeline" illustration, restructured para mas
// hawig sa "Automated Logistics" reference composition (truck -> conveyor ->
// server cluster -> robot arm) pero pinalitan ng workforce-attendance na
// katumbas: check-in kiosk (kapalit ng truck) -> conveyor ng badges ->
// analytics tower cluster (kapalit ng warehouse racks) -> biometric scanner
// arm (kapalit ng robot arm). Parehong palette pa rin: violet/indigo body,
// cyan accent para sa "live/active" elements — walang bagong kulay na idinagdag.
// ---------------------------------------------------------------------------
function WorkforceIllustration() {
  return (
    <svg
      viewBox="0 0 420 300"
      className="w-full h-auto max-w-[400px]"
      role="img"
      aria-label="Isometric na check-in kiosk na nagpapadala ng employee badges papunta sa attendance analytics tower sa pamamagitan ng biometric scanner arm"
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

      {/* Ambient background network — subtle lang, parang data mesh */}
      <g opacity="0.16" stroke="#ffffff" strokeWidth="1">
        <line x1="30" y1="35" x2="80" y2="58" />
        <line x1="80" y1="58" x2="55" y2="95" />
        <line x1="80" y1="58" x2="130" y2="40" />
        <circle cx="30" cy="35" r="3" fill="#ffffff" stroke="none" />
        <circle cx="80" cy="58" r="3" fill="#ffffff" stroke="none" />
        <circle cx="55" cy="95" r="3" fill="#ffffff" stroke="none" />
        <circle cx="130" cy="40" r="3" fill="#ffffff" stroke="none" />
      </g>

      {/* Soft ground shadow — mas mahaba, sumasakop sa buong kiosk-to-tower span */}
      <ellipse cx="230" cy="272" rx="185" ry="16" fill="url(#wfGlow)" opacity="0.5" />

      {/* Conveyor path: mula sa kiosk (katumbas ng truck) papunta sa tower cluster */}
      <path
        d="M118,258 C165,278 215,268 255,246 C280,232 300,232 322,222"
        fill="none"
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="3"
        strokeDasharray="1 9"
        strokeLinecap="round"
      />

      {/* ===================== CHECK-IN KIOSK (kapalit ng truck) ===================== */}
      {/* Base block */}
      <g>
        <polygon points="95,240 121,225 95,210 69,225" fill="url(#wfTopFace)" />
        <polygon points="69,225 95,240 95,270 69,255" fill="url(#wfLeftFace)" />
        <polygon points="95,240 121,225 121,255 95,270" fill="url(#wfRightFace)" />
      </g>
      {/* Mid block */}
      <g>
        <polygon points="95,210 121,195 95,180 69,195" fill="url(#wfTopFace)" />
        <polygon points="69,195 95,210 95,240 69,225" fill="url(#wfLeftFace)" />
        <polygon points="95,210 121,195 121,225 95,240" fill="url(#wfRightFace)" />
      </g>
      {/* Screen block — may badge icon, parang display ng kiosk */}
      <g>
        <polygon points="95,180 121,165 95,150 69,165" fill="url(#wfTopFace)" />
        <polygon points="69,165 95,180 95,210 69,195" fill="url(#wfLeftFace)" />
        <polygon points="95,180 121,165 121,195 95,210" fill="url(#wfRightFace)" />
        {/* screen glow sa left face */}
        <polygon points="73,171 95,183 95,201 73,189" fill="url(#wfScreenGlow)" opacity="0.35" />
        <rect x="77" y="174" width="14" height="18" rx="2" fill="#155e75" opacity="0.85" transform="skewY(-16)" />
      </g>
      {/* Accent cap — parang "live/active" indicator sa itaas ng kiosk */}
      <g>
        <polygon points="95,150 121,135 95,120 69,135" fill="url(#wfAccentTop)" />
        <polygon points="69,135 95,150 95,158 69,143" fill="url(#wfAccentLeft)" />
        <polygon points="95,150 121,135 121,143 95,158" fill="url(#wfAccentRight)" />
      </g>
      {/* Antenna/signal sa taas ng kiosk */}
      <line x1="95" y1="120" x2="95" y2="104" stroke="rgba(255,255,255,0.3)" strokeWidth="2" />
      <circle cx="95" cy="100" r="3.5" fill="#67e8f9" className="animate-pulse" />

      {/* ===================== FLOATING BADGES sa conveyor ===================== */}
      {/* Badge 1 — checkmark (naaprubahang attendance) */}
      <g>
        <polygon points="165,270 175,264 165,258 155,264" fill="url(#wfTopFace)" />
        <polygon points="155,264 165,270 165,282 155,276" fill="url(#wfLeftFace)" />
        <polygon points="165,270 175,264 175,276 165,282" fill="url(#wfRightFace)" />
        <path d="M160,264.5 L163.5,268 L170,261.5" fill="none" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Badge 2 — shift clock */}
      <g>
        <polygon points="218,254 228,248 218,242 208,248" fill="url(#wfTopFace)" />
        <polygon points="208,248 218,254 218,266 208,260" fill="url(#wfLeftFace)" />
        <polygon points="218,254 228,248 228,260 218,266" fill="url(#wfRightFace)" />
        <circle cx="218" cy="248" r="4.5" fill="none" stroke="white" strokeWidth="1.3" />
        <path d="M218,245 L218,248 L220.3,249.6" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
      </g>

      {/* Badge 3 — fingerprint, papalapit na sa tower cluster, accent cyan */}
      <g className="animate-pulse">
        <polygon points="275,238 286,231.5 275,225 264,231.5" fill="url(#wfAccentTop)" />
        <polygon points="264,231.5 275,238 275,251 264,244.5" fill="url(#wfAccentLeft)" />
        <polygon points="275,238 286,231.5 286,244.5 275,251" fill="url(#wfAccentRight)" />
        <path
          d="M275,228.5 a4,4 0 0 1 4,4 v2 a4,4 0 0 1 -1,2.6 M271,232.5 a4,4 0 0 1 8,0 v3"
          fill="none"
          stroke="white"
          strokeWidth="1"
          strokeLinecap="round"
        />
      </g>

      {/* ===================== ANALYTICS TOWER CLUSTER (kapalit ng warehouse racks) ===================== */}
      {/* Tower A — maikli, kaliwa ng cluster */}
      <g>
        <polygon points="322,236 342,225 322,214 302,225" fill="url(#wfTopFace)" />
        <polygon points="302,225 322,236 322,262 302,251" fill="url(#wfLeftFace)" />
        <polygon points="322,236 342,225 342,251 322,262" fill="url(#wfRightFace)" />
      </g>
      <g>
        <polygon points="322,210 342,199 322,188 302,199" fill="url(#wfTopFace)" />
        <polygon points="302,199 322,210 322,214 302,225" fill="url(#wfLeftFace)" />
        <polygon points="322,210 342,199 342,225 322,236" fill="url(#wfRightFace)" />
      </g>

      {/* Tower B — pinakamataas, gitna ng cluster, may accent top */}
      <g>
        <polygon points="365,246 385,235 365,224 345,235" fill="url(#wfTopFace)" />
        <polygon points="345,235 365,246 365,272 345,261" fill="url(#wfLeftFace)" />
        <polygon points="365,246 385,235 385,261 365,272" fill="url(#wfRightFace)" />
      </g>
      <g>
        <polygon points="365,216 385,205 365,194 345,205" fill="url(#wfTopFace)" />
        <polygon points="345,205 365,216 365,235 345,224" fill="url(#wfLeftFace)" />
        <polygon points="365,216 385,205 385,224 365,235" fill="url(#wfRightFace)" />
      </g>
      <g>
        <polygon points="365,186 385,175 365,164 345,175" fill="url(#wfTopFace)" />
        <polygon points="345,175 365,186 365,205 345,194" fill="url(#wfLeftFace)" />
        <polygon points="365,186 385,175 385,194 365,205" fill="url(#wfRightFace)" />
      </g>
      <g>
        <polygon points="365,156 385,145 365,134 345,145" fill="url(#wfAccentTop)" />
        <polygon points="345,145 365,156 365,175 345,164" fill="url(#wfAccentLeft)" />
        <polygon points="365,156 385,145 385,164 365,175" fill="url(#wfAccentRight)" />
      </g>

      {/* Tower C — maikli, kanan ng cluster */}
      <g>
        <polygon points="400,240 418,230 400,220 382,230" fill="url(#wfTopFace)" />
        <polygon points="382,230 400,240 400,262 382,252" fill="url(#wfLeftFace)" />
        <polygon points="400,240 418,230 418,252 400,262" fill="url(#wfRightFace)" />
      </g>
      <g>
        <polygon points="400,216 418,206 400,196 382,206" fill="url(#wfTopFace)" />
        <polygon points="382,206 400,216 400,230 382,220" fill="url(#wfLeftFace)" />
        <polygon points="400,216 418,206 418,220 400,230" fill="url(#wfRightFace)" />
      </g>

      {/* ===================== BIOMETRIC SCANNER ARM (kapalit ng robot arm) ===================== */}
      {/* Dalawang segment na "arm" na nakausli mula sa gitnang tower papunta sa papalapit na badge */}
      <g opacity="0.95">
        <line x1="358" y1="150" x2="320" y2="182" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" />
        <line x1="320" y1="182" x2="288" y2="212" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" />
        <circle cx="358" cy="150" r="5" fill="#7c3aed" />
        <circle cx="320" cy="182" r="4.5" fill="#7c3aed" />
        {/* Scanner head/claw sa dulo ng arm, nakaturo sa fingerprint badge */}
        <g className="animate-pulse">
          <polygon points="288,206 296,201.5 288,197 280,201.5" fill="url(#wfAccentTop)" />
          <polygon points="280,201.5 288,206 288,214 280,209.5" fill="url(#wfAccentLeft)" />
          <polygon points="288,206 296,201.5 296,209.5 288,214" fill="url(#wfAccentRight)" />
        </g>
        <path
          d="M282,214 A18,18 0 0 1 275,231"
          fill="none"
          stroke="#22d3ee"
          strokeWidth="2"
          strokeLinecap="round"
          opacity="0.7"
          className="animate-pulse"
        />
      </g>
    </svg>
  );
}

export function LoginPage() {
  const { signIn, faceSignIn } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  async function onSubmit(data: LoginForm) {
    setIsLoading(true);
    setError(null);
    const { error } = await signIn(data.email, data.password);
    if (error) {
      setError(error.message);
      setIsLoading(false);
    } else {
      navigate("/");
    }
  }

  // --- Face ID login modal state ---
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
        setModelsError("Hindi ma-load ang face recognition models. I-check ang internet connection.");
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
      setCameraError("Hindi ma-access ang camera. Siguraduhing pinahintulutan ang camera access.");
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        setFaceError("Walang mukhang na-detect. Siguraduhing malinaw kang nakaharap sa camera, tapos subukan ulit.");
        setDetecting(false);
        return;
      }

      const descriptor = Array.from(detection.descriptor);
      const { error } = await faceSignIn(descriptor);
      if (error) {
        setFaceError(error.message);
        setDetecting(false);
        return;
      }

      // Awtomatikong i-check-in kung may naka-link na employee record ang na-verify na account.
      // Hindi natin hinaharang ang login kahit mag-fail ito (hal. wala pang shift ngayong araw,
      // o naka-check-in na — hindi 'yan dapat pigilan ang pagpasok sa app).
      try {
        await api.checkInMe("biometric");
      } catch (checkinErr: any) {
        console.warn("Auto check-in skipped:", checkinErr.message);
      }

      closeFaceModal();
      navigate("/");
    } catch (err) {
      console.error("Face login error:", err);
      setFaceError("Nagkaproblema sa pag-verify. Subukan ulit.");
    } finally {
      setDetecting(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-background selection:bg-primary/25 selection:text-foreground">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-[480px] bg-sidebar relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-transparent to-transparent" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col h-full p-12">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Tri-M Global Logistics & Trading Inc." className="w-10 h-10 rounded-xl object-contain bg-white p-1" />
            <div>
              <p className="text-white font-semibold">Tri-M Global</p>
              <p className="text-white/50 text-xs">Logistics & Trading Inc.</p>
            </div>
          </div>

          {/* Isometric illustration sa gitna ng panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.6 }}
            className="flex-1 flex items-center justify-center py-4"
          >
            <WorkforceIllustration />
          </motion.div>

          <div className="mt-auto space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h1 className="text-4xl font-bold text-white leading-tight">
                Manage Your<br />Workforce<br />
                <span className="text-primary">Smarter</span>
              </h1>
              <p className="mt-4 text-white/60 text-sm leading-relaxed">
                Complete workforce management — attendance, shifts, leaves, timesheets, and analytics — all in one platform.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Employees Tracked", value: "2,400+" },
                { label: "Attendance Rate", value: "98.2%" },
                { label: "Departments", value: "24" },
                { label: "Reports Generated", value: "1,200+" },
              ].map((stat) => (
                <div key={stat.label} className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <p className="text-white font-semibold text-lg">{stat.value}</p>
                  <p className="text-white/50 text-xs">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center p-8"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(124,58,237,0.10) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        {/* Decorative blurred accents — kapareho ng palette ng left panel */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-cyan-400/10 blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-[420px]"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-6">
            <img src={logo} alt="Tri-M Global" className="w-9 h-9 rounded-xl object-contain bg-white p-1" />
            <p className="font-semibold text-foreground">Tri-M Global</p>
          </div>

          <div className="bg-background rounded-2xl border border-border shadow-[0_8px_30px_rgba(124,58,237,0.08)] p-8 space-y-7">
            <div className="-m-8 mb-0 p-6 rounded-t-2xl bg-gradient-to-r from-primary to-indigo-600">
              <h2 className="text-2xl font-bold text-white">Welcome back</h2>
              <p className="mt-1 text-white/70 text-sm">
                Sign in to your workspace account
              </p>
            </div>

            {error && (
              <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    {...register("email")}
                    type="email"
                    autoComplete="email"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                    placeholder="you@company.com"
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <button type="button" className="text-xs text-primary hover:underline">
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    {...register("password")}
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </button>
            </form>

            <div className="relative flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">or continue with</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            <button
              type="button"
              onClick={openFaceModal}
              className="w-full py-2.5 px-4 border border-border rounded-lg flex items-center justify-center gap-2 hover:bg-muted/50 transition-colors text-sm font-medium text-foreground"
            >
              <Fingerprint className="w-4 h-4 text-primary" />
              Sign in with Biometrics
            </button>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Protected by biometric &amp; multi-factor security
          </p>
        </motion.div>
      </div>

      {/* Face ID Login Modal */}
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
                <Loader2 className="w-3 h-3 animate-spin" /> Naglo-load ng face recognition models...
              </p>
            )}
            {modelsError && (
              <p className="text-xs text-destructive">{modelsError}</p>
            )}
            <div className="relative rounded-xl overflow-hidden bg-muted aspect-video flex items-center justify-center border border-border">
              {cameraError ? (
                <p className="text-xs text-destructive text-center px-4">{cameraError}</p>
              ) : (
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <p className="text-xs text-muted-foreground text-center">Harapin ang camera nang malinaw, tapos i-click ang button sa ibaba.</p>
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
                {detecting ? "Ni-verify..." : "Verify Face"}
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}