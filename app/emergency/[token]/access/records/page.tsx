"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type Patient = {
  member_id: string;
  full_name: string | null;
};

type RecordItem = {
  id: string;
  title: string;
  record_type: string | null;
  record_date: string | null;
  file_path: string;
  created_at: string;
};

type InsurancePolicy = {
  id: string;
  provider_name: string;
  policy_number: string;
  policy_type: string;
  policy_holder_name: string;
  coverage_amount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  customer_care_phone: string | null;
};

export default function HospitalRecordsPage() {
  const params = useParams();
  const router = useRouter();

  const token =
    typeof params?.token === "string"
      ? params.token
      : Array.isArray(params?.token)
        ? params.token[0]
        : "";

  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicy[]>([]);
  const [grantId, setGrantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadRecords() {
      if (!token) {
        setError("Invalid MediKey QR token.");
        setLoading(false);
        return;
      }

      try {
        setError("");

        const storedGrant = sessionStorage.getItem(
          `medikey-hospital-grant:${token}`
        );

        if (!storedGrant) {
          setError("Hospital verification is required before private records can be viewed.");
          setLoading(false);
          return;
        }

        setGrantId(storedGrant);

        const { data, error: recordsError } = await supabase.rpc(
          "get_hospital_access_records",
          { p_grant_id: storedGrant }
        );

        if (recordsError) throw recordsError;

        const result = Array.isArray(data) ? data : [];

        if (!result.length && !result[0]) {
          // Empty is valid; authorization is still checked by the RPC.
        }

        const first = result[0];
        if (first?.access_denied) {
          throw new Error("Hospital access has expired or been revoked.");
        }

        setRecords(result as RecordItem[]);

        const { data: emergencyData, error: emergencyError } =
          await supabase.rpc("get_public_medikey_emergency", {
            p_token: token,
          });

        if (emergencyError) throw emergencyError;

        const profile = Array.isArray(emergencyData)
          ? emergencyData[0]
          : emergencyData;

        if (!profile?.member_id) {
          throw new Error("This MediKey card is invalid or inactive.");
        }

        setPatient({
          member_id: profile.member_id,
          full_name: profile.full_name,
        });

        const { data: insuranceData, error: insuranceError } =
          await supabase
            .from("insurance_policies")
            .select(
              "id, provider_name, policy_number, policy_type, policy_holder_name, coverage_amount, valid_from, valid_until, customer_care_phone"
            )
            .eq("member_id", profile.member_id)
            .order("created_at", { ascending: false });

        if (insuranceError) {
          // Insurance is an additional section. Do not block authorized
          // medical-record access if the insurance query fails.
          console.error("Insurance load error:", insuranceError);
          setInsurancePolicies([]);
        } else {
          setInsurancePolicies((insuranceData ?? []) as InsurancePolicy[]);
        }
      } catch (err) {
        console.error("Hospital records error:", err);
        setError(
          err instanceof Error && err.message
            ? err.message
            : "We couldn't load this patient's authorized medical records."
        );
      } finally {
        setLoading(false);
      }
    }

    loadRecords();
  }, [token]);

  async function openRecord(record: RecordItem) {
    try {
      setOpening(record.id);
      setError("");

      if (!grantId) {
        throw new Error("Hospital authorization is missing or expired.");
      }

      const response = await fetch("/api/hospital-record", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_id: grantId,
          record_id: record.id,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.signedUrl) {
        throw new Error(payload.error || "This record could not be opened.");
      }

      window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
    } catch (err) {
      console.error("Record open error:", err);
      setError(
        err instanceof Error && err.message
          ? err.message
          : "This record could not be opened."
      );
    } finally {
      setOpening(null);
    }
  }

  if (loading) {
    return (
      <>
        <style jsx global>{styles}</style>

        <main className="page">
          <div className="center-card">
            <div className="brand-mark">+</div>
            <div className="spinner" />

            <h1>Loading medical records</h1>

            <p>
              MediKey is securely preparing the patient's
              authorized medical information.
            </p>
          </div>
        </main>
      </>
    );
  }

  if (error && !patient) {
    return (
      <>
        <style jsx global>{styles}</style>

        <main className="page">
          <div className="center-card">
            <div className="error-icon">!</div>

            <div className="eyebrow">MEDIKEY</div>

            <h1>Records unavailable</h1>

            <p>{error}</p>

            <button
              className="primary-button"
              onClick={() =>
                router.push(
                  `/emergency/${encodeURIComponent(token)}`
                )
              }
            >
              Back to Emergency Profile
            </button>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <style jsx global>{styles}</style>

      <main className="page">
        <div className="shell">

          {/* HEADER */}
          <header className="header">
            <button
              className="back-button"
              onClick={() =>
                router.push(
                  `/emergency/${encodeURIComponent(token)}/access`
                )
              }
            >
              ← Hospital Verification
            </button>

            <div className="brand">
              <div className="brand-mark">+</div>

              <div>
                <div className="brand-name">MediKey</div>
                <div className="brand-subtitle">
                  Secure Medical Access
                </div>
              </div>
            </div>

            <div className="secure-pill">
              <span />
              Private
            </div>
          </header>

          {/* HERO */}
          <section className="hero">
            <div className="hero-icon">📋</div>

            <div className="eyebrow">
              AUTHORIZED MEDICAL RECORDS
            </div>

            <h1>
              {patient?.full_name || "Patient"}'s records
            </h1>

            <p>
              Private medical information associated with this
              MediKey profile.
            </p>
          </section>

          {/* SECURITY BANNER */}
          <section className="security-card">
            <div className="security-icon">🔐</div>

            <div>
              <div className="security-title">
                Protected medical information
              </div>

              <div className="security-text">
                These records are private. Access should only be
                used by authorized healthcare personnel for
                legitimate patient care.
              </div>
            </div>
          </section>

          {/* ERROR */}
          {error && (
            <div className="error-message">
              <strong>Access notice</strong>
              <span>{error}</span>
            </div>
          )}

          {/* RECORDS */}
          <section className="records-card">
            <div className="records-header">
              <div>
                <div className="section-label">
                  MEDICAL DOCUMENTS
                </div>

                <h2>
                  {records.length}{" "}
                  {records.length === 1
                    ? "record"
                    : "records"}
                </h2>
              </div>
            </div>

            {records.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📄</div>

                <h3>No medical records</h3>

                <p>
                  No medical documents have been uploaded for
                  this patient yet.
                </p>
              </div>
            ) : (
              <div className="record-list">
                {records.map((record) => (
                  <article
                    className="record-item"
                    key={record.id}
                  >
                    <div className="record-icon">📄</div>

                    <div className="record-info">
                      <h3>
                        {record.title || "Medical Record"}
                      </h3>

                      <div className="record-meta">
                        <span>
                          {record.record_type ||
                            "Medical document"}
                        </span>

                        {record.record_date && (
                          <>
                            <span>•</span>

                            <span>
                              {formatDate(
                                record.record_date
                              )}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      className="open-button"
                      disabled={opening === record.id}
                      onClick={() => openRecord(record)}
                    >
                      {opening === record.id
                        ? "Opening..."
                        : "Open"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* INSURANCE */}
          <section className="insurance-card">
            <div className="insurance-header">
              <div className="insurance-heading">
                <div className="insurance-icon">🛡️</div>
                <div>
                  <div className="section-label">INSURANCE</div>
                  <h2>
                    {insurancePolicies.length}{" "}
                    {insurancePolicies.length === 1
                      ? "policy"
                      : "policies"}
                  </h2>
                </div>
              </div>

              <div className="insurance-private-pill">
                Authorized view
              </div>
            </div>

            {insurancePolicies.length === 0 ? (
              <div className="insurance-empty">
                <div className="insurance-empty-icon">🛡️</div>
                <div>
                  <h3>No insurance information added</h3>
                  <p>
                    No insurance policy has been stored for this MediKey
                    profile.
                  </p>
                </div>
              </div>
            ) : (
              <div className="insurance-list">
                {insurancePolicies.map((policy) => {
                  const status = getInsuranceStatus(policy.valid_until);

                  return (
                    <article className="insurance-item" key={policy.id}>
                      <div className="insurance-item-top">
                        <div className="insurance-provider">
                          <div className="insurance-provider-icon">✓</div>
                          <div>
                            <h3>{policy.provider_name}</h3>
                            <p>{policy.policy_type}</p>
                          </div>
                        </div>

                        <span className={`insurance-status ${status.className}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="insurance-grid">
                        <div className="insurance-detail">
                          <span>Policy number</span>
                          <strong>{maskPolicyNumber(policy.policy_number)}</strong>
                        </div>

                        <div className="insurance-detail">
                          <span>Policy holder</span>
                          <strong>{policy.policy_holder_name || "Not specified"}</strong>
                        </div>

                        <div className="insurance-detail">
                          <span>Coverage</span>
                          <strong>{formatCoverage(policy.coverage_amount)}</strong>
                        </div>

                        <div className="insurance-detail">
                          <span>Valid until</span>
                          <strong>{formatDate(policy.valid_until)}</strong>
                        </div>
                      </div>

                      {policy.customer_care_phone && (
                        <a
                          className="insurance-call"
                          href={`tel:${policy.customer_care_phone}`}
                        >
                          Call insurance support
                          <span>→</span>
                        </a>
                      )}
                    </article>
                  );
                })}
              </div>
            )}

            <div className="insurance-notice">
              <span>🔒</span>
              <p>
                Insurance details are shown here because this page is inside
                the authorized hospital-access flow. The public emergency QR
                page does not expose these private policy details.
              </p>
            </div>
          </section>

          {/* PRIVACY */}
          <section className="privacy-card">
            <div className="privacy-icon">✓</div>

            <div>
              <div className="privacy-title">
                MediKey privacy layer
              </div>

              <div className="privacy-text">
                Emergency information is separate from private
                medical records. Record access should be
                authorized and auditable.
              </div>
            </div>
          </section>

          <footer>
            <div className="footer-brand">
              <span>+</span>
              MediKey
            </div>

            <div>
              When you can't speak, MediKey speaks for you.
            </div>
          </footer>

        </div>
      </main>
    </>
  );
}

function formatDate(date: string | null) {
  if (!date) {
    return "Not specified";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Not specified";
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function maskPolicyNumber(value: string | null) {
  const clean = (value ?? "").trim();

  if (!clean) return "Not specified";
  if (clean.length <= 4) return "••••";

  return `${"•".repeat(Math.min(clean.length - 4, 8))}${clean.slice(-4)}`;
}

function formatCoverage(value: number | null) {
  if (value === null || value === undefined) {
    return "Not specified";
  }

  return `₹${Number(value).toLocaleString("en-IN")}`;
}

function getInsuranceStatus(validUntil: string | null) {
  if (!validUntil) {
    return {
      label: "Validity not specified",
      className: "insurance-status-neutral",
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(`${validUntil}T00:00:00`);

  if (Number.isNaN(expiry.getTime())) {
    return {
      label: "Validity not specified",
      className: "insurance-status-neutral",
    };
  }

  if (expiry < today) {
    return {
      label: "Expired",
      className: "insurance-status-expired",
    };
  }

  const days = Math.ceil(
    (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (days <= 30) {
    return {
      label: `Expires in ${days} day${days === 1 ? "" : "s"}`,
      className: "insurance-status-warning",
    };
  }

  return {
    label: "Active",
    className: "insurance-status-active",
  };
}

const styles = `
:root {
  --teal: #176B67;
  --teal-dark: #115652;
  --sage: #7BAE9D;
  --ivory: #F7FAF8;
  --white: #FFFFFF;
  --mint: #E6F3EF;
  --charcoal: #19302F;
  --slate: #667A78;
  --crimson: #C93C4B;
  --border: #DFE9E6;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: var(--ivory);
  color: var(--charcoal);
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

button {
  font: inherit;
}

.page {
  min-height: 100vh;
  padding: 22px 16px 45px;
  background:
    radial-gradient(
      circle at 50% -10%,
      rgba(230,243,239,.95),
      transparent 42%
    ),
    var(--ivory);
}

.shell {
  width: min(850px, 100%);
  margin: auto;
}

.header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 15px;
  margin-bottom: 25px;
}

.brand {
  grid-column: 2;
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-mark {
  width: 42px;
  height: 42px;
  border-radius: 13px;
  display: grid;
  place-items: center;
  background: var(--mint);
  color: var(--teal);
  font-size: 26px;
  font-weight: 900;
}

.brand-name {
  font-weight: 850;
  font-size: 18px;
}

.brand-subtitle {
  color: var(--slate);
  font-size: 11px;
  margin-top: 2px;
}

.back-button {
  justify-self: start;
  border: 0;
  background: transparent;
  color: var(--slate);
  font-size: 11px;
  font-weight: 750;
  padding: 7px 0;
}

.secure-pill {
  justify-self: end;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 11px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(255,255,255,.8);
  color: var(--teal);
  font-size: 11px;
  font-weight: 800;
}

.secure-pill span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--sage);
}

.hero {
  text-align: center;
  padding: 15px 10px 25px;
}

.hero-icon {
  width: 62px;
  height: 62px;
  margin: 0 auto 17px;
  display: grid;
  place-items: center;
  border-radius: 19px;
  background: var(--mint);
  font-size: 27px;
}

.eyebrow,
.section-label {
  color: var(--sage);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .13em;
}

.hero h1 {
  margin: 7px 0 8px;
  font-size: clamp(28px, 6vw, 38px);
  letter-spacing: -.04em;
}

.hero p {
  max-width: 550px;
  margin: auto;
  color: var(--slate);
  line-height: 1.55;
  font-size: 13px;
}

.security-card,
.records-card,
.insurance-card {
  margin-top: 15px;
  padding: 21px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: 0 10px 35px rgba(25,48,47,.055);
}

.insurance-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 15px;
}

.insurance-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.insurance-icon {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--mint);
  font-size: 20px;
}

.insurance-header h2 {
  margin: 5px 0 0;
  font-size: 22px;
  letter-spacing: -.025em;
}

.insurance-private-pill {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(230,243,239,.65);
  color: var(--teal);
  font-size: 10px;
  font-weight: 850;
}

.insurance-list {
  display: grid;
  gap: 10px;
}

.insurance-item {
  padding: 15px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fbfdfc;
}

.insurance-item-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.insurance-provider {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.insurance-provider-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: var(--mint);
  color: var(--teal);
  font-weight: 900;
}

.insurance-provider h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 850;
}

.insurance-provider p {
  margin: 3px 0 0;
  color: var(--slate);
  font-size: 10px;
}

.insurance-status {
  flex: 0 0 auto;
  padding: 6px 9px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 850;
}

.insurance-status-active {
  background: var(--mint);
  color: var(--teal);
}

.insurance-status-warning {
  background: #fff6e4;
  color: #a36d12;
}

.insurance-status-expired {
  background: #fff0f2;
  color: var(--crimson);
}

.insurance-status-neutral {
  background: #f0f3f2;
  color: var(--slate);
}

.insurance-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  margin-top: 13px;
}

.insurance-detail {
  padding: 10px;
  border-radius: 11px;
  background: var(--ivory);
}

.insurance-detail span {
  display: block;
  color: var(--slate);
  font-size: 9px;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: .08em;
}

.insurance-detail strong {
  display: block;
  margin-top: 3px;
  overflow-wrap: anywhere;
  font-size: 11px;
  font-weight: 800;
}

.insurance-call {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  padding: 10px 12px;
  border-radius: 11px;
  background: var(--mint);
  color: var(--teal);
  text-decoration: none;
  font-size: 10px;
  font-weight: 850;
}

.insurance-empty {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 18px;
  border: 1px dashed var(--border);
  border-radius: 15px;
  background: var(--ivory);
}

.insurance-empty-icon {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: white;
}

.insurance-empty h3 {
  margin: 0;
  font-size: 13px;
}

.insurance-empty p {
  margin: 4px 0 0;
  color: var(--slate);
  font-size: 10px;
  line-height: 1.45;
}

.insurance-notice {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgba(230,243,239,.55);
}

.insurance-notice span {
  flex: 0 0 auto;
  font-size: 13px;
}

.insurance-notice p {
  margin: 0;
  color: var(--slate);
  font-size: 9px;
  line-height: 1.45;
}

.privacy-card {
  background: white;
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: 0 10px 35px rgba(25,48,47,.055);
}

.security-card {
  display: flex;
  gap: 12px;
  padding: 16px;
  margin-bottom: 15px;
  background: rgba(230,243,239,.6);
}

.security-icon {
  width: 39px;
  height: 39px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: white;
}

.security-title {
  font-size: 12px;
  font-weight: 850;
}

.security-text {
  margin-top: 3px;
  color: var(--slate);
  font-size: 11px;
  line-height: 1.5;
}

.records-card {
  padding: 21px;
}

.records-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
}

.records-header h2 {
  margin: 5px 0 0;
  font-size: 22px;
  letter-spacing: -.025em;
}

.record-list {
  display: grid;
  gap: 10px;
}

.record-item {
  display: flex;
  align-items: center;
  gap: 13px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 15px;
  background: #fbfdfc;
}

.record-icon {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--mint);
}

.record-info {
  min-width: 0;
  flex: 1;
}

.record-info h3 {
  margin: 0;
  font-size: 13px;
  font-weight: 850;
}

.record-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
  color: var(--slate);
  font-size: 10px;
}

.open-button {
  flex: 0 0 auto;
  border: 0;
  border-radius: 10px;
  padding: 9px 13px;
  background: var(--teal);
  color: white;
  font-size: 11px;
  font-weight: 800;
}

.open-button:disabled {
  opacity: .65;
}

.empty-state {
  padding: 42px 20px;
  text-align: center;
  border: 1px dashed var(--border);
  border-radius: 16px;
  background: var(--ivory);
}

.empty-icon {
  font-size: 30px;
}

.empty-state h3 {
  margin: 10px 0 5px;
  font-size: 16px;
}

.empty-state p {
  margin: 0;
  color: var(--slate);
  font-size: 12px;
}

.error-message {
  margin-bottom: 13px;
  padding: 12px;
  border-radius: 12px;
  background: #fff3f4;
  border: 1px solid #f1d5d9;
  color: var(--crimson);
  font-size: 11px;
  line-height: 1.45;
}

.error-message strong,
.error-message span {
  display: block;
}

.error-message span {
  margin-top: 2px;
}

.privacy-card {
  display: flex;
  gap: 11px;
  margin-top: 13px;
  padding: 14px 16px;
  background: rgba(230,243,239,.58);
}

.privacy-icon {
  width: 37px;
  height: 37px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: white;
  color: var(--teal);
  font-weight: 900;
}

.privacy-title {
  font-size: 12px;
  font-weight: 850;
}

.privacy-text {
  margin-top: 2px;
  color: var(--slate);
  font-size: 11px;
  line-height: 1.4;
}

footer {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  padding: 20px 2px 0;
  color: var(--slate);
  font-size: 9px;
}

.footer-brand {
  color: var(--teal);
  font-weight: 850;
}

.footer-brand span {
  margin-right: 4px;
}

.center-card {
  width: min(460px, 100%);
  margin: 10vh auto;
  padding: 34px;
  text-align: center;
  background: white;
  border: 1px solid var(--border);
  border-radius: 22px;
}

.center-card .brand-mark {
  margin: 0 auto 20px;
}

.center-card h1 {
  font-size: 22px;
}

.center-card p {
  color: var(--slate);
  font-size: 13px;
  line-height: 1.5;
}

.spinner {
  width: 27px;
  height: 27px;
  margin: auto;
  border-radius: 50%;
  border: 3px solid var(--mint);
  border-top-color: var(--teal);
  animation: spin .8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.error-icon {
  width: 58px;
  height: 58px;
  margin: auto;
  display: grid;
  place-items: center;
  border-radius: 17px;
  background: #fde8eb;
  color: var(--crimson);
  font-size: 26px;
  font-weight: 900;
}

.primary-button {
  margin-top: 15px;
  border: 0;
  border-radius: 11px;
  padding: 12px 16px;
  background: var(--teal);
  color: white;
  font-size: 12px;
  font-weight: 800;
}

@media (max-width: 600px) {
  .page {
    padding: 15px 12px 35px;
  }

  .header {
    grid-template-columns: 1fr auto;
  }

  .brand {
    grid-column: 1;
    grid-row: 1;
  }

  .back-button {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .secure-pill {
    grid-column: 2;
    grid-row: 1;
  }

  .insurance-header {
    align-items: flex-start;
  }

  .insurance-private-pill {
    display: none;
  }

  .insurance-item-top {
    flex-direction: column;
  }

  .insurance-status {
    align-self: flex-start;
  }

  .insurance-grid {
    grid-template-columns: 1fr;
  }

  .record-item {
    align-items: flex-start;
  }

  .open-button {
    padding: 8px 10px;
  }

  footer {
    flex-direction: column;
    text-align: center;
  }
}
`;