// src/app/api/webhooks/whatsapp/route.ts
// Route handler for WhatsApp Cloud API Webhooks.
// GET: Verification handshake with Meta (hub.mode, hub.verify_token, hub.challenge)
// POST: Delivery status updates (sent, delivered, read, failed) updating message_log.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { handleWhatsAppWebhookEvent } from "@/server/whatsapp";

/**
 * GET Handler for Meta Webhook Verification Handshake
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const verifyToken =
    process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "hajri_whatsapp_verify_token_2026";

  // Check mode and token
  if (mode === "subscribe" && token === verifyToken) {
    console.log("WhatsApp Webhook verified successfully");
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({ error: "Forbidden: verification token mismatch" }, { status: 403 });
}

/**
 * POST Handler for WhatsApp Webhook Delivery Status Receipts
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if this is a direct status simulation payload
    if (body.action === "simulate_status" && body.provider_message_id && body.status) {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: "Unauthorized: Authentication required to simulate delivery status" }, { status: 401 });
      }

      const { data, error } = await supabase
        .from("message_log")
        .update({ status: body.status, error: body.error || null })
        .eq("provider_message_id", body.provider_message_id)
        .select();

      return NextResponse.json({
        success: !error,
        updated: data?.length || 0,
        error: error?.message,
      });
    }

    // Standard Meta Cloud API Webhook Event
    const result = await handleWhatsAppWebhookEvent(supabase, body);

    return NextResponse.json({
      status: "ok",
      processed: result.processed,
      updated: result.updated,
      errors: result.errors,
    });
  } catch (err: any) {
    console.error("WhatsApp Webhook processing error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
