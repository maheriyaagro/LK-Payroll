// src/app/actions/punch.ts
"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import crypto from "crypto";
import { checkConsent, recordConsent } from "@/server/privacy";
import { checkRateLimit } from "@/lib/rateLimit";

const CHALLENGES = [
  { id: "turn_left", instruction: "Turn your head to the left 👤⬅️" },
  { id: "turn_right", instruction: "Turn your head to the right 👤➡️" },
  { id: "blink_twice", instruction: "Blink your eyes twice 😉" },
  { id: "smile", instruction: "Smile directly at the camera 😊" },
  { id: "tilt_up", instruction: "Tilt your head slightly up 👤⬆️" },
];

const SECRET_KEY = process.env.SUPABASE_SECRET_KEY || "hajri-selfie-punch-secret-key";

function signChallenge(challengeId: string, expiresAt: number): string {
  const data = `${challengeId}:${expiresAt}`;
  const hmac = crypto.createHmac("sha256", SECRET_KEY).update(data).digest("hex");
  return `${data}:${hmac}`;
}

function verifyChallenge(token: string): { valid: boolean; challengeId?: string } {
  try {
    const parts = token.split(":");
    if (parts.length !== 3) return { valid: false };
    const [challengeId, expiresAtStr, signature] = parts;
    const expiresAt = parseInt(expiresAtStr, 10);
    if (Date.now() > expiresAt) return { valid: false };

    const expected = crypto
      .createHmac("sha256", SECRET_KEY)
      .update(`${challengeId}:${expiresAt}`)
      .digest("hex");

    if (expected !== signature) return { valid: false };
    return { valid: true, challengeId };
  } catch {
    return { valid: false };
  }
}

/**
 * Retrieves context for the /punch screen:
 * - Current organization & member
 * - Linked employee (or active employees if manager/owner)
 * - Consent acceptance status
 * - Today's punch status (ready_in, punched_in, punched_out)
 */
export async function getPunchContext(requestedEmployeeId?: string) {
  const { user, org, member } = await requireRole([
    "owner",
    "manager",
    "accountant",
    "employee",
  ]);
  const supabase = await createClient();

  // 1. Fetch active employees in the organization
  const { data: employees } = await supabase
    .from("employees")
    .select("id, code, name, designation, department, selfie_consent_at, is_active")
    .eq("org_id", org.id)
    .eq("is_active", true)
    .order("name", { ascending: true });

  const activeEmployees = employees || [];

  // Determine active target employee
  let targetEmployee = null;
  if (requestedEmployeeId) {
    targetEmployee = activeEmployees.find((e) => e.id === requestedEmployeeId) || null;
  } else if (member.employee_id) {
    targetEmployee = activeEmployees.find((e) => e.id === member.employee_id) || null;
  }

  // If still not found and active employees exist, default to first employee
  if (!targetEmployee && activeEmployees.length > 0) {
    targetEmployee = activeEmployees[0];
  }

  // If no employees exist in org yet, auto-create initial employee so punch works immediately
  if (!targetEmployee) {
    const fallbackName = user.email ? user.email.split("@")[0] : "Staff Member";
    const { data: newEmp } = await supabase
      .from("employees")
      .insert({
        org_id: org.id,
        code: "EMP001",
        name: fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1),
        designation: "Staff Member",
        department: "Operations",
        employment_type: "monthly",
        doj: new Date().toISOString().split("T")[0],
        is_active: true,
      })
      .select("id, code, name, designation, department, selfie_consent_at, is_active")
      .single();

    if (newEmp) {
      targetEmployee = newEmp;
      activeEmployees.push(newEmp);
    }
  }

  // 2. Fetch today's attendance record for target employee
  const today = new Date().toISOString().split("T")[0];
  let todayRecord = null;
  let punchStatus: "ready_in" | "punched_in" | "punched_out" = "ready_in";

  if (targetEmployee) {
    const { data: record } = await supabase
      .from("attendance_records")
      .select("id, work_date, status, in_at, out_at, worked_minutes, source, photo_path")
      .eq("org_id", org.id)
      .eq("employee_id", targetEmployee.id)
      .eq("work_date", today)
      .maybeSingle();

    todayRecord = record;
    if (record) {
      if (record.in_at && !record.out_at) {
        punchStatus = "punched_in";
      } else if (record.in_at && record.out_at) {
        punchStatus = "punched_out";
      }
    }
  }

  return {
    org,
    member,
    targetEmployee,
    activeEmployees,
    hasAcceptedConsent: !!targetEmployee?.selfie_consent_at,
    todayRecord,
    punchStatus,
    todayDateStr: today,
  };
}

/**
 * Records employee acceptance of the selfie verification consent.
 */
export async function acceptSelfieConsentAction(employeeId: string) {
  const { org } = await requireRole(["owner", "manager", "employee"]);
  const supabase = await createClient();

  const now = new Date().toISOString();
  const res = await recordConsent(supabase, org.id, employeeId, "biometric_selfie", true, "v1.0");

  if (!res.success) {
    return { success: false, error: res.error };
  }

  revalidatePath("/punch");
  revalidatePath("/privacy");
  return { success: true, acceptedAt: now };
}

/**
 * Generates a random anti-spoofing challenge chosen server-side per attempt.
 */
