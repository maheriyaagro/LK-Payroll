// src/app/(app)/privacy/PrivacyClient.tsx
"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Clock,
  Camera,
  MapPin,
  MessageSquare,
  FileSpreadsheet,
  Check,
  X,
  ChevronRight,
  UserX,
  Scale,
  RefreshCw,
} from "lucide-react";
import {
  toggleConsentAction,
  submitErasureRequestAction,
  approveErasureRequestAction,
  rejectErasureRequestAction,
  updateRetentionPolicyAction,
} from "@/app/actions/privacy";
import type { ConsentPurpose } from "@/server/privacy";

interface ConsentItemState {
  granted: boolean;
  grantedAt?: string;
  noticeVersion?: string;
}

interface ErasureQueueItem {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  employeePhone: string;
  employeeDept: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
  rejectionReason?: string | null;
  details?: any;
}

interface RetentionPolicy {
  id: string;
  data_type: string;
  retention_days: number;
  description: string;
}

interface Props {
  userRole: string;
  currentOrg: any;
  initialEmployee: any;
  initialConsents: Record<ConsentPurpose, ConsentItemState>;
  initialMyRequests: any[];
  initialOrgQueue: ErasureQueueItem[];
  retentionPolicies: RetentionPolicy[];
}

export default function PrivacyClient({
  userRole,
  currentOrg,
  initialEmployee,
  initialConsents,
  initialMyRequests,
  initialOrgQueue,
  retentionPolicies,
}: Props) {
  const [consents, setConsents] = useState(initialConsents);
  const [myRequests, setMyRequests] = useState(initialMyRequests);
  const [orgQueue, setOrgQueue] = useState<ErasureQueueItem[]>(initialOrgQueue);
  const [policies, setPolicies] = useState<RetentionPolicy[]>(retentionPolicies);

  const [downloadingZip, setDownloadingZip] = useState(false);
  const [erasureSubmitting, setErasureSubmitting] = useState(false);
  const [erasureSuccessMsg, setErasureSuccessMsg] = useState("");
  const [erasureErrorMsg, setErasureErrorMsg] = useState("");

  const [isPending, startTransition] = useTransition();

  // Handler: Toggle Consent
  const handleToggleConsent = (purpose: ConsentPurpose) => {
    if (!initialEmployee?.id) {
      alert("No active employee record linked to your account.");
      return;
    }

    const currentVal = !!consents[purpose]?.granted;
    const newVal = !currentVal;

    // Optimistic UI update
    setConsents((prev) => ({
      ...prev,
      [purpose]: {
        granted: newVal,
        grantedAt: newVal ? new Date().toISOString() : undefined,
        noticeVersion: "v1.0",
      },
    }));

    startTransition(async () => {
      const res = await toggleConsentAction(initialEmployee.id, purpose, newVal, "v1.0");
      if (!res.success) {
        // Rollback
        setConsents((prev) => ({
          ...prev,
          [purpose]: { granted: currentVal },
        }));
        alert(res.error || "Failed to update consent");
      }
    });
  };

  // Handler: Download Personal Data ZIP
  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      const res = await fetch("/api/privacy/export");
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Failed to generate data archive");
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.setAttribute("download", `hajri-data-export-${initialEmployee?.code || "EMP"}.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err: any) {
      alert(err.message || "Failed to download data package.");
    } finally {
      setDownloadingZip(false);
    }
  };

  // Handler: Submit Erasure Request
  const handleSubmitErasure = () => {
    if (!initialEmployee?.id) {
      alert("No employee profile found.");
      return;
    }

    const confirmMsg =
      "Are you sure you want to request data erasure?\n\n" +
      "• All biometric selfie photos and location history will be permanently deleted upon owner approval.\n" +
      "• Personal contact details will be anonymised.\n" +
      "• Indian statutory law mandates that wage calculation registers and tax audit payroll lines are preserved.";

    if (!window.confirm(confirmMsg)) return;

    setErasureSubmitting(true);
    setErasureErrorMsg("");
    setErasureSuccessMsg("");

    startTransition(async () => {
      const res = await submitErasureRequestAction(
        initialEmployee.id,
        "Employee requested privacy erasure via self-service portal"
      );
      setErasureSubmitting(false);

      if (res.success) {
        setErasureSuccessMsg(
          "Your erasure request has been submitted to the organization owner for review."
        );
        setMyRequests((prev) => [
          {
            id: res.requestId,
            status: "pending",
            requested_at: new Date().toISOString(),
          },
          ...prev,
        ]);
      } else {
        setErasureErrorMsg(res.error || "Failed to submit erasure request.");
      }
    });
  };

  // Handler: Approve Erasure Request (Owner only)
  const handleApproveErasure = (requestId: string) => {
    if (
      !window.confirm(
        "Confirm approval: this will permanently delete facial verification selfies and anonymise this employee's contact records, while preserving statutory payroll records."
      )
    ) {
      return;
    }

    startTransition(async () => {
      const res = await approveErasureRequestAction(requestId);
      if (res.success) {
        setOrgQueue((prev) =>
          prev.map((item) =>
            item.id === requestId ? { ...item, status: "approved" } : item
          )
        );
      } else {
        alert(res.error || "Failed to approve erasure request.");
      }
    });
  };

  // Handler: Reject Erasure Request (Owner only)
  const handleRejectErasure = (requestId: string) => {
    const reason = window.prompt("Please enter a reason for rejection (e.g. active employment audit in progress):");
    if (!reason?.trim()) return;

    startTransition(async () => {
      const res = await rejectErasureRequestAction(requestId, reason);
      if (res.success) {
        setOrgQueue((prev) =>
          prev.map((item) =>
            item.id === requestId
              ? { ...item, status: "rejected", rejectionReason: reason }
              : item
          )
        );
      } else {
        alert(res.error || "Failed to reject erasure request.");
      }
    });
  };

  const isOwner = userRole === "owner";
  const isManagerOrOwner = userRole === "owner" || userRole === "manager";

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16 pt-2">
      {/* ── Breadcrumb & Header ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Link href="/more" className="hover:text-white transition-colors">
            More
          </Link>
          <ChevronRight size={12} />
          <span className="text-white">Privacy & Security</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3 mt-1">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: "var(--accent)" }}
              >
                <ShieldCheck size={20} />
              </div>
              Privacy & Consent Center
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Manage personal data access, purpose-specific capture consents, and data erasure requests.
            </p>
          </div>
        </div>
      </div>

      {/* ── Statutory Compliance Notice Banner ── */}
      <div
        className="p-4 rounded-2xl flex items-start gap-3.5"
        style={{
          backgroundColor: "rgba(59, 130, 246, 0.08)",
          border: "1px solid rgba(59, 130, 246, 0.25)",
        }}
      >
        <Scale size={20} className="text-blue-400 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed text-neutral-300">
          <p className="font-bold text-white mb-0.5">
            Statutory Retention & Privacy Rights Notice
          </p>
          Under the <strong>Digital Personal Data Protection (DPDP) Act</strong> and Indian Labour
          Laws (Payment of Wages Act & EPFO regulations), you have full transparency over your data.
          Capture features require active server-verified consent. While you may request erasure of biometric
          and personal contact data at any time, employers are required by law to retain wage calculation
          and tax records for statutory audits.
        </div>
      </div>

      {/* ── Section 1: Purpose-Specific Consent Log ── */}
      <div
        className="p-5 rounded-2xl flex flex-col gap-4"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Lock size={17} className="text-[var(--accent)]" />
              Purpose-Specific Consent Log
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Server-side verified consent gates for all employee data capture features.
            </p>
          </div>
          <span className="text-[11px] font-mono text-[var(--text-muted)] bg-white/5 px-2 py-0.5 rounded">
            Policy v1.0
          </span>
        </div>

        <div className="divide-y divide-white/[0.06] -mx-2">
          {/* Item A: Biometric Selfie */}
          <div className="p-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
              >
                <Camera size={18} className="text-[var(--accent)]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    Facial Biometric Verification
                  </span>
                  {consents.biometric_selfie?.granted ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-400">
                      Withdrawn
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Allows camera selfie challenge verification during punch in/out to eliminate proxy attendance.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggleConsent("biometric_selfie")}
              disabled={isPending || !initialEmployee}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                consents.biometric_selfie?.granted ? "bg-emerald-500" : "bg-neutral-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  consents.biometric_selfie?.granted ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Item B: Location History */}
          <div className="p-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
              >
                <MapPin size={18} className="text-blue-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    Job-Site Geographic Location
                  </span>
                  {consents.location?.granted ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-400">
                      Withdrawn
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Captures device coordinates during check-in to confirm attendance at designated client site.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggleConsent("location")}
              disabled={isPending || !initialEmployee}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                consents.location?.granted ? "bg-emerald-500" : "bg-neutral-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  consents.location?.granted ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Item C: WhatsApp Payslip Delivery */}
          <div className="p-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
              >
                <MessageSquare size={18} className="text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    WhatsApp Payslip Delivery
                  </span>
                  {consents.whatsapp?.granted ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-700 text-neutral-400">
                      Withdrawn
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Enables sending approved monthly payslip PDFs directly to your verified phone number.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleToggleConsent("whatsapp")}
              disabled={isPending || !initialEmployee}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${
                consents.whatsapp?.granted ? "bg-emerald-500" : "bg-neutral-700"
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  consents.whatsapp?.granted ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 2: Data Access & Download ZIP ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card A: Download My Data */}
        <div
          className="p-5 rounded-2xl flex flex-col justify-between"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)",
          }}
        >
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Download size={17} className="text-[var(--accent)]" />
                Download Personal Data (ZIP)
              </h2>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Self-Service
              </span>
            </div>

            <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
              Export your full employment profile, attendance records, consent audit trail, and generated PDF
              payslips packaged in a standard ZIP archive.
            </p>

            <div className="mt-4 p-3 rounded-xl bg-black/25 border border-white/5 flex flex-col gap-1.5 text-xs text-neutral-300">
              <div className="flex items-center justify-between">
                <span>Profile & Personal Data</span>
                <span className="font-mono text-emerald-400">profile.json</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Attendance & OT Register</span>
                <span className="font-mono text-emerald-400">attendance.csv</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Salary Calculation Ledger</span>
                <span className="font-mono text-emerald-400">payslips_summary.csv</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Consent Audit History</span>
                <span className="font-mono text-emerald-400">consents.json</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={handleDownloadZip}
              disabled={downloadingZip || !initialEmployee}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50 active:scale-95 shadow-md"
              style={{ backgroundColor: "var(--accent)" }}
            >
              <Download size={14} className={downloadingZip ? "animate-bounce" : ""} />
              <span>{downloadingZip ? "Packaging ZIP..." : "Download My Data Archive (ZIP)"}</span>
            </button>
          </div>
        </div>

        {/* Card B: Right to Erasure */}
        <div
          className="p-5 rounded-2xl flex flex-col justify-between"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)",
          }}
        >
          <div>
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Trash2 size={17} className="text-rose-400" />
                Right to Erasure
              </h2>
              <span className="text-[11px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                Owner Review
              </span>
            </div>

            <p className="text-xs text-[var(--text-muted)] mt-2 leading-relaxed">
              Submit a formal data deletion request. Approving will permanently wipe biometric photos,
              location history, and anonymise contact info.
            </p>

            <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-start gap-2">
              <AlertTriangle size={15} className="shrink-0 mt-0.5" />
              <span>
                <strong>Statutory Exception:</strong> Wage calculation and payroll records cannot be deleted
                due to mandatory 8-year tax audit duties under Indian Labour regulations.
              </span>
            </div>

            {erasureSuccessMsg && (
              <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs flex items-center gap-1.5">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{erasureSuccessMsg}</span>
              </div>
            )}

            {erasureErrorMsg && (
              <div className="mt-3 p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 text-xs flex items-center gap-1.5">
                <AlertTriangle size={14} className="shrink-0" />
                <span>{erasureErrorMsg}</span>
              </div>
            )}
          </div>

          <div className="mt-5 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={handleSubmitErasure}
              disabled={erasureSubmitting || !initialEmployee}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
            >
              <Trash2 size={14} />
              <span>{erasureSubmitting ? "Submitting Request..." : "Request Data Erasure"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Section 3: Owner Erasure Requests Queue (Only for Owners/Managers) ── */}
      {isManagerOrOwner && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            backgroundColor: "var(--surface)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
            boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)",
          }}
        >
          <div className="p-4 sm:p-5 border-b border-white/5 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <UserX size={18} className="text-amber-400" />
                Employee Erasure Requests Queue
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Review and approve data erasure requests submitted by staff in your organization.
              </p>
            </div>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
              {orgQueue.filter((r) => r.status === "pending").length} Pending
            </span>
          </div>

          <div className="overflow-x-auto divide-y divide-white/[0.05]">
            {orgQueue.length === 0 ? (
              <div className="py-10 text-center text-xs text-[var(--text-muted)]">
                No erasure requests found for this organization.
              </div>
            ) : (
              orgQueue.map((req) => {
                const isPendingReq = req.status === "pending";
                return (
                  <div
                    key={req.id}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 text-white"
                        style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                      >
                        {req.employeeName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white">
                            {req.employeeName}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-muted)] bg-white/5 px-1.5 py-0.5 rounded">
                            {req.employeeCode}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                              req.status === "approved"
                                ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                                : req.status === "rejected"
                                ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                                : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            }`}
                          >
                            {req.status.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                          Requested: {new Date(req.requestedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}
                          {req.employeeDept && ` • Dept: ${req.employeeDept}`}
                        </p>
                        {req.rejectionReason && (
                          <p className="text-xs text-rose-400 mt-1">
                            Rejection Reason: {req.rejectionReason}
                          </p>
                        )}
                      </div>
                    </div>

                    {isOwner && isPendingReq && (
                      <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                        <button
                          type="button"
                          onClick={() => handleApproveErasure(req.id)}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all cursor-pointer shadow active:scale-95"
                        >
                          <Check size={13} />
                          <span>Approve & Purge</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRejectErasure(req.id)}
                          disabled={isPending}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-400 bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer active:scale-95"
                        >
                          <X size={13} />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── Section 4: Configured Retention Policies ── */}
      <div
        className="rounded-2xl overflow-hidden p-5 flex flex-col gap-3"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
        }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
              <Clock size={16} className="text-blue-400" />
              Automated Data Retention Policies
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Scheduled cron jobs automatically purge ephemeral data once retention thresholds are reached.
            </p>
          </div>
          <span className="text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
            Enforced by Cron
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-1">
          {policies.map((pol) => (
            <div
              key={pol.id || pol.data_type}
              className="p-3.5 rounded-xl bg-black/25 border border-white/5 flex flex-col justify-between"
            >
              <div>
                <span className="text-xs font-semibold text-neutral-300 capitalize">
                  {pol.data_type.replace(/_/g, " ")}
                </span>
                <p className="text-[11px] text-[var(--text-muted)] mt-1 line-clamp-2">
                  {pol.description}
                </p>
              </div>
              <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5">
                <span className="text-[10px] uppercase font-bold text-[var(--text-muted)]">
                  Threshold
                </span>
                <span className="text-xs font-bold text-white font-mono">
                  {pol.retention_days} Days
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
