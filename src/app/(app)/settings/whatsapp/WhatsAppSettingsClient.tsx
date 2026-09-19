// src/app/(app)/settings/whatsapp/WhatsAppSettingsClient.tsx
"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  Eye,
  CheckCheck,
  RefreshCw,
  Search,
  Sparkles,
  ShieldCheck,
  FileText,
  Phone,
  Save,
  ChevronRight,
  HelpCircle,
  Zap,
} from "lucide-react";
import {
  updateWhatsAppTemplateAction,
  toggleEmployeeConsentAction,
  bulkToggleEmployeeConsentAction,
  sendTestPayslipAction,
  simulateDeliveryStatusAction,
  getMessageLogsAction,
} from "@/app/actions/whatsapp";
import type { MessageLogStatus } from "@/server/whatsapp";

interface EmployeeItem {
  id: string;
  code: string;
  name: string;
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  whatsapp_consent: boolean;
  whatsapp_consent_at?: string | null;
}

interface PayrollItemOption {
  id: string;
  netPaise: number | bigint;
  employeeName: string;
  employeeCode: string;
  employeePhone: string;
  periodMonth: string;
  status: string;
}

interface LogItem {
  id: string;
  org_id: string;
  employee_id: string;
  payroll_item_id: string;
  template: string;
  status: MessageLogStatus;
  provider_message_id: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
  employee_name: string;
  employee_code: string;
  employee_phone: string;
}

interface Props {
  initialTemplateName: string;
  initialEmployees: EmployeeItem[];
  initialPayrollItems: PayrollItemOption[];
  initialLogs: LogItem[];
  isConfigured: boolean;
  userRole: string;
}

