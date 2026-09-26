// src/app/pages/Biometric.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Fingerprint, Eye, Plus, Shield,
  ShieldCheck, ShieldAlert, CheckCircle2, Loader2, Camera, RotateCcw, X,
  Pencil, Trash2, RefreshCw, Eraser, Copy, Check, MonitorSmartphone,
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
};
const deviceColors: Record<string, string> = {
  fingerprint: "text-purple-600 bg-purple-50",
  face_id: "text-blue-600 bg-blue-50",
};

const AUTO_PIN_TYPES = ["fingerprint"];
const PIN_BASED_TYPES = ["fingerprint"];

const POLL_MS = 20000;
const emptyForm = { employee_id: "", device_type: "face_id", device_name: "", credential_id: "" };

type BiometricStats = {
  totalEmployees: number;
  enrolledEmployees: number;
  pendingEmployees: number;
  totalCredentials: number;
  enrollmentRate: number;
};
const emptyStats: BiometricStats = {
  totalEmployees: 0, enrolledEmployees: 0, pendingEmployees: 0, totalCredentials: 0, enrollmentRate: 0,
};

export function BiometricPage() {
  const [tab, setTab] = useState<"credentials" | "logs">("credentials");
  const [credentials, setCredentials] = useState<BiometricCredential[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [stats, setStats] = useState<BiometricStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);

  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [editingCredential, setEditingCredential] = useState<any | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [faceDescriptor, setFaceDescriptor] = useState<number[] | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [generatingPin, setGeneratingPin] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinCopied, setPinCopied] = useState(false);

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [clearingAll, setClearingAll] = useState(false);

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
      setCameraError("Unable to access the camera. Please allow camera access in your browser and make sure no other app is using it.");
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
      setFormError("Face recognition models are still loading. Please wait a moment.");
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
        setFormError("No face detected. Make sure you are clearly facing the camera, then try again.");
        setDetecting(false);
        return;
      }

      setFaceDescriptor(Array.from(detection.descriptor));
      setPhotoData(canvas.toDataURL("image/jpeg", 0.85));
      stopCamera();
    } catch (err) {
      console.error("Face detection error:", err);
      setFormError("Something went wrong while detecting the face. Please try again.");
    } finally {
      setDetecting(false);
    }
  }

  function retakePhoto() {
    setPhotoData(null);
    setFaceDescriptor(null);
    startCamera();
  }

  async function requestNewPin() {
    setGeneratingPin(true);
    setPinError(null);
    try {
      const { credential_id } = await api.generateDevicePin();
      setForm((f) => ({ ...f, credential_id }));
    } catch (err: any) {
      setPinError(err.message ?? "Failed to generate Device PIN. Please try again.");
    } finally {
      setGeneratingPin(false);
    }
  }

  async function copyPin() {
    if (!form.credential_id) return;
    try {
      await navigator.clipboard.writeText(form.credential_id);
      setPinCopied(true);
      setTimeout(() => setPinCopied(false), 1500);
    } catch {
      // Clipboard access denied — silently ignore, PIN is still visible on screen.
    }
  }

  function openEnrollModal() {
    setEditingCredential(null);
    setForm(emptyForm);
    setFormError(null);
    setPinError(null);
    setPinCopied(false);
    setPhotoData(null);
    setFaceDescriptor(null);
    setCameraError(null);
    setShowEnrollModal(true);
  }

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
    setPinCopied(false);
    setPhotoData(cred.photo_data ?? null);
    setFaceDescriptor(null);
    setCameraError(null);
    setShowEnrollModal(true);
  }

  function closeEnrollModal() {
    stopCamera();
    setShowEnrollModal(false);
    setEditingCredential(null);
  }

  useEffect(() => {
    if (showEnrollModal && form.device_type === "face_id" && !photoData) {
      startCamera();
    }
    return () => {
      if (!showEnrollModal) stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showEnrollModal, form.device_type, photoData]);

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
      setFormError("Please select an employee.");
      return;
    }
    if (form.device_type === "face_id" && !photoData) {
      setFormError("Please capture a photo using the camera before saving.");
      return;
    }
    if (form.device_type === "face_id" && !editingCredential && !faceDescriptor) {
      setFormError("No face was detected in the photo. Please try capturing again.");
      return;
    }
    if (form.device_type === "fingerprint" && !editingCredential && !form.credential_id) {
      setFormError("Device PIN has not been generated yet. Click 'Regenerate' or try again.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        device_name: form.device_name || (form.device_type === "face_id" ? "Camera Face ID" : "Fingerprint Scanner"),
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
      setFormError(err.message ?? "Failed to save credential.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(cred: any) {
    const confirmed = window.confirm(
      `Are you sure you want to remove the ${cred.device_type.replace("_", " ")} credential for ${cred.employee?.full_name ?? "this employee"}?\n\nIt will no longer be usable for punch in/out, but the record remains for the audit trail.`
    );
    if (!confirmed) return;

    setDeletingId(cred.id);
    try {
      await api.deleteBiometricCredential(cred.id);
      fetchAll(false);
    } catch (err: any) {
      alert(err.message ?? "Failed to remove credential.");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleClearAll() {
    if (credentials.length === 0) return;
    const confirmed = window.confirm(
      `Are you sure you want to clear ALL ${credentials.length} biometric credentials?\n\nEach employee will need to re-enroll before they can punch in/out using biometrics. This will still be recorded in the Audit Logs.`
    );
    if (!confirmed) return;

    setClearingAll(true);
    try {
      const result = await api.clearAllBiometricCredentials();
      alert(`Cleared ${result.cleared} credentials. You can enroll again now.`);
      fetchAll(false);
    } catch (err: any) {
      alert(err.message ?? "Failed to clear all credentials.");
    } finally {
      setClearingAll(false);
    }
  }

  const totalCredentials = credentials.length;
  const activeCredentials = credentials.filter((c) => c.is_active).length;

  const getEmpName = (c: any) => c.employee?.full_name ?? "Unknown Employee";
  const getEmpCode = (c: any) => c.employee?.employee_code ?? "—";

  const isFingerprint = form.device_type === "fingerprint";
  // Once a fingerprint credential already exists, its PIN must never change —
  // the physical template captured on the desktop scanner app is keyed to the
  // ORIGINAL PIN (see fidToCredentialId mapping in the C# bridge). Changing it
  // here would orphan that template and the employee would stop matching.
  const pinLocked = isFingerprint && !!editingCredential;

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-violet-600 to-indigo-700 p-5 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Fingerprint className="w-6 h-6 sm:w-7 sm:h-7" /> Biometric Authentication
            </h1>
            <p className="text-white/70 text-xs sm:text-sm mt-1">Manage face recognition and fingerprint access control</p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 shrink-0">
            {[
              { label: "Total Credentials", value: totalCredentials },
              { label: "Active", value: activeCredentials },
              { label: "Coverage", value: `${stats.enrollmentRate}%` },
            ].map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl px-2 py-2 sm:px-4 border border-white/20 text-center">
                <p className="text-white/60 text-[10px] sm:text-xs">{s.label}</p>
                <p className="text-white font-bold text-sm sm:text-xl">{s.value}</p>
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl p-4 border border-emerald-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Security Level</p>
                  <p className="font-semibold text-emerald-700 truncate">{modelsLoaded ? "Face Recognition Active" : "Loading Models..."}</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-card rounded-2xl p-4 border border-border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Enrollment Rate</p>
                  <p className="font-semibold text-foreground truncate">{stats.enrollmentRate}% Employees</p>
                </div>
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl p-4 border border-amber-200 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-5 h-5 text-amber-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Pending Enrollment</p>
                  <p className="font-semibold text-amber-700 truncate">{stats.pendingEmployees} Employees</p>
                </div>
              </div>
            </motion.div>
          </div>

          {modelsError && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">{modelsError}</div>
          )}

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex gap-1 bg-muted rounded-xl p-1 w-fit">
              <button onClick={() => setTab("credentials")} className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "credentials" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Credentials</button>
              <button onClick={() => setTab("logs")} className={`px-3 sm:px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === "logs" ? "bg-card shadow text-foreground" : "text-muted-foreground hover:text-foreground"}`}>Auth Logs</button>
            </div>

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
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{credentials.length} credentials registered</p>
                <button onClick={openEnrollModal} className="flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors w-full sm:w-auto">
                  <Plus className="w-4 h-4" /> Enroll Device
                </button>
              </div>
              {credentials.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-10">No biometric credentials registered.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {credentials.map((cred: any, i) => {
                    const Icon = deviceIcon[cred.device_type] ?? Fingerprint;
                    return (
                      <motion.div key={cred.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                        className="bg-card rounded-2xl p-4 border border-border shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            {cred.photo_data ? (
                              <img src={cred.photo_data} alt={getEmpName(cred)} className="w-10 h-10 rounded-xl object-cover shrink-0" />
                            ) : (
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${deviceColors[cred.device_type] ?? "text-gray-600 bg-gray-50"}`}>
                                <Icon className="w-5 h-5" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-foreground text-sm truncate">{getEmpName(cred)}</p>
                              <p className="text-xs text-muted-foreground font-mono truncate">{getEmpCode(cred)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium whitespace-nowrap ${cred.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                              {cred.is_active ? "Active" : "Inactive"}
                            </span>
                            <button
                              onClick={() => openEditModal(cred)}
                              title="Edit credential"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(cred)}
                              disabled={deletingId === cred.id}
                              title="Remove credential"
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                            >
                              {deletingId === cred.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                          <div className="min-w-0"><p className="text-muted-foreground">Device</p><p className="font-medium text-foreground truncate">{cred.device_name ?? "—"}</p></div>
                          <div className="min-w-0"><p className="text-muted-foreground">Type</p><p className="font-medium text-foreground capitalize truncate">{cred.device_type.replace("_", " ")}</p></div>
                          {PIN_BASED_TYPES.includes(cred.device_type) && (
                            <div className="min-w-0"><p className="text-muted-foreground">Device PIN</p><p className="font-medium text-foreground font-mono truncate">{cred.credential_id || "—"}</p></div>
                          )}
                          <div className="min-w-0"><p className="text-muted-foreground">Registered</p><p className="font-medium text-foreground truncate">{cred.registered_at?.slice(0, 10)}</p></div>
                          <div className="min-w-0"><p className="text-muted-foreground">Last Used</p><p className="font-medium text-foreground truncate">{cred.last_used_at ?? "Never"}</p></div>
                        </div>
                        {PIN_BASED_TYPES.includes(cred.device_type) && !cred.last_used_at && (
                          <div className="mt-2.5 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                            <MonitorSmartphone className="w-3.5 h-3.5 shrink-0" />
                            Awaiting fingerprint scan on the desktop enrollment app.
                          </div>
                        )}
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
                <table className="w-full min-w-[500px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Employee</th>
                      <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Last Used</th>
                      <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Method</th>
                      <th className="text-left px-4 sm:px-5 py-3.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {credentials.filter((c) => c.last_used_at).length === 0 && (
                      <tr><td colSpan={4} className="px-5 py-10 text-center text-sm text-muted-foreground">No auth logs found.</td></tr>
                    )}
                    {credentials.filter((c) => c.last_used_at).map((cred) => (
                      <tr key={cred.id} className="hover:bg-muted/20 transition-colors">
                        <td className="px-4 sm:px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs shrink-0">
                              {getEmpName(cred).split(" ").map((n: string) => n[0]).join("")}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground whitespace-nowrap">{getEmpName(cred)}</p>
                              <p className="text-xs text-muted-foreground font-mono whitespace-nowrap">{getEmpCode(cred)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-5 py-4 text-sm font-mono text-muted-foreground whitespace-nowrap">{cred.last_used_at}</td>
                        <td className="px-4 sm:px-5 py-4">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${deviceColors[cred.device_type] ?? "text-gray-600 bg-gray-50"}`}>
                            {cred.device_type.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 sm:px-5 py-4">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 whitespace-nowrap">
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

      <Dialog open={showEnrollModal} onOpenChange={(open) => { if (!open) closeEnrollModal(); }}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingCredential ? "Edit Credential" : "Enroll Device"}</DialogTitle></DialogHeader>
          <form onSubmit={handleEnroll} className="space-y-4">
            {formError && <div className="p-2.5 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">{formError}</div>}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Employee</label>
              <select value={form.employee_id} onChange={(e) => setForm({ ...form, employee_id: e.target.value })} disabled={!!editingCredential}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60">
                <option value="">Select employee</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>{emp.full_name}</option>
                ))}
              </select>
              {editingCredential && (
                <p className="text-xs text-muted-foreground">Employee cannot be changed. Delete and re-enroll if needed.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Device Type</label>
              <select value={form.device_type}
                onChange={(e) => {
                  setPhotoData(null);
                  setFaceDescriptor(null);
                  setPinError(null);
                  setForm({ ...form, device_type: e.target.value, credential_id: "" });
                }}
                disabled={!!editingCredential}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60">
                <option value="face_id">Face ID (Camera)</option>
                <option value="fingerprint">Fingerprint</option>
              </select>
              {editingCredential && (
                <p className="text-xs text-muted-foreground">Device type cannot be changed. Delete and re-enroll if needed.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Device Name (optional)</label>
              <input value={form.device_name} onChange={(e) => setForm({ ...form, device_name: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-lg border border-border bg-input-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                placeholder={form.device_type === "face_id" ? "e.g. Front Desk Camera" : "e.g. Front Desk Scanner"} />
            </div>

            {AUTO_PIN_TYPES.includes(form.device_type) && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Device PIN (auto-generated)</label>
                {pinError && <p className="text-xs text-destructive">{pinError}</p>}
                <div className="flex items-center gap-2">
                  <input value={generatingPin ? "Generating PIN..." : form.credential_id || "—"} readOnly
                    className="flex-1 px-3.5 py-2.5 rounded-lg border border-border bg-muted text-sm font-mono text-muted-foreground cursor-not-allowed tracking-widest" />
                  <button type="button" onClick={copyPin} disabled={!form.credential_id} title="Copy PIN"
                    className="w-10 h-10 shrink-0 rounded-lg border border-border flex items-center justify-center hover:bg-muted/50 transition-colors disabled:opacity-50">
                    {pinCopied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                  </button>
                  {!pinLocked && (
                    <button type="button" onClick={requestNewPin} disabled={generatingPin} title="Generate new PIN"
                      className="w-10 h-10 shrink-0 rounded-lg border border-border flex items-center justify-center hover:bg-muted/50 transition-colors disabled:opacity-50">
                      {generatingPin ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    </button>
                  )}
                </div>
                {pinLocked ? (
                  <p className="text-xs text-muted-foreground">
                    This PIN is locked because it's already linked to a captured fingerprint on the scanner. Delete and re-enroll to issue a new one.
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    This is the PIN entered on the fingerprint hardware when a scan matches. Automatically generated — no duplicates.
                  </p>
                )}
              </div>
            )}

            {isFingerprint && !editingCredential && (
              <div className="rounded-xl border border-border bg-muted/30 p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MonitorSmartphone className="w-3.5 h-3.5" /> Next: finish enrollment sa scanner PC
                </p>
                <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                  <li>I-save muna ang PIN na ito (o i-copy gamit ang button sa itaas).</li>
                  <li>Sa scanner PC, buksan ang Biometric Enrollment app, i-click ang <span className="font-medium text-foreground">Initialize</span> pagkatapos <span className="font-medium text-foreground">Open</span>.</li>
                  <li>Ilagay ang PIN sa Employee PIN field, tapos i-click ang <span className="font-medium text-foreground">Enroll</span>.</li>
                  <li>Pindutin ang parehong daliri 3 beses hanggang lumabas ang "enroll succ".</li>
                  <li>Awtomatikong ise-save ang fingerprint template sa backend — babalik dito ang status na "Active" pag na-detect na ang unang punch.</li>
                </ol>
              </div>
            )}

            {form.device_type === "face_id" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" /> Capture Photo
                </label>
                {!modelsLoaded && !modelsError && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading face recognition models...
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
                      {detecting ? "Detecting face..." : "Capture"}
                    </button>
                  )}
                  {photoData && (
                    <button type="button" onClick={retakePhoto} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      <RotateCcw className="w-4 h-4" /> Retake
                    </button>
                  )}
                  {cameraError && (
                    <button type="button" onClick={startCamera} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors">
                      Try Again
                    </button>
                  )}
                </div>
                {faceDescriptor && (
                  <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" /> Face detected, ready to save.
                  </p>
                )}
                {editingCredential && !faceDescriptor && photoData && (
                  <p className="text-xs text-muted-foreground">Keeping the old photo, or click "Retake" to capture a new one.</p>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
              <button type="button" onClick={closeEnrollModal} className="px-4 py-2 text-sm rounded-lg border border-border hover:bg-muted/50 transition-colors flex items-center justify-center gap-1.5">
                <X className="w-3.5 h-3.5" /> Cancel
              </button>
              <button
                type="submit"
                disabled={saving || (form.device_type === "fingerprint" && !editingCredential && generatingPin)}
                className="px-4 py-2 text-sm bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-60 transition-colors"
              >
                {saving
                  ? "Saving..."
                  : editingCredential
                  ? "Save Changes"
                  : isFingerprint
                  ? "Save PIN & Continue on Scanner"
                  : "Enroll Device"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}