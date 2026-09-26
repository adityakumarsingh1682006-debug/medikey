import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const resend = new Resend(process.env.RESEND_API_KEY);

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!supabaseUrl || !secretKey) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const requestId = String(body?.request_id || "").trim();

    if (!requestId) {
      return NextResponse.json(
        { error: "request_id is required." },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "RESEND_API_KEY is not configured." },
        { status: 500 }
      );
    }

    const supabase = getAdminClient();

    const { data: accessRequest, error: requestError } = await supabase
      .from("sensitive_access_requests")
      .select("*")
      .eq("id", requestId)
      .maybeSingle();

    if (requestError) throw requestError;

    if (!accessRequest) {
      return NextResponse.json(
        { error: "Access request not found." },
        { status: 404 }
      );
    }

    if (accessRequest.status !== "pending") {
      return NextResponse.json(
        { error: "This access request is no longer pending." },
        { status: 409 }
      );
    }

    if (
      accessRequest.expires_at &&
      new Date(accessRequest.expires_at).getTime() <= Date.now()
    ) {
      return NextResponse.json(
        { error: "This access request has expired." },
        { status: 410 }
      );
    }

    const [{ data: member, error: memberError }, { data: hospital, error: hospitalError }] =
      await Promise.all([
        supabase
          .from("family_members")
          .select("id, user_id, full_name")
          .eq("id", accessRequest.member_id)
          .maybeSingle(),
        supabase
          .from("hospitals")
          .select("id, hospital_name, city")
          .eq("id", accessRequest.hospital_id)
          .maybeSingle(),
      ]);

    if (memberError) throw memberError;
    if (hospitalError) throw hospitalError;

    if (!member?.user_id) {
      return NextResponse.json(
        { error: "The patient account could not be found." },
        { status: 404 }
      );
    }

    if (!hospital?.hospital_name) {
      return NextResponse.json(
        { error: "The hospital could not be found." },
        { status: 404 }
      );
    }

    const { data: authUser, error: authError } =
      await supabase.auth.admin.getUserById(member.user_id);

    if (authError) throw authError;

    const patientEmail = authUser.user?.email;

    if (!patientEmail) {
      return NextResponse.json(
        { error: "The patient does not have a registered email address." },
        { status: 400 }
      );
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    const securityUrl = `${appUrl}/security`;
    const patientName = member.full_name || "MediKey member";
    const hospitalName = hospital.hospital_name;
    const reason = String(
      accessRequest.reason ??
        accessRequest.request_reason ??
        accessRequest.reason_text ??
        "Clinical access requested."
    );
    const expiresText = accessRequest.expires_at
      ? new Date(accessRequest.expires_at).toLocaleString("en-IN", {
          dateStyle: "medium",
          timeStyle: "short",
        })
      : "the request expiry time";

    const { error: sendError } = await resend.emails.send({
      from: process.env.RESEND_FROM_EMAIL || "Medi Key <onboarding@resend.dev>",
      to: [patientEmail],
      subject: `${hospitalName} requested access to your MediKey records`,
      html: `
        <div style="margin:0;background:#f7faf8;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#19302f;">
          <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #dfe9e6;border-radius:20px;overflow:hidden;">
            <div style="padding:28px 30px;background:#e6f3ef;border-bottom:1px solid #dfe9e6;">
              <div style="font-size:24px;font-weight:800;color:#176b67;">MediKey</div>
              <div style="margin-top:6px;font-size:13px;color:#667a78;">Sensitive medical access request</div>
            </div>

            <div style="padding:30px;">
              <p style="margin:0 0 18px;font-size:16px;">Hi ${escapeHtml(patientName)},</p>

              <p style="margin:0 0 20px;font-size:15px;line-height:1.7;color:#526765;">
                <strong>${escapeHtml(hospitalName)}</strong> has requested access to your sensitive MediKey medical information.
              </p>

              <div style="padding:18px;border:1px solid #dfe9e6;border-radius:14px;background:#f7faf8;">
                <div style="font-size:12px;font-weight:800;letter-spacing:.08em;color:#176b67;">REASON FOR ACCESS</div>
                <div style="margin-top:8px;font-size:14px;line-height:1.6;color:#19302f;">${escapeHtml(reason)}</div>
              </div>

              <p style="margin:20px 0 0;font-size:13px;line-height:1.6;color:#667a78;">
                This request expires at <strong>${escapeHtml(expiresText)}</strong>.
                No medical records are included in this email.
              </p>

              <div style="margin-top:26px;">
                <a href="${escapeHtml(securityUrl)}" style="display:inline-block;padding:13px 20px;border-radius:12px;background:#176b67;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;">
                  Review Access Request
                </a>
              </div>

              <p style="margin:22px 0 0;font-size:12px;line-height:1.6;color:#7b8b89;">
                Only approve access if you recognize the hospital and understand why access is being requested.
                You can deny the request from your MediKey Security page.
              </p>
            </div>
          </div>
        </div>
      `,
    });

    if (sendError) throw sendError;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sensitive access email error:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to send the sensitive-access email.",
      },
      { status: 500 }
    );
  }
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
