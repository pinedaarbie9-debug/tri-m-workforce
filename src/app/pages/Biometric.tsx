// src/app/pages/Biometric.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Fingerprint, Smartphone, CreditCard, Eye, Plus, Shield,
  ShieldCheck, ShieldAlert, CheckCircle2, Loader2, Camera, RotateCcw, X,
  Pencil, Trash2, RefreshCw, Eraser,
} from "lucide-react";
import { motion } from "motion/react";
import * as faceapi from "face-api.js";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { api } from "../../lib/api";
import type { BiometricCredential } from "../../types";

const MODEL_URL = "https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights";

const deviceIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  fingerprint: Fingerprint,
  face_id: Eye,
  card: CreditCard,
  pin: Smartphone,
};
const deviceColors: Record<string, string> = {
  fingerprint: "text-purple-600 bg-purple-50",
  face_id: "text-blue-600 bg-blue-50",
  card: "text-emerald-600 bg-emerald-50",
  pin: "text-amber-600 bg-amber-50",
};

// Device types na gumagamit ng Device PIN / credential_id.
// FIX: hinati natin ito ngayon sa dalawa —
//  - "fingerprint": AUTO-GENERATED na ng server, read-only sa UI, hindi na
//    kailangang mag-type ang admin.
//  - "card" / "pin": manual pa rin dahil galing ito sa PHYSICAL na card/PIN
//    na binibigay ng employee (walang paraan ito i-auto-generate).
const AUTO_PIN_TYPES = ["fingerprint"];
const MANUAL_PIN_TYPES = ["card", "pin"];
const PIN_BASED_TYPES = [...AUTO_PIN_TYPES, ...MANUAL_PIN_TYPES];

const POLL_MS = 20000;
const emptyForm = { employee_id: "", device_type: "face_id", device_name: "", credential_id: "" };

// Tugma ito sa response shape ng GET /biometric-credentials/stats
type BiometricStats = {
  totalEmployees: number;
  enrolledEmployees: number;
  pendingEmployees: number;
  totalCredentials: number;
  enrollmentRate: number; // 0-100, distinct employees na ang basehan — hindi na pwedeng lumagpas
};
const emptyStats: BiometricStats = {
  totalEmployees: 0,
  enrolledEmployees: 0,
  pendingEmployees: 0,
  totalCredentials: 0,
  enrollmentRate: 0,
};