export default function WhatsAppSettingsClient({
  initialTemplateName,
  initialEmployees,
  initialPayrollItems,
  initialLogs,
  isConfigured,
  userRole,
}: Props) {
  const [templateName, setTemplateName] = useState(initialTemplateName);
  const [savedTemplateName, setSavedTemplateName] = useState(initialTemplateName);
  const [templateSavedMsg, setTemplateSavedMsg] = useState("");

  const [employees, setEmployees] = useState<EmployeeItem[]>(initialEmployees);
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [logs, setLogs] = useState<LogItem[]>(initialLogs);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Test Send state
  const [selectedItemId, setSelectedItemId] = useState<string>(
    initialPayrollItems[0]?.id || ""
  );
  const [testPhone, setTestPhone] = useState<string>("");
  const [sendResultMsg, setSendResultMsg] = useState<{
    type: "success" | "error";
    text: string;
    lastSentId?: string;
  } | null>(null);

  const [isPending, startTransition] = useTransition();
  const [refreshingLogs, setRefreshingLogs] = useState(false);

  // Filtered employees
  const filteredEmployees = employees.filter((emp) => {
    const q = employeeSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      emp.name.toLowerCase().includes(q) ||
      emp.code.toLowerCase().includes(q) ||
      (emp.phone && emp.phone.includes(q)) ||
      (emp.department && emp.department.toLowerCase().includes(q))
    );
  });

  const consentedCount = employees.filter((e) => e.whatsapp_consent).length;

  // Filtered logs
  const filteredLogs = logs.filter((log) => {
    if (statusFilter === "all") return true;
    return log.status === statusFilter;
  });

  // Handler: Save Template Name
  const handleSaveTemplate = () => {
    startTransition(async () => {
      const res = await updateWhatsAppTemplateAction(templateName);
      if (res.success && res.templateName) {
        setSavedTemplateName(res.templateName);
        setTemplateSavedMsg("Template saved successfully");
        setTimeout(() => setTemplateSavedMsg(""), 3000);
      } else {
        alert(res.error || "Failed to save template name");
      }
    });
  };

  // Handler: Toggle Single Employee Consent
  const handleToggleConsent = (employeeId: string, currentConsent: boolean) => {
    const newConsent = !currentConsent;
    // Optimistic update
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId ? { ...e, whatsapp_consent: newConsent } : e
      )
    );

    startTransition(async () => {
      const res = await toggleEmployeeConsentAction(employeeId, newConsent);
      if (!res.success) {
        // Rollback
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === employeeId ? { ...e, whatsapp_consent: currentConsent } : e
          )
        );
        alert(res.error || "Failed to update consent");
      }
    });
  };

  // Handler: Bulk Consent Toggle
  const handleBulkToggle = (consent: boolean) => {
    // Optimistic update
    setEmployees((prev) => prev.map((e) => ({ ...e, whatsapp_consent: consent })));

    startTransition(async () => {
      const res = await bulkToggleEmployeeConsentAction(consent);
      if (!res.success) {
        alert(res.error || "Failed to update consent in bulk");
      }
    });
  };

  // Handler: Send Test Payslip
  const handleSendTest = () => {
    if (!selectedItemId) {
      alert("Please select a payroll item to test.");
      return;
    }
    if (!testPhone.trim()) {
      alert("Please enter your phone number to send the test payslip.");
      return;
    }

    startTransition(async () => {
      setSendResultMsg(null);
      const res = await sendTestPayslipAction(selectedItemId, testPhone);

      if (res.success && res.results?.[0]?.status === "sent") {
        const itemResult = res.results[0];
        setSendResultMsg({
          type: "success",
          text: `Payslip sent successfully! Provider ID: ${itemResult.providerMessageId || "Generated"}`,
          lastSentId: itemResult.providerMessageId,
        });
        // Auto refresh logs
        await handleRefreshLogs();
      } else {
        const errText = res.results?.[0]?.error || res.error || "Failed to send payslip";
        setSendResultMsg({
          type: "error",
          text: errText,
        });
        await handleRefreshLogs();
      }
    });
  };

  // Handler: Simulate Delivery or Read
  const handleSimulateStatus = (providerMessageId: string, status: "delivered" | "read") => {
    startTransition(async () => {
      const res = await simulateDeliveryStatusAction(providerMessageId, status);
      if (res.success) {
        await handleRefreshLogs();
      } else {
        alert(res.error || "Simulation failed");
      }
    });
  };

  // Handler: Refresh Message Logs
  const handleRefreshLogs = async () => {
    setRefreshingLogs(true);
    const res = await getMessageLogsAction(statusFilter);
    if (res.success && res.logs) {
      setLogs(res.logs as LogItem[]);
    }
    setRefreshingLogs(false);
  };

  // Status chip renderer
  const renderStatusChip = (status: MessageLogStatus) => {
    switch (status) {
      case "queued":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock size={12} />
            Queued
          </span>
        );
      case "sent":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/15 text-blue-400 border border-blue-500/30">
            <Send size={12} />
            Sent
          </span>
        );
      case "delivered":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
            <CheckCheck size={12} />
            Delivered
          </span>
        );
      case "read":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <Eye size={12} />
            Read
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/30">
            <AlertCircle size={12} />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-500/15 text-neutral-400 border border-neutral-500/30">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto w-full pb-16 pt-2">
      {/* ── Breadcrumb & Header ── */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
          <Link href="/more" className="hover:text-white transition-colors">
            More
          </Link>
          <ChevronRight size={12} />
          <span className="text-white">WhatsApp Payslip Delivery</span>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3 mt-1">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white"
                style={{ backgroundColor: "var(--accent)" }}
              >
                <MessageSquare size={20} />
              </div>
              WhatsApp Payslip Settings
            </h1>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Automated payslip PDF delivery over WhatsApp Cloud API with delivery status tracking.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isConfigured ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                <CheckCircle2 size={13} />
                Meta Cloud API Active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm">
                <Zap size={13} />
                Test Sandbox Mode
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Top Grid: Configuration & Test Send ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Card 1: Template Configuration */}
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
              <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <FileText size={16} className="text-[var(--accent)]" />
                Template Configuration
              </h2>
              <span className="text-[11px] text-[var(--text-muted)] bg-white/5 px-2 py-0.5 rounded-md">
                Meta Approved
              </span>
            </div>

            <p className="text-xs text-[var(--text-muted)] mt-2">
              The Meta-approved utility template name used when dispatching payslips with PDF document headers.
            </p>

            <div className="mt-4 flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-neutral-300">
                Utility Template Name
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="e.g. payslip_utility"
                  className="w-full px-3.5 py-2.5 rounded-xl text-sm font-mono bg-black/30 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent)] transition-colors"
                />
                <button
                  type="button"
                  onClick={handleSaveTemplate}
                  disabled={isPending || templateName === savedTemplateName}
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                  style={{
                    backgroundColor: "var(--accent)",
                    color: "white",
                  }}
                >
                  <Save size={14} />
                  <span>Save</span>
                </button>
              </div>
              {templateSavedMsg && (
                <span className="text-xs font-medium text-emerald-400 mt-1 flex items-center gap-1">
                  <CheckCircle2 size={13} /> {templateSavedMsg}
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-[var(--text-muted)]">
            <span className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-400" />
              Rate limit: 30 sends/min per org
            </span>
            <span>3x Backoff Retry</span>
          </div>
        </div>

        {/* Card 2: Send Test Payslip */}
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
              <h2 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Send size={16} className="text-emerald-400" />
                Send Test Payslip
              </h2>
              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                Live Verification
              </span>
            </div>

            <p className="text-xs text-[var(--text-muted)] mt-2">
              Send an approved payslip to your own WhatsApp number to verify document headers, message logs, and status transitions.
            </p>

            <div className="mt-3 flex flex-col gap-3">
              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Select Approved / Paid Payslip
                </label>
                <select
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-black/30 border border-white/10 text-white focus:outline-none focus:border-[var(--accent)]"
                >
                  {initialPayrollItems.length === 0 ? (
                    <option value="">No approved payroll runs found</option>
                  ) : (
                    initialPayrollItems.map((item) => {
                      const net = (Number(item.netPaise) / 100).toLocaleString("en-IN");
                      return (
                        <option key={item.id} value={item.id}>
                          {item.employeeName} ({item.employeeCode}) &bull; ₹{net} &bull; {item.periodMonth} ({item.status})
                        </option>
                      );
                    })
                  )}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-300 block mb-1">
                  Your WhatsApp Phone Number
                </label>
                <div className="relative">
                  <Phone
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                  <input
                    type="tel"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full pl-9 pr-3.5 py-2 rounded-xl text-xs font-mono bg-black/30 border border-white/10 text-white placeholder-neutral-500 focus:outline-none focus:border-[var(--accent)]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-white/5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSendTest}
                disabled={isPending || !selectedItemId || !testPhone.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-md"
                style={{ backgroundColor: "var(--accent)" }}
              >
                <Send size={14} />
                <span>{isPending ? "Sending..." : "Send Test Payslip"}</span>
              </button>
            </div>

            {sendResultMsg && (
              <div
                className={`p-3 rounded-xl text-xs flex flex-col gap-2 ${
                  sendResultMsg.type === "success"
                    ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25"
                    : "bg-rose-500/10 text-rose-300 border border-rose-500/25"
                }`}
              >
                <div className="flex items-center gap-1.5 font-medium">
                  {sendResultMsg.type === "success" ? (
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                  ) : (
                    <AlertCircle size={14} className="shrink-0 text-rose-400" />
                  )}
                  <span>{sendResultMsg.text}</span>
                </div>

                {sendResultMsg.lastSentId && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-[11px] text-neutral-400">Simulate Receipt:</span>
                    <button
                      type="button"
                      onClick={() =>
                        handleSimulateStatus(sendResultMsg.lastSentId!, "delivered")
                      }
                      className="px-2 py-1 rounded-md text-[11px] font-bold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40 transition-colors"
                    >
                      &rarr; Delivered
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        handleSimulateStatus(sendResultMsg.lastSentId!, "read")
                      }
                      className="px-2 py-1 rounded-md text-[11px] font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/40 transition-colors"
                    >
                      &rarr; Read
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Section 3: Per-Employee Consent Toggles ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div className="p-4 sm:p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck size={18} className="text-[var(--accent)]" />
                Employee WhatsApp Consent
              </h2>
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {consentedCount} / {employees.length} Consented
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Strict consent compliance: payslips are exclusively dispatched to staff with active consent.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleBulkToggle(true)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/25 transition-all active:scale-95"
            >
              Enable All
            </button>
            <button
              type="button"
              onClick={() => handleBulkToggle(false)}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-400 bg-white/5 hover:bg-white/10 border border-white/10 transition-all active:scale-95"
            >
              Disable All
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-3 sm:px-5 bg-black/20 border-b border-white/5 flex items-center gap-2">
          <Search size={15} className="text-[var(--text-muted)] shrink-0" />
          <input
            type="text"
            value={employeeSearch}
            onChange={(e) => setEmployeeSearch(e.target.value)}
            placeholder="Search employees by name, code, phone, or department..."
            className="w-full bg-transparent text-xs text-white placeholder-neutral-500 focus:outline-none"
          />
        </div>

        {/* Employee Table */}
        <div className="overflow-x-auto max-h-80 divide-y divide-white/[0.05]">
          {filteredEmployees.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)]">
              No employees found matching filter.
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                className="p-3.5 sm:px-5 flex items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 text-white"
                    style={{ backgroundColor: "rgba(255, 255, 255, 0.08)" }}
                  >
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">
                        {emp.name}
                      </span>
                      <span className="text-[10px] font-mono text-[var(--text-muted)] bg-white/5 px-1.5 py-0.5 rounded">
                        {emp.code}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-0.5">
                      <span>{emp.phone || "No phone registered"}</span>
                      {emp.department && (
                        <>
                          <span>&bull;</span>
                          <span>{emp.department}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {emp.whatsapp_consent ? (
                    <span className="text-[11px] font-semibold text-emerald-400 hidden sm:inline">
                      Consent Active
                    </span>
                  ) : (
                    <span className="text-[11px] text-[var(--text-muted)] hidden sm:inline">
                      Not Consented
                    </span>
                  )}

                  {/* Toggle Switch */}
                  <button
                    type="button"
                    onClick={() => handleToggleConsent(emp.id, emp.whatsapp_consent)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      emp.whatsapp_consent ? "bg-emerald-500" : "bg-neutral-700"
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        emp.whatsapp_consent ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Section 4: Message Log with Status Chips ── */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          backgroundColor: "var(--surface)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 4px 24px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div className="p-4 sm:p-5 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MessageSquare size={18} className="text-blue-400" />
              WhatsApp Send Log & Audit History
            </h2>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Real-time audit log of all payslip delivery attempts with status chips.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleRefreshLogs}
              disabled={refreshingLogs}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-300 bg-white/5 hover:bg-white/10 border border-white/10 transition-all cursor-pointer active:scale-95"
            >
              <RefreshCw
                size={13}
                className={refreshingLogs ? "animate-spin" : ""}
              />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Status Filter Chips */}
        <div className="p-3 sm:px-5 bg-black/20 border-b border-white/5 flex items-center gap-1.5 overflow-x-auto">
          {[
            { key: "all", label: "All Dispatches" },
            { key: "queued", label: "Queued" },
            { key: "sent", label: "Sent" },
            { key: "delivered", label: "Delivered" },
            { key: "read", label: "Read" },
            { key: "failed", label: "Failed" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                statusFilter === tab.key
                  ? "bg-white/15 text-white"
                  : "text-[var(--text-muted)] hover:text-white hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Log Entries */}
        <div className="overflow-x-auto divide-y divide-white/[0.05]">
          {filteredLogs.length === 0 ? (
            <div className="py-12 text-center text-xs text-[var(--text-muted)]">
              No message logs found for status '{statusFilter}'.
            </div>
          ) : (
            filteredLogs.map((log) => {
              const timeStr = new Date(log.created_at).toLocaleString("en-IN", {
                dateStyle: "medium",
                timeStyle: "short",
              });

              return (
                <div
                  key={log.id}
                  className="p-3.5 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="pt-0.5">{renderStatusChip(log.status)}</div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white">
                          {log.employee_name}
                        </span>
                        <span className="text-[10px] font-mono text-[var(--text-muted)] bg-white/5 px-1 rounded">
                          {log.employee_code}
                        </span>
                        <span className="text-xs text-[var(--text-muted)]">
                          &bull; {log.employee_phone}
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] font-mono">
                          [{log.template}]
                        </span>
                      </div>

                      {log.provider_message_id && (
                        <p className="text-[11px] font-mono text-neutral-400 mt-1 truncate">
                          ID: {log.provider_message_id}
                        </p>
                      )}

                      {log.error && (
                        <p className="text-[11px] text-rose-400 mt-1 flex items-center gap-1">
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{log.error}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    <span className="text-[11px] text-[var(--text-muted)] font-mono">
                      {timeStr}
                    </span>

                    {/* Quick Simulation buttons to test sent -> delivered -> read */}
                    {log.provider_message_id && log.status !== "read" && log.status !== "failed" && (
                      <div className="flex items-center gap-1 ml-2">
                        {log.status === "sent" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleSimulateStatus(log.provider_message_id!, "delivered")
                            }
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 transition-colors"
                            title="Simulate WhatsApp delivery receipt"
                          >
                            Delivered
                          </button>
                        )}
                        {(log.status === "sent" || log.status === "delivered") && (
                          <button
                            type="button"
                            onClick={() =>
                              handleSimulateStatus(log.provider_message_id!, "read")
                            }
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30 transition-colors"
                            title="Simulate WhatsApp read receipt"
                          >
                            Read
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
