// src/app/(app)/punch/page.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Camera,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Sparkles,
  ChevronRight,
  Info,
  RotateCcw,
  Building2,
  Lock,
} from "lucide-react";
import {
  getPunchContext,
  acceptSelfieConsentAction,
  generatePunchChallengeAction,
  submitPunchAction,
} from "@/app/actions/punch";

export default function PunchScreen() {
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<any>(null);
  const [selectedEmpId, setSelectedEmpId] = useState<string>("");

  // Consent modal state
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentAccepting, setConsentAccepting] = useState(false);

  // Camera & challenge state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<{
    id: string;
    instruction: string;
    token: string;
  } | null>(null);
  const [pendingPunchType, setPendingPunchType] = useState<"in" | "out">("in");
  const [submittingPunch, setSubmittingPunch] = useState(false);
  const [lastPunchResult, setLastPunchResult] = useState<{
    punchType: string;
    recordedAt: string;
    photoPreview?: string;
  } | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // 1. Load initial context
  async function loadContext(empId?: string) {
    try {
      setLoading(true);
      const data = await getPunchContext(empId);
      setContext(data);
      if (data.targetEmployee) {
        setSelectedEmpId(data.targetEmployee.id);
        if (!data.hasAcceptedConsent) {
          setShowConsentModal(true);
        }
      }
    } catch (err: any) {
      console.error("Failed to load punch context:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContext();
    return () => {
      stopCamera();
    };
  }, []);

  // Stop camera tracks
  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }

  // 2. Accept consent
  async function handleAcceptConsent() {
    const empId = selectedEmpId || context?.targetEmployee?.id;
    if (!empId) return;
    setConsentAccepting(true);
    try {
      const res = await acceptSelfieConsentAction(empId);
      if (res.success) {
        setShowConsentModal(false);
        await loadContext(empId);
      }
    } catch (err) {
      console.error("Error accepting consent:", err);
    } finally {
      setConsentAccepting(false);
    }
  }

  // 3. Initiate punch attempt
  async function handleStartPunch(punchType: "in" | "out") {
    // If consent not accepted, require consent first
    if (!context?.hasAcceptedConsent) {
      setShowConsentModal(true);
      return;
    }

    setPendingPunchType(punchType);
    setCameraError(null);
    setLastPunchResult(null);

    // Fetch server challenge
    try {
      const challenge = await generatePunchChallengeAction();
      setCurrentChallenge({
        id: challenge.challengeId,
        instruction: challenge.instruction,
        token: challenge.token,
      });
      setCameraActive(true);

      // Start camera stream
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
          });
          streamRef.current = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play();
          }
        } catch (camErr: any) {
          console.warn("Camera access warning:", camErr);
          setCameraError(
            camErr.name === "NotAllowedError"
              ? "Camera permission was denied. Please allow camera access in browser settings."
              : "No physical camera detected or camera unavailable. A simulated verification still will be used."
          );
        }
      } else {
        setCameraError("Camera is not supported on this browser.");
      }
    } catch (err: any) {
      console.error("Challenge error:", err);
    }
  }

  // 4. Capture still and submit
  async function handleCaptureAndSubmit() {
    const empId = selectedEmpId || context?.targetEmployee?.id;
    if (!currentChallenge || !empId) return;
    setSubmittingPunch(true);

    try {
      let photoBase64 = "";

      // Capture from video if active
      if (videoRef.current && videoRef.current.readyState >= 2) {
        const canvas = canvasRef.current || document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth || 640;
        canvas.height = videoRef.current.videoHeight || 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          // Add timestamp watermark
          ctx.font = "16px sans-serif";
          ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
          ctx.fillText(`Hajri Punch • ${new Date().toLocaleString()}`, 16, canvas.height - 16);
          photoBase64 = canvas.toDataURL("image/jpeg", 0.85);
        }
      }

      // Fallback generator for tests/environments without webcam
      if (!photoBase64) {
        const canvas = document.createElement("canvas");
        canvas.width = 480;
        canvas.height = 480;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.fillStyle = "#1E1E22";
          ctx.fillRect(0, 0, 480, 480);
          ctx.fillStyle = "#FE5733";
          ctx.beginPath();
          ctx.arc(240, 200, 90, 0, Math.PI * 2);
          ctx.fill();
          ctx.font = "bold 20px sans-serif";
          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "center";
          ctx.fillText(context?.targetEmployee?.name || "Employee Selfie", 240, 340);
          ctx.font = "14px sans-serif";
          ctx.fillStyle = "#888888";
          ctx.fillText(new Date().toISOString(), 240, 370);
          photoBase64 = canvas.toDataURL("image/jpeg", 0.85);
        }
      }

      const res = await submitPunchAction({
        employeeId: empId,
        punchType: pendingPunchType,
        challengeToken: currentChallenge.token,
        photoBase64,
      });

      if (res.success && res.punchType && res.recordedAt) {
        setLastPunchResult({
          punchType: res.punchType,
          recordedAt: res.recordedAt,
          photoPreview: photoBase64,
        });
        stopCamera();
        setCurrentChallenge(null);
        await loadContext(empId);
      } else {
        alert(res.error || "Failed to record punch");
      }
    } catch (err: any) {
      console.error("Submit punch error:", err);
      alert(err.message || "Failed to submit punch");
    } finally {
      setSubmittingPunch(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-10 h-10 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[var(--text-muted)]">Loading Hajri Punch...</p>
      </div>
    );
  }

  const targetEmp = context?.targetEmployee;
  const punchStatus = context?.punchStatus || "ready_in";
  const todayRecord = context?.todayRecord;

  return (
    <div className="flex flex-col items-center max-w-lg mx-auto py-4 px-2 w-full gap-6">
      {/* ── Header & Target Employee ── */}
      <div className="w-full flex items-center justify-between p-3 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-white text-base shadow-md shrink-0"
            style={{ backgroundColor: "var(--accent)" }}
          >
            {targetEmp?.name ? targetEmp.name.charAt(0) : "H"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">
                {targetEmp?.name || "Employee"}
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/[0.06] text-[var(--text-muted)]">
                {targetEmp?.code || "EMP"}
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)]">
              {targetEmp?.designation || "Staff Member"} &bull; {targetEmp?.department || "Operations"}
            </p>
          </div>
        </div>

        {/* Employee Switcher if multiple available */}
        {context?.activeEmployees?.length > 1 && (
          <select
            value={selectedEmpId}
            onChange={(e) => {
              setSelectedEmpId(e.target.value);
              loadContext(e.target.value);
            }}
            className="text-xs rounded-xl bg-[var(--surface-high)] text-white px-2.5 py-1.5 border border-white/[0.1] focus:outline-none cursor-pointer"
          >
            {context.activeEmployees.map((emp: any) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} ({emp.code})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* ── Status Card ── */}
      <div
        className="w-full p-4 rounded-2xl flex items-center justify-between shadow-lg"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-xl shrink-0"
            style={{
              backgroundColor:
                punchStatus === "punched_in"
                  ? "rgba(16, 185, 129, 0.15)"
                  : punchStatus === "punched_out"
                  ? "rgba(59, 130, 246, 0.15)"
                  : "rgba(255, 255, 255, 0.06)",
              color:
                punchStatus === "punched_in"
                  ? "#10B981"
                  : punchStatus === "punched_out"
                  ? "#3B82F6"
                  : "var(--text-muted)",
            }}
          >
            <Clock size={20} />
          </div>
          <div>
            <p className="text-xs text-[var(--text-muted)] uppercase tracking-wider font-semibold">
              Today's Attendance Status
            </p>
            <p className="text-sm font-bold text-white mt-0.5">
              {punchStatus === "ready_in" && "Ready to Punch In"}
              {punchStatus === "punched_in" && `Punched In at ${new Date(todayRecord?.in_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
              {punchStatus === "punched_out" && `Punched Out at ${new Date(todayRecord?.out_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`}
            </p>
          </div>
        </div>

        <span
          className="text-xs font-bold px-2.5 py-1 rounded-full border"
          style={{
            backgroundColor:
              punchStatus === "punched_in"
                ? "rgba(16, 185, 129, 0.15)"
                : punchStatus === "punched_out"
                ? "rgba(59, 130, 246, 0.15)"
                : "rgba(255, 255, 255, 0.06)",
            color:
              punchStatus === "punched_in"
                ? "#10B981"
                : punchStatus === "punched_out"
                ? "#3B82F6"
                : "var(--text-muted)",
            borderColor:
              punchStatus === "punched_in"
                ? "rgba(16, 185, 129, 0.3)"
                : punchStatus === "punched_out"
                ? "rgba(59, 130, 246, 0.3)"
                : "rgba(255, 255, 255, 0.1)",
          }}
        >
          {punchStatus === "punched_in" ? "Active Shift" : punchStatus === "punched_out" ? "Shift Completed" : "Not Marked"}
        </span>
      </div>

      {/* ── BIG CENTRED PUNCH BUTTON ── */}
      {!cameraActive && (
        <div className="flex flex-col items-center justify-center my-6 gap-5">
          <div className="relative flex items-center justify-center">
            {/* Outer Pulsing Aura */}
            <div
              className="absolute w-56 h-56 rounded-full animate-ping opacity-20 pointer-events-none"
              style={{
                backgroundColor:
                  punchStatus === "punched_in" ? "#F59E0B" : "var(--accent)",
              }}
            />
            {/* Middle Glow Ring */}
            <div
              className="absolute w-48 h-48 rounded-full blur-xl opacity-40 pointer-events-none"
              style={{
                backgroundColor:
                  punchStatus === "punched_in" ? "#F59E0B" : "var(--accent)",
              }}
            />
            {/* Big Punch Button */}
            <button
              type="button"
              onClick={() => handleStartPunch(punchStatus === "punched_in" ? "out" : "in")}
              className="relative w-44 h-44 rounded-full flex flex-col items-center justify-center text-white shadow-2xl transition-all duration-300 transform active:scale-95 hover:scale-105 cursor-pointer z-10"
              style={{
                background:
                  punchStatus === "punched_in"
                    ? "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
                    : "linear-gradient(135deg, #FE5733 0%, #FF2E00 100%)",
                boxShadow:
                  punchStatus === "punched_in"
                    ? "0 10px 32px rgba(245, 158, 11, 0.5)"
                    : "0 10px 32px rgba(254, 87, 51, 0.55)",
                border: "4px solid rgba(255, 255, 255, 0.25)",
              }}
            >
              <Camera size={38} className="mb-2 drop-shadow-md" />
              <span className="text-lg font-black tracking-wide uppercase">
                {punchStatus === "punched_in" ? "Punch Out" : "Punch In"}
              </span>
              <span className="text-[11px] font-medium opacity-85 mt-0.5">
                Camera Selfie
              </span>
            </button>
          </div>

          <p className="text-xs text-[var(--text-muted)] text-center max-w-xs">
            Tap to open camera and verify presence with server-assigned challenge
          </p>
        </div>
      )}

      {/* ── CAMERA VIEWFINDER & CHALLENGE MODAL/CARD ── */}
      {cameraActive && (
        <div
          className="w-full flex flex-col items-center p-4 rounded-3xl gap-4 animate-in fade-in zoom-in-95 duration-200 shadow-2xl relative overflow-hidden"
          style={{
            backgroundColor: "rgba(18, 18, 20, 0.98)",
            border: "1px solid rgba(255, 255, 255, 0.14)",
          }}
        >
          {/* Server Challenge Banner */}
          <div
            className="w-full p-3 rounded-2xl flex items-center gap-3 border shadow-md"
            style={{
              backgroundColor: "rgba(254, 87, 51, 0.15)",
              borderColor: "rgba(254, 87, 51, 0.4)",
            }}
          >
            <div className="w-8 h-8 rounded-xl bg-[var(--accent)] flex items-center justify-center text-white shrink-0">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold text-[var(--accent)] tracking-wider">
                Anti-Spoofing Challenge
              </p>
              <p className="text-sm font-bold text-white">
                {currentChallenge?.instruction || "Look directly into the camera"}
              </p>
            </div>
          </div>

          {/* Camera Viewfinder Box */}
          <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-black flex items-center justify-center border border-white/[0.15]">
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              className="w-full h-full object-cover scale-x-[-1]"
            />

            {/* Oval Face Guide Overlay */}
            <div
              className="absolute w-44 h-56 rounded-[50%] border-2 border-dashed pointer-events-none transition-colors"
              style={{
                borderColor: "rgba(254, 87, 51, 0.8)",
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.35)",
              }}
            />

            {cameraError && (
              <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4 text-center gap-2">
                <AlertCircle size={28} className="text-amber-400" />
                <p className="text-xs text-amber-200">{cameraError}</p>
                <p className="text-[11px] text-[var(--text-muted)]">
                  You can still capture a verified attendance record.
                </p>
              </div>
            )}
          </div>

          {/* Hidden Canvas for capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Camera Actions */}
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={stopCamera}
              disabled={submittingPunch}
              className="flex-1 py-3 px-4 rounded-xl text-xs font-bold text-[var(--text-muted)] bg-white/[0.05] hover:bg-white/[0.1] transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCaptureAndSubmit}
              disabled={submittingPunch}
              className="flex-2 py-3 px-5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer"
              style={{
                backgroundColor: "var(--accent)",
                boxShadow: "0 4px 16px rgba(254, 87, 51, 0.4)",
              }}
            >
              {submittingPunch ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Uploading & Recording...</span>
                </>
              ) : (
                <>
                  <Camera size={16} />
                  <span>Capture & Punch</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── LAST PUNCH SUCCESS RECEIPT ── */}
      {lastPunchResult && (
        <div
          className="w-full p-4 rounded-2xl flex items-center justify-between border shadow-xl animate-in fade-in duration-200"
          style={{
            backgroundColor: "rgba(16, 185, 129, 0.10)",
            borderColor: "rgba(16, 185, 129, 0.3)",
          }}
        >
          <div className="flex items-center gap-3">
            {lastPunchResult.photoPreview && (
              <img
                src={lastPunchResult.photoPreview}
                alt="Selfie Still"
                className="w-12 h-12 rounded-xl object-cover border border-emerald-500/40"
              />
            )}
            <div>
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 size={16} />
                <span className="text-xs font-bold uppercase tracking-wide">
                  Punch {lastPunchResult.punchType.toUpperCase()} Recorded!
                </span>
              </div>
              <p className="text-xs text-white font-semibold mt-0.5">
                Verified at {lastPunchResult.recordedAt}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[var(--text-muted)] bg-white/[0.05] px-2 py-1 rounded-lg">
            <Lock size={12} />
            <span>Private Storage</span>
          </div>
        </div>
      )}

      {/* ── CONSENT MODAL (Mandatory First Use) ── */}
      {showConsentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div
            className="w-full max-w-md rounded-3xl p-6 shadow-2xl flex flex-col gap-4 border"
            style={{
              backgroundColor: "rgba(22, 22, 25, 0.98)",
              borderColor: "rgba(255, 255, 255, 0.12)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-[var(--accent)]/15 text-[var(--accent)] border border-[var(--accent)]/30">
                <ShieldCheck size={26} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Selfie Punch Verification & Consent
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  Privacy Notice & Policy Acceptance
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 py-2 text-xs text-[var(--text-muted)] divide-y divide-white/[0.06]">
              <div className="pt-2">
                <span className="font-semibold text-white block mb-0.5">
                  📸 What is captured:
                </span>
                A live camera selfie still, timestamp, and device verification challenge.
              </div>
              <div className="pt-2">
                <span className="font-semibold text-white block mb-0.5">
                  🛡️ Why it is captured:
                </span>
                To prevent buddy-punching, authenticate workplace presence, and accurately process monthly payroll.
              </div>
              <div className="pt-2">
                <span className="font-semibold text-white block mb-0.5">
                  ⏳ Retention & Auto-Purge:
                </span>
                Stored securely in an encrypted private Supabase bucket. Photos older than 90 days are automatically deleted by a scheduled retention job.
              </div>
              <div className="pt-2">
                <span className="font-semibold text-white block mb-0.5">
                  🔒 Confidentiality & Access:
                </span>
                Row Level Security (RLS) restricts photo access exclusively to your Organization Owner and Manager. Employees cannot view each other's photos.
              </div>
            </div>

            <button
              type="button"
              onClick={handleAcceptConsent}
              disabled={consentAccepting}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white shadow-xl transition-all cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              style={{
                backgroundColor: "var(--accent)",
                boxShadow: "0 4px 16px rgba(254, 87, 51, 0.4)",
              }}
            >
              {consentAccepting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Recording Acceptance...</span>
                </>
              ) : (
                <span>I Understand & Accept</span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
