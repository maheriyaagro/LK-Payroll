// src/app/api/cron/cleanup-selfies/route.ts
// Retention cleanup endpoint: deletes selfies older than 90 days (configurable)
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleCleanup(request);
}

export async function POST(request: NextRequest) {
  return handleCleanup(request);
}

async function handleCleanup(request: NextRequest) {
  try {
    // Check authorization: Bearer CRON_SECRET or query secret or authenticated owner
    const authHeader = request.headers.get("authorization");
    const querySecret = request.nextUrl.searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET || "hajri_cron_retention_secret_2026";

    const isAuthorizedSecret =
      (authHeader && authHeader === `Bearer ${cronSecret}`) ||
      querySecret === cronSecret;

    const supabase = await createClient();

    if (!isAuthorizedSecret) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized: Invalid cron secret or session" }, { status: 401 });
      }

      const { data: member } = await supabase
        .from("org_members")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "owner")
        .maybeSingle();

      if (!member) {
        return NextResponse.json({ error: "Forbidden: Owner access required" }, { status: 403 });
      }
    }

    // Query retention days from system_settings, fallback to query param or 90 days
    const searchParams = request.nextUrl.searchParams;
    const queryDays = searchParams.get("retention_days");

    let retentionDays = 90;
    if (queryDays) {
      const parsed = parseInt(queryDays, 10);
      if (!isNaN(parsed) && parsed > 0) retentionDays = parsed;
    } else {
      const { data: setting } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "selfie_retention_days")
        .maybeSingle();

      if (setting?.value) {
        const val = typeof setting.value === "number" ? setting.value : parseInt(String(setting.value), 10);
        if (!isNaN(val) && val > 0) retentionDays = val;
      }
    }

    // Call cleanup stored procedure
    const { data, error } = await supabase.rpc("cleanup_expired_selfies", {
      p_retention_days: retentionDays,
    });

    if (error) {
      console.error("Cleanup selfies RPC error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      retentionDays,
      result: data,
      executedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Selfie cleanup exception:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
