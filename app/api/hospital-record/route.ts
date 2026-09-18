import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type Body = { grant_id?: string; record_id?: string };

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const grantId = body.grant_id?.trim();
    const recordId = body.record_id?.trim();

    if (!grantId || !recordId) {
      return NextResponse.json(
        { error: "Missing hospital authorization or record." },
        { status: 400 }
      );
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
      console.error("Missing server-only Supabase service credentials.");
      return NextResponse.json(
        { error: "Secure medical-record access is not configured on the server." },
        { status: 503 }
      );
    }

    const admin = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: grant, error: grantError } = await admin
      .from("hospital_access_grants")
      .select("id, member_id, hospital_id, expires_at, revoked_at")
      .eq("id", grantId)
      .maybeSingle();

    if (grantError) throw grantError;

    if (!grant || grant.revoked_at || new Date(grant.expires_at).getTime() <= Date.now()) {
      return NextResponse.json(
        { error: "Hospital access has expired or been revoked. Return to verification to create a new access grant." },
        { status: 403 }
      );
    }

    const { data: record, error: recordError } = await admin
      .from("medical_records")
      .select("id, member_id, file_path")
      .eq("id", recordId)
      .eq("member_id", grant.member_id)
      .maybeSingle();

    if (recordError) throw recordError;

    if (!record) {
      return NextResponse.json({ error: "Medical record not found." }, { status: 404 });
    }

    const { data: signed, error: signedError } = await admin.storage
      .from("medical-records")
      .createSignedUrl(record.file_path, 300);

    if (signedError) throw signedError;
    if (!signed?.signedUrl) throw new Error("No signed URL returned.");

    const { error: logError } = await admin
      .from("medical_access_logs")
      .insert({
        grant_id: grant.id,
        member_id: grant.member_id,
        hospital_id: grant.hospital_id,
        record_id: record.id,
        action: "record_view",
      });

    if (logError) {
      console.error("Medical access log failed:", logError);
    }

    return NextResponse.json({ signedUrl: signed.signedUrl });
  } catch (error) {
    console.error("Hospital record API error:", error);
    return NextResponse.json(
      { error: "Unable to securely open this medical record." },
      { status: 500 }
    );
  }
}