export function BiometricPage() {
  const [tab, setTab] = useState<"credentials" | "logs">("credentials");
  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [stats, setStats] = useState<BiometricStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Face-api.js model loading ---
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  // --- Enroll/Edit modal state ---
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editingCredential, setEditingCredential] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // BAGO: state para sa auto-generate ng Device PIN (fingerprint)
  const [generatingPin, setGeneratingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);

  // state para sa delete confirmation at deleting spinner per-card
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // BAGO: state para sa "Clear All Credentials"
  const [clearingAll, setClearingAll] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // I-load ang AI models isang beses lang, pagbukas ng page
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

  const fetchAll = useCallback(async (showSpinner = true) => {
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const [creds, biometricStats, emps] = await Promise.all([
        api.getBiometricCredentials(),
        api.getBiometricStats(),
        api.getEmployees(),
      ]);
      setCredentials(creds);
      setStats(biometricStats);
      setEmployees(emps);
    } catch (err: any) {
      console.error("Failed to fetch credentials:", err);
      setError(err.message ?? "Failed to load credentials");
    } finally {
      if (showSpinner) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(() => fetchAll(false), POLL_MS);
    return () => clearInterval(interval);
  }, [fetchAll]);

  // --- Camera handling ---
  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraError("Hindi ma-access ang camera. Siguraduhing pinahintulutan mo ang camera access sa browser, at walang ibang app na gumagamit nito.");
    }
  }

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    if (!modelsLoaded) {
      setFormError("Naglo-load pa ang face recognition models. Sandaling maghintay.");
      return;
    }

    setDetecting(true);
    setFormError(null);
    try {
      const detection = await faceapi
        .detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setFormError("Walang mukhang na-detect. Siguraduhing malinaw na nakaharap sa camera, tapos subukan ulit.");
        setDetecting(false);
        return;
      }

      setFaceDescriptor(Array.from(detection.descriptor));
      setPhotoData(canvas.toDataURL("image/jpeg", 0.85));
      stopCamera();
    } catch (err) {
      console.error("Face detection error:", err);
      setFormError("Nagkaproblema sa pag-detect ng mukha. Subukan ulit.");
    } finally {
      setDetecting(false);
    }
  }

  function retakePhoto() {
    setPhotoData(null);
    setFaceDescriptor(null);
    startCamera();
  }

  // BAGO — humingi ng bagong auto-generated PIN sa server. Ginagamit ito
  // pagbukas ng Enroll modal kung "fingerprint" ang default type, pagpalit
  // papuntang "fingerprint", at sa "Regenerate" button.
  async function requestNewPin() {
    setGeneratingPin(true);
    setPinError(null);
    try {
      const { credential_id } = await api.generateDevicePin();
      setForm((f) => ({ ...f, credential_id }));
    } catch (err: any) {
      setPinError(err.message ?? "Hindi makagawa ng Device PIN. Subukan ulit.");
    } finally {
      setGeneratingPin(false);
    }
  }

  // Enroll mode: bagong credential
  function openEnrollModal() {
    setEditingCredential(null);
    setForm(emptyForm);
    setFormError(null);
    setPinError(null);
    setPhotoData(null);
    setFaceDescriptor(null);
    setCameraError(null);
    setShowEnrollModal(true);
  }

  // Edit mode: i-load ang existing values ng credential papunta sa form
  function openEditModal(cred: any) {
    setEditingCredential(cred);
    setForm({
      employee_id: cred.employee_id,
      device_type: cred.device_type,
      device_name: cred.device_name ?? "",
      credential_id: cred.credential_id ?? "",
    });
    setFormError(null);
    setPinError(null);
    setPhotoData(cred.photo_data ?? null);
    setFaceDescriptor(null); // hindi na natin uulitin ang face detection maliban kung mag-retake
    setCameraError(null);
    setShowEnrollModal(true);
  }

  function closeEnrollModal() {
    stopCamera();
    setShowEnrollModal(false);
    setEditingCredential(null);
  }

  // Camera dapat bukas lang kapag: face_id ang type, walang photo pa, AT
  // "Enroll" mode (bago) — o "Edit" mode pero pinili ng user na mag-retake.
  useEffect(() => {
    if (showEnrollModal && form.device_type === "face_id" && !photoData) {
      startCamera();
    }
    return () => {
      if (!showEnrollModal) stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEnrollModal, form.device_type, photoData]);

  // BAGO: kapag "fingerprint" ang napiling device type habang nasa Enroll
  // mode (hindi Edit) AT wala pang PIN, awtomatikong humingi ng bagong PIN
  // sa server — dito nawawala ang pangangailangang mag-type ang admin.
  useEffect(() => {
    if (
      showEnrollModal &&
      !editingCredential &&
      form.device_type === "fingerprint" &&
      !form.credential_id &&
      !generatingPin
    ) {
      requestNewPin();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEnrollModal, editingCredential, form.device_type]);

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!form.employee_id) {
      setFormError("Piliin ang empleyado.");
      return;
    }
    if (form.device_type === "face_id" && !photoData) {
      setFormError("Kumuha muna ng litrato gamit ang camera bago i-save.");
      return;
    }
    if (form.device_type === "face_id" && !editingCredential && !faceDescriptor) {
      setFormError("Walang na-detect na mukha sa litrato. Subukan ulit kumuha.");
      return;
    }
    // FIX: kung "fingerprint" ang type pero wala pa ring PIN dahil
    // nabigo ang auto-generate, huwag ipadala ang form — mas mabuting
    // mahuli dito kaysa magpadala ng blangkong PIN.
    if (form.device_type === "fingerprint" && !editingCredential && !form.credential_id) {
      setFormError("Hindi pa nakagawa ng Device PIN. Pindutin ang 'Regenerate' o subukan ulit.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        device_name: form.device_name || (form.device_type === "face_id" ? "Camera Face ID" : "Manual Device"),
        photo_data: photoData,
        face_descriptor: faceDescriptor,
      };

      if (editingCredential) {
        await api.updateBiometricCredential(editingCredential.id, payload);
      } else {
        await api.enrollBiometricDevice(payload);
      }
      closeEnrollModal();
      fetchAll(false);
    } catch (err: any) {
      setFormError(err.message ?? "Nabigo ang pag-save ng credential.");
    } finally {
      setSaving(false);
    }
  }

  // Delete/Deactivate ng isang credential
  async function handleDelete(cred: any) {
    const confirmed = window.confirm(
      `Sigurado ka bang gusto mong tanggalin ang ${cred.device_type.replace("_", " ")} credential ni ${cred.employee?.full_name ?? "empleyadong ito"}?\n\nHindi na ito magagamit para mag-punch, pero mananatili ang record para sa audit trail.`
    );
    if (!confirmed) return;

    setDeletingId(cred.id);
    try {
      await api.deleteBiometricCredential(cred.id);
      fetchAll(false);
    } catch (err: any) {
      alert(err.message ?? "Nabigo ang pagtanggal ng credential.");
    } finally {
      setDeletingId(null);
    }
  }

  // BAGO — Clear All Credentials. Soft-delete lahat (is_active = FALSE),
  // kaya mawawala agad sila dito sa listahan pero permanenteng nakatala
  // pa rin sa Audit Logs. Kailangang mag-re-enroll ulit ang lahat pagkatapos.
  async function handleClearAll() {
    if (credentials.length === 0) return;
    const confirmed = window.confirm(
      `Sigurado ka bang gusto mong i-clear ANG LAHAT ng ${credentials.length} biometric credentials?\n\nKailangan mag-re-enroll ulit ang bawat empleyado bago sila makapag-Time In/Out gamit ang biometric. Makikita pa rin ito sa Audit Logs.`
    );
    if (!confirmed) return;

    setClearingAll(true);
    try {
      const result = await api.clearAllBiometricCredentials();
      alert(`Na-clear ang ${result.cleared} credentials. Puwede nang mag-enroll ulit.`);
      fetchAll(false);
    } catch (err: any) {
      alert(err.message ?? "Nabigo ang pag-clear ng lahat ng credentials.");
    } finally {
      setClearingAll(false);
    }
  }

  const totalCredentials = credentials.length;
  const activeCredentials = credentials.filter((c) => c.is_active).length;

  const getEmpName = (c: any) => c.employee?.full_name ?? "Unknown Employee";
  const getEmpCode = (c: any) => c.employee?.employee_code ?? "—";

  return (
    <div className="p-6 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Fingerprint className="w-7 h-7" /> Biometric Authentication
            </h1>
            <p className="text-white/70 text-sm mt-1">Manage face recognition and biometric access control</p>
          </div>
          <div className="flex gap-3">
            {[
              { label: "Total Credentials", value: totalCredentials },
              { label: "Active", value: activeCredentials },
              { label: "Coverage", value: `${stats.enrollmentRate}%` },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl px-4 py-2 border border-white/20 text-center">
                <p className="text-white/60 text-xs">{s.label}</p>
                <p className="text-white font-bold text-xl">{s.value}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {loading && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading credentials...
        </div>
      )}
      {!loading && error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          Failed to load credentials: {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl p-4 border border-emerald-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Security Level</p>
                  <p className="font-semibold text-emerald-700">{modelsLoaded ? "Face Recognition Active" : "Loading Models..."}</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-card rounded-2xl p-4 border border-border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Enrollment Rate</p>
                  <p className="font-semibold text-foreground">{stats.enrollmentRate}% Employees</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl p-4 border border-amber-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending Enrollment</p>
                  <p className="font-semibold text-amber-700">{stats.pendingEmployees} Employees</p>
                </div>
              </div>
            </motion.div>
          </div>

          {modelsError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">{modelsError}</div>
          )}

          <div className="flex items-center justify-between">
            <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
              <button onClick={() => setTab("credentials")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "credentials" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Credentials</button>
              <button onClick={() => setTab("logs")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "logs" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Auth Logs</button>
            </div>

            {/* BAGO: Clear All Credentials button — nasa tabs row para
                laging makikita, hindi lang sa credentials tab */}
            {tab === "credentials" && credentials.length > 0 && (
              <button
                onClick={handleClearAll}
                disabled={clearingAll}
                className="flex items-center gap-2 px-3.5 py-2 text-sm border border-destructive/30 text-destructive rounded-xl hover:bg-destructive/10 transition-colors disabled:opacity-50"
              >
                {clearingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eraser className="w-4 h-4" />}
                Clear All Credentials
              </button>
            )}
          </div>

          {tab === "credentials" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">{credentials.length} credentials registered</p>
                <button onClick={openEnrollModal} className="flex items-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors">
                  <Plus className="w-4 h-4" /> Enroll Device
                </button>
              </div>
              {credentials.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">Walang biometric credential na naka-rehistro.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {credentials.map((cred: any, i) => {
                    const Icon = deviceIcon[cred.device_type] ?? Fingerprint;
                    return (
                      <motion.div key={cred.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-card rounded-2xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            {cred.photo_data ? (
                              <img src={cred.photo_data} alt={getEmpName(cred)} className="w-10 h-10 rounded-xl object-cover" />
                            ) : (
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${deviceColors[cred.device_type]}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-foreground text-sm">{getEmpName(cred)}</p>
                              <p className="text-xs text-muted-foreground font-mono">{getEmpCode(cred)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cred.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                              {cred.is_active ? "Active" : "Inactive"}
                            </span>
                            <button
                              onClick={() => openEditModal(cred)}
                              title="I-edit ang credential"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(cred)}
                              disabled={deletingId === cred.id}
                              title="Tanggalin ang credential"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                            >
                              {deletingId === cred.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                          <div><p className="text-muted-foreground">Device</p><p className="font-medium text-foreground truncate">{cred.device_name ?? "—"}</p></div>
                          <div><p className="text-muted-foreground">Type</p><p className="font-medium text-foreground capitalize">{cred.device_type.replace("_", " ")}</p></div>
                          {PIN_BASED_TYPES.includes(cred.device_type) && (
                            <div><p className="text-muted-foreground">Device PIN</p><p className="font-medium text-foreground font-mono">{cred.credential_id || "—"}</p></div>
                          )}
                          <div><p className="text-muted-foreground">Registered</p><p className="font-medium text-foreground">{cred.registered_at?.slice(0, 10)}</p></div>
                          <div><p className="text-muted-foreground">Last Used</p><p className="font-medium text-foreground">{cred.last_used_at ?? "Never"}</p></div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {tab === "logs" && (
            <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Employee</th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Last Used</th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Method</th>
                      <th className="text-left px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {credentials.filter((c) => c.last_used_at).length === 0 && (
                      <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">Walang auth log na nakita.</td></tr>
                    )}
                    {credentials.filter((c) => c.last_used_at).map((cred) => (
                      <tr key={cred.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs">
                              {getEmpName(cred).split(" ").map((n: string) => n[0]).join("")}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">{getEmpName(cred)}</p>
                              <p className="text-xs text-muted-foreground font-mono">{getEmpCode(cred)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-sm font-mono text-muted-foreground">{cred.last_used_at}</td>
                        <td className="px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${deviceColors[cred.device_type]}`}>
                            {cred.device_type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                            <CheckCircle2 className="w-3 h-3" /> Success
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Enroll/Edit Device Modal */}
      <Dialog open={showEnrollModal} onOpenChange={(open) => { if (!open) closeEnrollModal(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editingCredential ? "Edit Credential" : "Enroll Device"}</DialogTitle></DialogHeader>
          <form onSubmit={handleEnroll} className="space-y-4">
            {formError && <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{formError}</div>}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Employee</label>
              <select
                value={form.employee_id}
                onChange={(e) => setForm({ ...form, employee_id: e.target.value })}
                disabled={!!editingCredential}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              >
                <option value="">Piliin ang empleyado</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
              {editingCredential && (
                <p className="text-xs text-muted-foreground">Hindi na mababago ang empleyado. I-delete at mag-enroll ulit kung kailangan.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Device Type</label>
              <select
                value={form.device_type}
                onChange={(e) => {
                  setPhotoData(null);
                  setFaceDescriptor(null);
                  setPinError(null);
                  setForm({ ...form, device_type: e.target.value, credential_id: "" });
                }}
                disabled={!!editingCredential}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
              >
                <option value="face_id">Face ID (Camera)</option>
                <option value="fingerprint">Fingerprint</option>
                <option value="card">Access Card</option>
                <option value="pin">PIN</option>
              </select>
              {editingCredential && (
                <p className="text-xs text-muted-foreground">Hindi na mababago ang device type. I-delete at mag-enroll ulit kung kailangan.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Device Name (optional)</label>
              <input value={form.device_name} onChange={(e) => setForm({ ...form, device_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" placeholder="e.g. Front Desk Scanner" />
            </div>

            {/* FIX: Fingerprint — AUTO-GENERATED na Device PIN, read-only,
                may Regenerate button. Hindi na nagta-type ang admin nito. */}
            {AUTO_PIN_TYPES.includes(form.device_type) && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Device PIN (auto-generated)</label>
                {pinError && <p className="text-xs text-destructive">{pinError}</p>}
                <div className="flex items-center gap-2">
                  <input
                    value={generatingPin ? "Gumagawa ng PIN..." : form.credential_id || "—"}
                    readOnly
                    className="flex-1 px-3.5 py-2.5 rounded-lg border border-border bg-muted text-sm font-mono text-muted-foreground cursor-not-allowed"
                  />
                  <button
                    type="button"
                    onClick={requestNewPin}
                    disabled={generatingPin}
                    title="Bumuo ng bagong PIN"
                    className="w-10 h-10 shrink-0 rounded-lg border border-border flex items-center justify-center hover:bg-muted/50 transition-colors disabled:opacity-50"
                  >
                    {generatingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ito ang PIN na i-e-enter mismo ng fingerprint hardware kapag na-match ang scan. Awtomatiko itong nabubuo — walang duplicate.
                </p>
              </div>
            )}

            {/* Card / PIN — manual pa rin, dahil galing ito sa aktwal na
                physical card o PIN na ibinigay sa employee, hindi
                ma-a-auto-generate ng system. */}
            {MANUAL_PIN_TYPES.includes(form.device_type) && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Device PIN / Card ID</label>
                <input
                  value={form.credential_id}
                  onChange={(e) => setForm({ ...form, credential_id: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={form.device_type === "card" ? "e.g. CARD-00123" : "e.g. 1234"}
                />
              </div>
            )}

            {form.device_type === "face_id" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> Kumuha ng Litrato</label>
                {!modelsLoaded && !modelsError && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> Naglo-load ng face recognition models...
                  </p>
                )}
                <div className="relative rounded-xl overflow-hidden bg-muted aspect-video flex items-center justify-center border border-border">
                  {cameraError ? (
                    <p className="text-xs text-destructive text-center px-4">{cameraError}</p>
                  ) : photoData ? (
                    <img src={photoData} alt="Captured" className="w-full h-full object-cover" />
                  ) : (
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  )}
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <div className="flex gap-2">
                  {!photoData && !cameraError && (
                    <button type="button" onClick={capturePhoto} disabled={detecting || !modelsLoaded}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors">
                      {detecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                      {detecting ? "Dine-detect ang mukha..." : "Kunan"}
                    </button>
                  )}
                  {photoData && (
                    <button type="button" onClick={retakePhoto} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <RotateCcw className="w-4 h-4" /> Ulitin
                    </button>
                  )}
                  {cameraError && (
                    <button type="button" onClick={startCamera} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      Subukan Ulit
                    </button>
                  )}
                </div>
                {faceDescriptor && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" /> Na-detect ang mukha, handa nang i-save.
                  </p>
                )}
                {editingCredential && !faceDescriptor && photoData && (
                  <p className="text-xs text-muted-foreground">Panatilihin ang lumang litrato, o pindutin ang "Ulitin" para kumuha ng bago.</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={closeEnrollModal} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors flex items-center gap-1.5">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                type="submit"
                disabled={saving || (form.device_type === "fingerprint" && !editingCredential && generatingPin)}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {saving ? "Sine-save..." : editingCredential ? "I-save ang Changes" : "Enroll Device"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}