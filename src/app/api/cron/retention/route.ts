// src/app/api/cron/retention/route.ts
// Scheduled data retention enforcement endpoint.
// Protected by Bearer CRON_SECRET or authenticated owner session.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleRetention(request);
}

export async function POST(request: NextRequest) {
  return handleRetention(request);
}

async function handleRetention(request: NextRequest) {
  try {
    // Check authorization: Bearer CRON_SECRET or query secret
    const authHeader = request.headers.get("authorization");
    const querySecret = request.nextUrl.searchParams.get("secret");
    const cronSecret = process.env.CRON_SECRET || "hajri_cron_retention_secret_2026";

    const isAuthorizedSecret =
      (authHeader && authHeader === `Bearer ${cronSecret}`) ||
      querySecret === cronSecret;

    const supabase = await createClient();

    if (!isAuthorizedSecret) {
      // Check if caller is authenticated owner
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

    // Call stored procedure enforce_data_retention()
    const { data, error } = await supabase.rpc("enforce_data_retention");

    if (error) {
      console.error("Enforce retention RPC error:", error);
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      result: data,
      executedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("Retention job exception:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
