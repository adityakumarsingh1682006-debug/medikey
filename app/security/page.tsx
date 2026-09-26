"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type AccessRequest = {
  request_id: string;
  member_id: string;
  member_name: string | null;
  hospital_id: string;
  hospital_name: string;
  hospital_city: string | null;
  reason: string | null;
  access_scope: string[];
  status: "pending" | "approved" | "denied" | "expired" | "revoked";
  requested_at: string;
  approved_at: string | null;
  denied_at: string | null;
  expires_at: string | null;
  revoked_at: string | null;
};

type AuditEntry = {
  log_id: string;
  request_id: string | null;
  member_id: string;
  member_name: string | null;
  hospital_id: string | null;
  hospital_name: string | null;
  hospital_city: string | null;
  event_type: string;
  resource_type: string | null;
  resource_id: string | null;
  accessed_at: string;
  metadata: Record<string, unknown> | null;
};

export default function SecurityPage() {
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [history, setHistory] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadSecurityData() {
    try {
      setLoading(true);
      setError("");

      const [requestsResult, historyResult] = await Promise.all([
        supabase.rpc("get_my_sensitive_access_requests"),
        supabase.rpc("get_my_sensitive_access_history"),
      ]);

      if (requestsResult.error) {
        throw requestsResult.error;
      }

      if (historyResult.error) {
        throw historyResult.error;
      }

      setRequests((requestsResult.data ?? []) as AccessRequest[]);
      setHistory((historyResult.data ?? []) as AuditEntry[]);
    } catch (err) {
      console.error("Security data error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't load your security information."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSecurityData();
  }, []);

  async function approveRequest(requestId: string) {
    try {
      setActionId(requestId);
      setError("");
      setMessage("");

      const { error: rpcError } = await supabase.rpc(
        "approve_sensitive_access_request",
        {
          p_request_id: requestId,
          p_duration_minutes: 30,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setMessage(
        "Access approved for 30 minutes. You can revoke it at any time."
      );

      await loadSecurityData();
    } catch (err) {
      console.error("Approve request error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't approve this access request."
      );
    } finally {
      setActionId(null);
    }
  }

  async function denyRequest(requestId: string) {
    try {
      setActionId(requestId);
      setError("");
      setMessage("");

      const { error: rpcError } = await supabase.rpc(
        "deny_sensitive_access_request",
        {
          p_request_id: requestId,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setMessage("The hospital access request was denied.");

      await loadSecurityData();
    } catch (err) {
      console.error("Deny request error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't deny this access request."
      );
    } finally {
      setActionId(null);
    }
  }

  async function revokeRequest(requestId: string) {
    try {
      setActionId(requestId);
      setError("");
      setMessage("");

      const confirmed = window.confirm(
        "Revoke this hospital's access immediately?"
      );

      if (!confirmed) {
        setActionId(null);
        return;
      }

      const { error: rpcError } = await supabase.rpc(
        "revoke_sensitive_access_request",
        {
          p_request_id: requestId,
        }
      );

      if (rpcError) {
        throw rpcError;
      }

      setMessage("Hospital access has been revoked.");

      await loadSecurityData();
    } catch (err) {
      console.error("Revoke request error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't revoke this access."
      );
    } finally {
      setActionId(null);
    }
  }

  const pendingRequests = requests.filter(
    (request) => request.status === "pending"
  );

  const activeRequests = requests.filter(
    (request) =>
      request.status === "approved" &&
      request.expires_at &&
      new Date(request.expires_at).getTime() > Date.now()
  );

  return (
    <main className="min-h-screen bg-medikey-ivory">
      {/* HEADER */}
      <header className="bg-white border-b border-medikey-border">
        <div className="max-w-5xl mx-auto px-5 py-5 flex items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="font-bold text-medikey-text text-lg"
          >
            MediKey
          </Link>

          <Link
            href="/dashboard"
            className="text-sm font-semibold text-medikey-teal hover:opacity-80 transition"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-10 pb-20">
        {/* PAGE TITLE */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-medikey-mint text-medikey-teal text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-medikey-teal" />
            Privacy & Security
          </div>

          <h1 className="mt-4 text-3xl md:text-4xl font-bold text-medikey-text">
            Security
          </h1>

          <p className="mt-2 text-sm md:text-base text-medikey-muted max-w-2xl leading-7">
            Control who can access your sensitive medical information and see
            exactly when authorized healthcare access happens.
          </p>
        </div>

        {/* GLOBAL MESSAGE */}
        {message && (
          <div className="mt-6 rounded-2xl border border-medikey-border bg-medikey-mint px-5 py-4 text-sm font-semibold text-medikey-teal">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {/* SENSITIVE ACCESS REQUESTS */}
        <section className="mt-10">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl">🔐</span>

                <h2 className="text-xl font-bold text-medikey-text">
                  Highly Sensitive Data
                </h2>

                {pendingRequests.length > 0 && (
                  <span className="min-w-6 h-6 px-2 rounded-full bg-medikey-teal text-white text-xs font-bold flex items-center justify-center">
                    {pendingRequests.length}
                  </span>
                )}
              </div>

              <p className="mt-2 text-sm text-medikey-muted leading-6 max-w-2xl">
                Hospitals must request your permission before accessing highly
                sensitive information.
              </p>
            </div>
          </div>

          {/* LOADING */}
          {loading ? (
            <div className="mt-5 bg-white rounded-3xl border border-medikey-border p-7">
              <div className="animate-pulse space-y-4">
                <div className="h-5 w-48 rounded bg-medikey-mint" />
                <div className="h-4 w-72 rounded bg-medikey-mint" />
                <div className="h-12 w-full rounded-2xl bg-medikey-mint" />
              </div>
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="mt-5 bg-white rounded-3xl border border-medikey-border p-7">
              <div className="w-12 h-12 rounded-2xl bg-medikey-mint flex items-center justify-center text-xl">
                ✓
              </div>

              <h3 className="mt-5 font-bold text-medikey-text">
                No pending access requests
              </h3>

              <p className="mt-2 text-sm text-medikey-muted leading-6 max-w-xl">
                When a verified hospital requests access to highly sensitive
                information, the request will appear here before anything is
                shared.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {pendingRequests.map((request) => (
                <AccessRequestCard
                  key={request.request_id}
                  request={request}
                  loading={actionId === request.request_id}
                  onApprove={() => approveRequest(request.request_id)}
                  onDeny={() => denyRequest(request.request_id)}
                />
              ))}
            </div>
          )}
        </section>

        {/* ACTIVE ACCESS */}
        <section className="mt-10">
          <div>
            <h2 className="text-xl font-bold text-medikey-text">
              Active Authorized Access
            </h2>

            <p className="mt-2 text-sm text-medikey-muted">
              Hospitals currently authorized to access sensitive information.
            </p>
          </div>

          {activeRequests.length === 0 ? (
            <div className="mt-5 bg-white rounded-3xl border border-medikey-border p-6">
              <p className="text-sm text-medikey-muted">
                No hospital currently has active sensitive-data access.
              </p>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {activeRequests.map((request) => (
                <div
                  key={request.request_id}
                  className="bg-white rounded-3xl border border-medikey-border p-6"
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 shrink-0 rounded-2xl bg-medikey-mint flex items-center justify-center text-xl">
                        🏥
                      </div>

                      <div>
                        <h3 className="font-bold text-medikey-text">
                          {request.hospital_name}
                        </h3>

                        <p className="mt-1 text-sm text-medikey-muted">
                          {request.hospital_city || "Registered hospital"}
                        </p>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {request.access_scope.map((scope) => (
                            <span
                              key={scope}
                              className="px-2.5 py-1 rounded-lg bg-medikey-ivory border border-medikey-border text-xs font-semibold text-medikey-muted"
                            >
                              {formatScope(scope)}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="md:text-right">
                      <p className="text-xs font-semibold text-medikey-muted uppercase tracking-wide">
                        Access expires
                      </p>

                      <p className="mt-1 text-sm font-bold text-medikey-text">
                        {request.expires_at
                          ? formatDate(request.expires_at)
                          : "Unknown"}
                      </p>

                      <button
                        onClick={() => revokeRequest(request.request_id)}
                        disabled={actionId === request.request_id}
                        className="mt-3 px-4 py-2 rounded-xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition disabled:opacity-50"
                      >
                        {actionId === request.request_id
                          ? "Revoking..."
                          : "Revoke Access"}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* AUDIT HISTORY */}
        <section className="mt-12">
          <div>
            <h2 className="text-xl font-bold text-medikey-text">
              Sensitive Access History
            </h2>

            <p className="mt-2 text-sm text-medikey-muted leading-6">
              A transparent record of sensitive-data requests, approvals,
              denials and access events.
            </p>
          </div>

          {history.length === 0 ? (
            <div className="mt-5 bg-white rounded-3xl border border-medikey-border p-7">
              <div className="w-11 h-11 rounded-xl bg-medikey-mint flex items-center justify-center text-medikey-teal">
                ✓
              </div>

              <h3 className="mt-5 font-bold text-medikey-text">
                No access history yet
              </h3>

              <p className="mt-2 text-sm text-medikey-muted leading-6">
                Sensitive access activity will appear here automatically.
              </p>
            </div>
          ) : (
            <div className="mt-5 bg-white rounded-3xl border border-medikey-border overflow-hidden">
              <div className="divide-y divide-medikey-border">
                {history.map((entry) => (
                  <AuditRow key={entry.log_id} entry={entry} />
                ))}
              </div>
            </div>
          )}
        </section>

        {/* SECURITY EXPLANATION */}
        <section className="mt-12">
          <h2 className="text-xl font-bold text-medikey-text">
            How MediKey protects your information
          </h2>

          <div className="mt-5 grid md:grid-cols-2 gap-5">
            <SecurityCard
              title="Emergency information"
              text="Only critical emergency information is designed to be visible through your MediKey emergency flow."
              icon="♥"
            />

            <SecurityCard
              title="Medical records"
              text="Full medical records are kept separate from the public emergency view."
              icon="▣"
            />

            <SecurityCard
              title="Controlled access"
              text="Healthcare professional access can be requested, approved, revoked and audited."
              icon="✓"
            />

            <SecurityCard
              title="Prototype mode"
              text="This hackathon prototype uses synthetic data. Do not upload real medical documents."
              icon="!"
            />
          </div>
        </section>
      </div>
    </main>
  );
}

/* ============================================================
   ACCESS REQUEST CARD
============================================================ */

function AccessRequestCard({
  request,
  loading,
  onApprove,
  onDeny,
}: {
  request: AccessRequest;
  loading: boolean;
  onApprove: () => void;
  onDeny: () => void;
}) {
  return (
    <div className="bg-white rounded-3xl border border-medikey-border p-6 shadow-sm">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-13 h-13 min-w-13 rounded-2xl bg-medikey-mint flex items-center justify-center text-xl">
            🏥
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-bold text-medikey-text">
                {request.hospital_name}
              </h3>

              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold">
                Awaiting approval
              </span>
            </div>

            <p className="mt-1 text-sm text-medikey-muted">
              {request.hospital_city || "Registered hospital"}
            </p>

            <p className="mt-4 text-sm text-medikey-text leading-6">
              This verified hospital is requesting temporary access to highly
              sensitive information for{" "}
              <strong>{request.member_name || "your profile"}</strong>.
            </p>

            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-medikey-muted">
                Requested information
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {request.access_scope.map((scope) => (
                  <span
                    key={scope}
                    className="px-3 py-1.5 rounded-xl bg-medikey-ivory border border-medikey-border text-xs font-semibold text-medikey-text"
                  >
                    {formatScope(scope)}
                  </span>
                ))}
              </div>
            </div>

            {request.reason && (
              <div className="mt-4 rounded-2xl bg-medikey-ivory border border-medikey-border p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-medikey-muted">
                  Hospital's reason
                </p>

                <p className="mt-1 text-sm text-medikey-text leading-6">
                  {request.reason}
                </p>
              </div>
            )}

            <p className="mt-4 text-xs text-medikey-muted">
              Requested {formatDate(request.requested_at)}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:min-w-44">
          <button
            onClick={onApprove}
            disabled={loading}
            className="px-5 py-3 rounded-2xl bg-medikey-teal text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? "Processing..." : "Approve · 30 min"}
          </button>

          <button
            onClick={onDeny}
            disabled={loading}
            className="px-5 py-3 rounded-2xl border border-red-200 text-red-600 text-sm font-bold hover:bg-red-50 transition disabled:opacity-50"
          >
            Deny Request
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   AUDIT ROW
============================================================ */

function AuditRow({ entry }: { entry: AuditEntry }) {
  const event = getEventInfo(entry.event_type);

  return (
    <div className="p-5 md:p-6">
      <div className="flex items-start gap-4">
        <div
          className={`w-11 h-11 min-w-11 rounded-xl flex items-center justify-center text-sm font-bold ${event.iconBg}`}
        >
          {event.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <h3 className="font-bold text-medikey-text">
                {event.title}
              </h3>

              <p className="mt-1 text-sm text-medikey-muted">
                {entry.hospital_name || "Hospital"}
                {entry.hospital_city
                  ? ` · ${entry.hospital_city}`
                  : ""}
              </p>
            </div>

            <p className="text-xs text-medikey-muted whitespace-nowrap">
              {formatDate(entry.accessed_at)}
            </p>
          </div>

          {entry.resource_type && (
            <p className="mt-3 text-xs font-semibold text-medikey-muted">
              Data: {formatScope(entry.resource_type)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SECURITY CARD
============================================================ */

function SecurityCard({
  title,
  text,
  icon,
}: {
  title: string;
  text: string;
  icon: string;
}) {
  return (
    <div className="bg-white rounded-3xl border border-medikey-border p-6">
      <div className="w-11 h-11 rounded-xl bg-medikey-mint flex items-center justify-center text-medikey-teal font-bold">
        {icon}
      </div>

      <h2 className="mt-5 font-bold text-medikey-text">{title}</h2>

      <p className="mt-2 text-sm text-medikey-muted leading-6">{text}</p>
    </div>
  );
}

/* ============================================================
   HELPERS
============================================================ */

function formatScope(scope: string) {
  return scope
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function getEventInfo(eventType: string) {
  switch (eventType) {
    case "request_created":
      return {
        title: "Access requested",
        icon: "→",
        iconBg: "bg-amber-50 text-amber-700",
      };

    case "request_approved":
      return {
        title: "Access approved",
        icon: "✓",
        iconBg: "bg-medikey-mint text-medikey-teal",
      };

    case "request_denied":
      return {
        title: "Access denied",
        icon: "×",
        iconBg: "bg-red-50 text-red-600",
      };

    case "access_started":
      return {
        title: "Sensitive access started",
        icon: "🔓",
        iconBg: "bg-medikey-mint text-medikey-teal",
      };

    case "record_viewed":
      return {
        title: "Medical record viewed",
        icon: "▣",
        iconBg: "bg-medikey-mint text-medikey-teal",
      };

    case "insurance_viewed":
      return {
        title: "Insurance information viewed",
        icon: "▤",
        iconBg: "bg-medikey-mint text-medikey-teal",
      };

    case "access_expired":
      return {
        title: "Access expired",
        icon: "⌛",
        iconBg: "bg-medikey-ivory text-medikey-muted",
      };

    case "access_revoked":
      return {
        title: "Access revoked",
        icon: "×",
        iconBg: "bg-red-50 text-red-600",
      };

    default:
      return {
        title: "Security event",
        icon: "•",
        iconBg: "bg-medikey-ivory text-medikey-muted",
      };
  }
}