export async function generatePunchChallengeAction() {
  await requireRole(["owner", "manager", "employee", "accountant"]);

  const randomIndex = Math.floor(Math.random() * CHALLENGES.length);
  const challenge = CHALLENGES[randomIndex];
  const expiresAt = Date.now() + 180000; // 3 minutes validity
  const token = signChallenge(challenge.id, expiresAt);

  return {
    challengeId: challenge.id,
    instruction: challenge.instruction,
    token,
    expiresAt,
  };
}

export interface SubmitPunchPayload {
  employeeId: string;
  punchType: "in" | "out";
  challengeToken: string;
  photoBase64: string; // data:image/jpeg;base64,...
}

/**
 * Submits a selfie punch:
 * 1. Validates challenge token
 * 2. Uploads captured still to private bucket at org_id/employee_id/date/time.jpg
 * 3. Creates/updates attendance_records row with source = 'selfie' and photo_path
 */
export async function submitPunchAction(payload: SubmitPunchPayload) {
  const { user, org } = await requireRole(["owner", "manager", "employee"]);
  const supabase = await createClient();

  // Rate limit: Max 10 punch attempts per minute per employee
  const punchLimit = checkRateLimit(`punch:${payload.employeeId}`, 10, 60 * 1000);
  if (!punchLimit.allowed) {
    return {
      success: false,
      error: "Too many punch attempts. Please wait 1 minute before trying again.",
    };
  }

  // 1. Server-side Consent Gatekeeping: Verify biometric selfie consent
  const hasConsent = await checkConsent(supabase, payload.employeeId, "biometric_selfie");
  if (!hasConsent) {
    return {
      success: false,
      error: "Biometric selfie consent is required. Please grant consent in Privacy Settings before punching.",
    };
  }

  // 2. Validate challenge
  const challengeVerification = verifyChallenge(payload.challengeToken);
  if (!challengeVerification.valid) {
    return {
      success: false,
      error: "Challenge verification expired or invalid. Please try again.",
    };
  }

  if (!payload.photoBase64 || !payload.photoBase64.includes("base64,")) {
    return { success: false, error: "Valid photo still is required" };
  }

  // Limit image payload to 5MB base64
  if (payload.photoBase64.length > 7 * 1024 * 1024) {
    return { success: false, error: "Image file size exceeds maximum allowed limit (5MB)" };
  }

  // 2. Decode image buffer
  const base64Data = payload.photoBase64.split("base64,")[1];
  const imageBuffer = Buffer.from(base64Data, "base64");

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const timeStr = now.toISOString().split("T")[1].replace(/[:.]/g, "").slice(0, 6); // HHMMSS

  // Private path structure: org_id/employee_id/date/time.jpg
  const storagePath = `${org.id}/${payload.employeeId}/${dateStr}/${timeStr}.jpg`;

  // 3. Upload to private Supabase bucket: attendance-selfies
  const { error: uploadError } = await supabase.storage
    .from("attendance-selfies")
    .upload(storagePath, imageBuffer, {
      contentType: "image/jpeg",
      upsert: true,
    });

  if (uploadError) {
    // If bucket permission or upload error occurs, log it
    console.error("Selfie storage upload error:", uploadError);
  }

  // 4. Update / Insert attendance_records
  const { data: existingRecord } = await supabase
    .from("attendance_records")
    .select("id, in_at, out_at, status")
    .eq("org_id", org.id)
    .eq("employee_id", payload.employeeId)
    .eq("work_date", dateStr)
    .maybeSingle();

  const nowIso = now.toISOString();

  if (payload.punchType === "in") {
    if (existingRecord) {
      await supabase
        .from("attendance_records")
        .update({
          in_at: nowIso,
          status: "P",
          source: "selfie",
          photo_path: storagePath,
          marked_by: user.id,
        })
        .eq("id", existingRecord.id);
    } else {
      await supabase.from("attendance_records").insert({
        org_id: org.id,
        employee_id: payload.employeeId,
        work_date: dateStr,
        status: "P",
        in_at: nowIso,
        source: "selfie",
        photo_path: storagePath,
        marked_by: user.id,
      });
    }
  } else {
    // Punch Out
    let workedMinutes = 0;
    if (existingRecord?.in_at) {
      const inTime = new Date(existingRecord.in_at).getTime();
      workedMinutes = Math.max(0, Math.round((now.getTime() - inTime) / (1000 * 60)));
    }

    if (existingRecord) {
      await supabase
        .from("attendance_records")
        .update({
          out_at: nowIso,
          worked_minutes: workedMinutes,
          source: "selfie",
          photo_path: storagePath,
        })
        .eq("id", existingRecord.id);
    } else {
      // Direct punch out without prior punch in
      await supabase.from("attendance_records").insert({
        org_id: org.id,
        employee_id: payload.employeeId,
        work_date: dateStr,
        status: "P",
        out_at: nowIso,
        source: "selfie",
        photo_path: storagePath,
        marked_by: user.id,
      });
    }
  }

  revalidatePath("/punch");
  revalidatePath("/attendance");
  revalidatePath("/");

  return {
    success: true,
    punchType: payload.punchType,
    recordedAt: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    photoPath: storagePath,
  };
}
