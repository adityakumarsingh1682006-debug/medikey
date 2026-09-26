"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type Patient = {
  member_id: string;
  full_name: string | null;
};

type EmergencyProfile = {
  blood_group: string | null;
  allergies: string | null;
  critical_medications: string | null;
  medical_conditions: string | null;
  emergency_notes: string | null;
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

type SensitiveAccessRequest = {
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

const AI_CACHE_TTL_MS = 15 * 60 * 1000;
const AI_CACHE_PREFIX = "medikey-ai-summary:";

type AISummary = {
  headline: string;
  summary: string;
  criticalAlerts: string[];
  medications: string[];
  conditions: string[];
  documentFindings?: string[];
  documentsProcessed?: number;
  documentsSkipped?: string[];
  verificationNote: string;
  isFallback?: boolean;
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
  const [emergencyProfile, setEmergencyProfile] =
    useState<EmergencyProfile | null>(null);
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [insurancePolicies, setInsurancePolicies] = useState<InsurancePolicy[]>(
    []
  );
  const [grantId, setGrantId] = useState("");
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState(false);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [aiError, setAiError] = useState("");
  const [error, setError] = useState("");
  const [sensitiveRequest, setSensitiveRequest] =
    useState<SensitiveAccessRequest | null>(null);
  const [sensitiveLoading, setSensitiveLoading] = useState(false);
  const [sensitiveSubmitting, setSensitiveSubmitting] = useState(false);
  const [sensitiveReason, setSensitiveReason] = useState("");
  const [sensitiveMessage, setSensitiveMessage] = useState("");

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
          setError(
            "Hospital verification is required before private records can be viewed."
          );
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
          full_name: profile.full_name ?? null,
        });

        setEmergencyProfile({
          blood_group: profile.blood_group ?? null,
          allergies: profile.allergies ?? null,
          critical_medications: profile.critical_medications ?? null,
          medical_conditions: profile.medical_conditions ?? null,
          emergency_notes: profile.emergency_notes ?? null,
        });

        // Insurance is treated as highly sensitive data.
        // It is intentionally NOT loaded during normal hospital access.
        // It will only be requested after the patient grants sensitive access.
        setInsurancePolicies([]);
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

  async function loadSensitiveAccessRequest() {
    if (!patient?.member_id) return;

    try {
      setSensitiveLoading(true);
      setSensitiveMessage("");

      const { data, error: requestError } = await supabase.rpc(
        "get_hospital_sensitive_access_status",
        {
          p_token: token,
          p_grant_id: grantId,
        }
      );

      if (requestError) {
        throw requestError;
      }

      const result = Array.isArray(data) ? data[0] : data;
      setSensitiveRequest(
        result ? (result as SensitiveAccessRequest) : null
      );
    } catch (err) {
      console.error("Sensitive access status error:", err);
      // Do not block normal authorized records if the status helper is not
      // available. The request action below remains independently protected.
    } finally {
      setSensitiveLoading(false);
    }
  }

  async function requestSensitiveAccess() {
    if (!token || !grantId || !patient?.member_id) {
      setSensitiveMessage("Hospital authorization is missing or expired.");
      return;
    }

    const reason = sensitiveReason.trim();

    if (!reason) {
      setSensitiveMessage(
        "Please enter a reason before requesting highly sensitive access."
      );
      return;
    }

    try {
      setSensitiveSubmitting(true);
      setSensitiveMessage("");

      const { data, error: requestError } = await supabase.rpc(
        "create_sensitive_access_request",
        {
          p_token: token,
          p_grant_id: grantId,
          p_access_scope: ["highly_sensitive", "insurance"],
          p_reason: reason,
        }
      );

      if (requestError) {
        throw requestError;
      }

      const result = Array.isArray(data) ? data[0] : data;

      if (!result?.request_id) {
        throw new Error("The sensitive-access request could not be created.");
      }

      setSensitiveRequest({
        request_id: result.request_id,
        member_id: result.member_id,
        member_name: patient.full_name,
        hospital_id: result.hospital_id,
        hospital_name: result.hospital_name,
        hospital_city: result.hospital_city,
        reason,
        access_scope: result.access_scope || ["highly_sensitive", "insurance"],
        status: result.status,
        requested_at: new Date().toISOString(),
        approved_at: null,
        denied_at: null,
        expires_at: null,
        revoked_at: null,
      });

      setSensitiveMessage(
        "Request sent. The patient must approve access before highly sensitive information is unlocked."
      );
      setSensitiveReason("");
    } catch (err) {
      console.error("Sensitive access request error:", err);
      setSensitiveMessage(
        err instanceof Error && err.message
          ? err.message
          : "We couldn't send the sensitive-access request."
      );
    } finally {
      setSensitiveSubmitting(false);
    }
  }

  function hasActiveSensitiveApproval() {
    return Boolean(
      sensitiveRequest?.status === "approved" &&
        sensitiveRequest.expires_at &&
        new Date(sensitiveRequest.expires_at).getTime() > Date.now()
    );
  }

  async function loadApprovedInsurance() {
    if (!hasActiveSensitiveApproval() || !token || !grantId) {
      setInsurancePolicies([]);
      return;
    }

    try {
      const { data, error: insuranceError } = await supabase.rpc(
        "get_hospital_sensitive_insurance",
        {
          p_token: token,
          p_grant_id: grantId,
        }
      );

      if (insuranceError) {
        throw insuranceError;
      }

      setInsurancePolicies((data ?? []) as InsurancePolicy[]);
    } catch (err) {
      console.error("Sensitive insurance load error:", err);
      setInsurancePolicies([]);
      setSensitiveMessage(
        err instanceof Error
          ? err.message
          : "Sensitive insurance information could not be loaded."
      );
    }
  }

  function formatSensitiveExpiry(value: string | null) {
    if (!value) return "Not available";

    return new Date(value).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  function getSensitiveStatusLabel() {
    if (!sensitiveRequest) return "Patient approval required";

    if (
      sensitiveRequest.status === "approved" &&
      sensitiveRequest.expires_at &&
      new Date(sensitiveRequest.expires_at).getTime() > Date.now()
    ) {
      return "Access approved";
    }

    if (sensitiveRequest.status === "pending") return "Waiting for approval";
    if (sensitiveRequest.status === "denied") return "Request denied";
    if (sensitiveRequest.status === "revoked") return "Access revoked";
    if (sensitiveRequest.status === "expired") return "Access expired";

    return "Patient approval required";
  }

  useEffect(() => {
    if (patient?.member_id) {
      loadSensitiveAccessRequest();
    }
  }, [patient?.member_id]);

  useEffect(() => {
    if (hasActiveSensitiveApproval()) {
      loadApprovedInsurance();
    } else {
      setInsurancePolicies([]);
    }
  }, [
    sensitiveRequest?.status,
    sensitiveRequest?.expires_at,
    patient?.member_id,
  ]);

  function getRecordMimeType(filePath: string) {
    const clean = (filePath || "").split("?")[0].toLowerCase();
    const extension = clean.includes(".")
      ? clean.slice(clean.lastIndexOf(".") + 1)
      : "";

    const map: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
    };

    return map[extension] || "";
  }

  async function getRecordSignedUrl(record: RecordItem) {
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
      throw new Error(
        payload.error || "This medical document could not be accessed."
      );
    }

    return payload.signedUrl as string;
  }

  function getAISummaryCacheKey() {
    return `${AI_CACHE_PREFIX}${token}:${JSON.stringify({
      patientId: patient?.member_id || "",
      profile: emergencyProfile,
      records: records.map((record) => ({
        id: record.id,
        title: record.title,
        record_type: record.record_type,
        record_date: record.record_date,
        file_path: record.file_path,
        created_at: record.created_at,
      })),
    })}`;
  }

  function readCachedAISummary(): AISummary | null {
    try {
      const raw = sessionStorage.getItem(getAISummaryCacheKey());
      if (!raw) return null;

      const cached = JSON.parse(raw) as {
        savedAt: number;
        summary: AISummary;
      };

      if (!cached?.savedAt || Date.now() - cached.savedAt > AI_CACHE_TTL_MS) {
        sessionStorage.removeItem(getAISummaryCacheKey());
        return null;
      }

      return cached.summary || null;
    } catch {
      return null;
    }
  }

  function saveCachedAISummary(summary: AISummary) {
    try {
      sessionStorage.setItem(
        getAISummaryCacheKey(),
        JSON.stringify({ savedAt: Date.now(), summary })
      );
    } catch {
      // Cache is an optimization only; never block the medical-record flow.
    }
  }

  async function generateAISummary(forceRefresh = false) {
    if (!patient) {
      setAiError("Patient information is not available.");
      return;
    }

    if (!emergencyProfile) {
      setAiError("Emergency information is not available.");
      return;
    }

    if (!forceRefresh) {
      const cachedSummary = readCachedAISummary();
      if (cachedSummary) {
        setAiError("");
        setAiSummary(cachedSummary);
        return;
      }
    }

    const createLocalFallbackSummary = (): AISummary => {
      const bloodGroup = emergencyProfile.blood_group?.trim();
      const allergies = emergencyProfile.allergies?.trim();
      const medications = emergencyProfile.critical_medications?.trim();
      const conditions = emergencyProfile.medical_conditions?.trim();
      const notes = emergencyProfile.emergency_notes?.trim();

      const criticalAlerts: string[] = [
        `Blood group: ${bloodGroup || "Not provided"}`,
        `Allergies: ${allergies || "Not provided"}`,
      ];

      if (notes) {
        criticalAlerts.push(`Emergency notes: ${notes}`);
      }

      return {
        headline: `Emergency Summary — ${patient.full_name || "Patient"}`,
        summary:
          `Blood group: ${bloodGroup || "Not provided"}. ` +
          `Allergies: ${allergies || "Not provided"}. ` +
          `Critical medications: ${medications || "Not provided"}. ` +
          `Medical conditions: ${conditions || "Not provided"}.`,
        criticalAlerts,
        medications: [medications || "Not provided"],
        conditions: [conditions || "Not provided"],
        documentFindings: [],
        documentsProcessed: 0,
        documentsSkipped:
          records.length > 0
            ? [
                "Document analysis was unavailable. Verify the original medical documents.",
              ]
            : [],
        verificationNote:
          "Gemini is temporarily unavailable. This fallback summary is generated directly from the patient's MediKey emergency profile and is not an AI-generated clinical assessment. Verify the original records before making clinical decisions.",
        isFallback: true,
      };
    };

    try {
      setGeneratingSummary(true);
      setAiError("");

      // Only documents already returned by the authorized hospital-access RPC
      // are considered. We obtain short-lived signed URLs through the same
      // protected endpoint used by the Open buttons.
      const documentCandidates = records
        .map((record) => ({
          record,
          mimeType: getRecordMimeType(record.file_path),
        }))
        .filter((item) => Boolean(item.mimeType));

      const documentResults = await Promise.allSettled(
        documentCandidates.map(async ({ record, mimeType }) => ({
          title: record.title || "Medical document",
          record_type: record.record_type,
          record_date: record.record_date,
          mimeType,
          signedUrl: await getRecordSignedUrl(record),
        }))
      );

      const documents = documentResults
        .filter(
          (
            result
          ): result is PromiseFulfilledResult<{
            title: string;
            record_type: string | null;
            record_date: string | null;
            mimeType: string;
            signedUrl: string;
          }> => result.status === "fulfilled"
        )
        .map((result) => result.value);

      const skippedDocumentAccess = documentResults
        .filter(
          (result): result is PromiseRejectedResult =>
            result.status === "rejected"
        )
        .map((result) =>
          result.reason instanceof Error
            ? result.reason.message
            : "A medical document could not be accessed."
        );

      const unsupportedDocuments = records
        .filter((record) => !getRecordMimeType(record.file_path))
        .map(
          (record) =>
            `${record.title || "Medical document"}: unsupported file type for document analysis.`
        );

      const response = await fetch("/api/gemini/emergency-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patientName: patient.full_name,
          emergencyProfile,
          records: records.map((record) => ({
            title: record.title,
            record_type: record.record_type,
            record_date: record.record_date,
          })),
          documents,
        }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok || !payload.success || !payload.summary) {
        console.warn(
          "Gemini unavailable. Showing local emergency summary instead.",
          payload?.error || `HTTP ${response.status}`
        );
        setAiSummary(createLocalFallbackSummary());
        return;
      }

      const summary = payload.summary as AISummary;
      const extraSkipped = [...unsupportedDocuments, ...skippedDocumentAccess];

      const finalSummary: AISummary = {
        ...summary,
        documentsSkipped: [
          ...(Array.isArray(summary.documentsSkipped)
            ? summary.documentsSkipped
            : []),
          ...extraSkipped,
        ],
        isFallback: false,
      };

      setAiSummary(finalSummary);
      saveCachedAISummary(finalSummary);
    } catch (err) {
      console.warn(
        "Gemini/document analysis request failed. Showing local emergency summary instead.",
        err
      );
      setAiError("");
      setAiSummary(createLocalFallbackSummary());
    } finally {
      setGeneratingSummary(false);
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
              MediKey is securely preparing the patient's authorized medical
              information.
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
                router.push(`/emergency/${encodeURIComponent(token)}`)
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
                <div className="brand-subtitle">Secure Medical Access</div>
              </div>
            </div>

            <div className="secure-pill">
              <span />
              Private
            </div>
          </header>

          <section className="hero">
            <div className="hero-icon">📋</div>
            <div className="eyebrow">AUTHORIZED MEDICAL RECORDS</div>
            <h1>{patient?.full_name || "Patient"}'s records</h1>
            <p>
              Private medical information associated with this MediKey
              profile.
            </p>
          </section>

          <section className="security-card">
            <div className="security-icon">🔐</div>
            <div>
              <div className="security-title">
                Protected medical information
              </div>
              <div className="security-text">
                These records are private. Access should only be used by
                authorized healthcare personnel for legitimate patient care.
              </div>
            </div>
          </section>

          {error && (
            <div className="error-message">
              <strong>Access notice</strong>
              <span>{error}</span>
            </div>
          )}

          {/* AI EMERGENCY SUMMARY */}
          <section className="ai-card">
            <div className="ai-header">
              <div className="ai-heading">
                <div className="ai-icon">✦</div>
                <div>
                  <div className="section-label">AI-ASSISTED CLINICAL VIEW</div>
                  <h2>Emergency Summary</h2>
                </div>
              </div>

              <span className="ai-badge">Gemini</span>
            </div>

            <p className="ai-description">
              Generate a concise emergency summary using the patient's MediKey
              profile and, when available, authorized medical documents such
              as PDFs and uploaded report images.
            </p>

            {!aiSummary && (
              <button
                className="ai-generate-button"
                onClick={() => generateAISummary(false)}
                disabled={generatingSummary}
              >
                {generatingSummary ? (
                  <>
                    <span className="mini-spinner" />
                    Generating summary...
                  </>
                ) : (
                  <>
                    <span>✦</span>
                    Generate AI Emergency Summary
                  </>
                )}
              </button>
            )}

            {aiError && (
              <div className="ai-error">
                <strong>Summary unavailable</strong>
                <span>{aiError}</span>
              </div>
            )}

            {aiSummary && (
              <div className="ai-result">
                <div className="ai-result-head">
                  <div>
                    <div className="ai-result-label">
                      {aiSummary.isFallback
                        ? "EMERGENCY PROFILE OVERVIEW"
                        : "AI-GENERATED OVERVIEW"}
                    </div>
                    <h3>{aiSummary.headline}</h3>
                  </div>

                  <button
                    className="ai-regenerate"
                    onClick={() => generateAISummary(true)}
                    disabled={generatingSummary}
                  >
                    {generatingSummary ? "Updating..." : "Regenerate"}
                  </button>
                </div>

                <p className="ai-summary-text">{aiSummary.summary}</p>

                {(aiSummary.documentFindings?.length ||
                  aiSummary.documentsProcessed) ? (
                  <div className="ai-documents">
                    <div className="ai-documents-head">
                      <div>
                        <div className="ai-list-title">
                          <span className="ai-list-dot">📄</span>
                          Document findings
                        </div>
                        <div className="ai-documents-subtitle">
                          {aiSummary.documentsProcessed || 0} authorized
                          document
                          {(aiSummary.documentsProcessed || 0) === 1
                            ? ""
                            : "s"}{" "}
                          analyzed
                        </div>
                      </div>
                    </div>

                    {aiSummary.documentFindings?.length ? (
                      <ul className="ai-document-list">
                        {aiSummary.documentFindings.map((item, index) => (
                          <li key={`document-finding-${index}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="ai-empty">
                        No specific findings were extracted from the documents.
                      </div>
                    )}
                  </div>
                ) : null}

                {aiSummary.documentsSkipped?.length ? (
                  <div className="ai-documents-warning">
                    <span>ⓘ</span>
                    <div>
                      <strong>Some documents were not analyzed</strong>
                      <ul>
                        {aiSummary.documentsSkipped.map((item, index) => (
                          <li key={`document-skip-${index}`}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : null}

                <div className="ai-grid">
                  <div className="ai-list-card critical">
                    <div className="ai-list-title">
                      <span className="ai-list-dot">!</span>
                      Critical alerts
                    </div>
                    {aiSummary.criticalAlerts.length ? (
                      <ul>
                        {aiSummary.criticalAlerts.map((item, index) => (
                          <li key={`alert-${index}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="ai-empty">No documented alerts.</div>
                    )}
                  </div>

                  <div className="ai-list-card">
                    <div className="ai-list-title">
                      <span className="ai-list-dot">+</span>
                      Medications
                    </div>
                    {aiSummary.medications.length ? (
                      <ul>
                        {aiSummary.medications.map((item, index) => (
                          <li key={`med-${index}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="ai-empty">
                        No medications documented.
                      </div>
                    )}
                  </div>

                  <div className="ai-list-card">
                    <div className="ai-list-title">
                      <span className="ai-list-dot">•</span>
                      Conditions
                    </div>
                    {aiSummary.conditions.length ? (
                      <ul>
                        {aiSummary.conditions.map((item, index) => (
                          <li key={`condition-${index}`}>{item}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="ai-empty">
                        No conditions documented.
                      </div>
                    )}
                  </div>
                </div>

                <div className="ai-safety">
                  <span>ⓘ</span>
                  <div>
                    <strong>Verification required</strong>
                    <p>{aiSummary.verificationNote}</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* RECORDS */}
          <section className="records-card">
            <div className="records-header">
              <div>
                <div className="section-label">MEDICAL DOCUMENTS</div>
                <h2>
                  {records.length}{" "}
                  {records.length === 1 ? "record" : "records"}
                </h2>
              </div>
            </div>

            {records.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📄</div>
                <h3>No medical records</h3>
                <p>
                  No medical documents have been uploaded for this patient
                  yet.
                </p>
              </div>
            ) : (
              <div className="record-list">
                {records.map((record) => (
                  <article className="record-item" key={record.id}>
                    <div className="record-icon">📄</div>

                    <div className="record-info">
                      <h3>{record.title || "Medical Record"}</h3>
                      <div className="record-meta">
                        <span>
                          {record.record_type || "Medical document"}
                        </span>

                        {record.record_date && (
                          <>
                            <span>•</span>
                            <span>{formatDate(record.record_date)}</span>
                          </>
                        )}
                      </div>
                    </div>

                    <button
                      className="open-button"
                      disabled={opening === record.id}
                      onClick={() => openRecord(record)}
                    >
                      {opening === record.id ? "Opening..." : "Open"}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* INSURANCE / HIGHLY SENSITIVE DATA */}
          <section className="insurance-card">
            <div className="insurance-header">
              <div className="insurance-heading">
                <div className="insurance-icon">🛡</div>
                <div>
                  <div className="section-label">HIGHLY SENSITIVE DATA</div>
                  <h2>Insurance & protected information</h2>
                </div>
              </div>

              <div className="insurance-private-pill">
                {getSensitiveStatusLabel()}
              </div>
            </div>

            {!hasActiveSensitiveApproval() ? (
              <div className="sensitive-lock-card">
                <div className="sensitive-lock-icon">🔐</div>
                <div>
                  <h3>Patient approval required</h3>
                  <p>
                    Insurance and other highly sensitive information are not
                    included in normal hospital access. The patient must
                    explicitly approve this request.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="sensitive-approved-banner">
                  <span>✓</span>
                  <div>
                    <strong>Highly sensitive access is active</strong>
                    <p>
                      Authorized until{" "}
                      {formatSensitiveExpiry(sensitiveRequest?.expires_at || null)}.
                    </p>
                  </div>
                </div>

                {insurancePolicies.length === 0 ? (
                  <div className="insurance-empty">
                    <div className="insurance-empty-icon">🛡</div>
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

                            <span
                              className={`insurance-status ${status.className}`}
                            >
                              {status.label}
                            </span>
                          </div>

                          <div className="insurance-grid">
                            <div className="insurance-detail">
                              <span>Policy number</span>
                              <strong>
                                {maskPolicyNumber(policy.policy_number)}
                              </strong>
                            </div>

                            <div className="insurance-detail">
                              <span>Policy holder</span>
                              <strong>
                                {policy.policy_holder_name || "Not specified"}
                              </strong>
                            </div>

                            <div className="insurance-detail">
                              <span>Coverage</span>
                              <strong>
                                {formatCoverage(policy.coverage_amount)}
                              </strong>
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
              </>
            )}

            <div className="insurance-notice">
              <span>🔒</span>
              <p>
                Highly sensitive information is separate from normal medical
                records and requires explicit patient approval.
              </p>
            </div>
          </section>

          {/* HIGHLY SENSITIVE ACCESS REQUEST */}
          <section className="sensitive-access-card">
            <div className="sensitive-access-header">
              <div className="sensitive-access-heading">
                <div className="sensitive-access-icon">🔐</div>
                <div>
                  <div className="section-label">PATIENT-CONTROLLED ACCESS</div>
                  <h2>Request Highly Sensitive Access</h2>
                </div>
              </div>

              <span className="sensitive-status-pill">
                {getSensitiveStatusLabel()}
              </span>
            </div>

            <p className="sensitive-access-description">
              This is a separate permission layer for information that should
              not be available through ordinary hospital verification.
            </p>

            {sensitiveLoading ? (
              <div className="sensitive-loading">
                Checking access authorization...
              </div>
            ) : hasActiveSensitiveApproval() ? (
              <div className="sensitive-active">
                <div className="sensitive-active-icon">✓</div>
                <div>
                  <strong>Access approved by the patient</strong>
                  <p>
                    Highly sensitive access is currently active and will expire
                    at{" "}
                    {formatSensitiveExpiry(
                      sensitiveRequest?.expires_at || null
                    )}
                    .
                  </p>
                </div>
              </div>
            ) : sensitiveRequest?.status === "pending" ? (
              <div className="sensitive-pending">
                <div className="sensitive-pending-icon">⌛</div>
                <div>
                  <strong>Waiting for patient approval</strong>
                  <p>
                    The request has been sent to the patient. Nothing in the
                    highly sensitive section will be unlocked until approval.
                  </p>
                </div>
              </div>
            ) : (
              <>
                <div className="sensitive-scope">
                  <div>
                    <span>Requested access</span>
                    <strong>Highly sensitive information</strong>
                  </div>
                  <div>
                    <span>Additional protected data</span>
                    <strong>Insurance</strong>
                  </div>
                </div>

                <label className="sensitive-reason-label">
                  Reason for access
                  <textarea
                    value={sensitiveReason}
                    onChange={(event) => setSensitiveReason(event.target.value)}
                    placeholder="Explain why this sensitive information is needed for the patient's care."
                    rows={4}
                    disabled={sensitiveSubmitting}
                  />
                </label>

                <button
                  className="sensitive-request-button"
                  onClick={requestSensitiveAccess}
                  disabled={sensitiveSubmitting || !grantId}
                >
                  {sensitiveSubmitting
                    ? "Sending request..."
                    : "Request Patient Approval"}
                </button>
              </>
            )}

            {sensitiveMessage && (
              <div className="sensitive-message">
                {sensitiveMessage}
              </div>
            )}
          </section>

          <section className="privacy-card">
            <div className="privacy-icon">✓</div>
            <div>
              <div className="privacy-title">MediKey privacy layer</div>
              <div className="privacy-text">
                Emergency information is separate from private medical
                records. Record access should be authorized and auditable.
              </div>
            </div>
          </section>

          <footer>
            <div className="footer-brand">
              <span>+</span>
              MediKey
            </div>
            <div>When you can't speak, MediKey speaks for you.</div>
          </footer>
        </div>
      </main>
    </>
  );
}

function formatDate(date: string | null) {
  if (!date) return "Not specified";

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
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

button {
  font: inherit;
  cursor: pointer;
}

button:disabled {
  cursor: not-allowed;
}

.page {
  min-height: 100vh;
  padding: 22px 16px 45px;
  background:
    radial-gradient(circle at 50% -10%, rgba(230,243,239,.95), transparent 42%),
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
  color: var(--teal);
  font-size: 9px;
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
.insurance-card,
.ai-card,
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

.ai-card {
  margin-top: 15px;
  padding: 21px;
  overflow: hidden;
}

.ai-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.ai-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ai-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 13px;
  background: linear-gradient(135deg, var(--mint), #edf7f4);
  color: var(--teal);
  font-size: 21px;
  font-weight: 900;
}

.ai-header h2 {
  margin: 5px 0 0;
  font-size: 22px;
  letter-spacing: -.025em;
}

.ai-badge {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--ivory);
  color: var(--teal);
  font-size: 10px;
  font-weight: 850;
}

.ai-description {
  margin: 14px 0 15px;
  color: var(--slate);
  font-size: 11px;
  line-height: 1.55;
  max-width: 680px;
}

.ai-generate-button {
  width: 100%;
  min-height: 46px;
  border: 0;
  border-radius: 13px;
  background: var(--teal);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  font-size: 12px;
  font-weight: 850;
  transition: transform .15s ease, opacity .15s ease;
}

.ai-generate-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.ai-generate-button:disabled {
  opacity: .68;
}

.mini-spinner {
  width: 15px;
  height: 15px;
  border: 2px solid rgba(255,255,255,.35);
  border-top-color: white;
  border-radius: 50%;
  animation: spin .7s linear infinite;
}

.ai-error {
  margin-top: 12px;
  padding: 11px 12px;
  border-radius: 12px;
  background: #fff3f4;
  color: var(--crimson);
  font-size: 10px;
}

.ai-error strong,
.ai-error span {
  display: block;
}

.ai-error span {
  margin-top: 3px;
}

.ai-result {
  margin-top: 15px;
  padding-top: 15px;
  border-top: 1px solid var(--border);
}

.ai-result-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 15px;
}

.ai-result-label {
  color: var(--teal);
  font-size: 8px;
  font-weight: 900;
  letter-spacing: .13em;
}

.ai-result h3 {
  margin: 5px 0 0;
  font-size: 18px;
  letter-spacing: -.02em;
}

.ai-regenerate {
  flex: 0 0 auto;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 8px 11px;
  background: white;
  color: var(--teal);
  font-size: 10px;
  font-weight: 850;
}

.ai-regenerate:disabled {
  opacity: .6;
}

.ai-summary-text {
  margin: 12px 0 0;
  color: var(--slate);
  font-size: 12px;
  line-height: 1.65;
}

.ai-documents {
  margin: 16px 0;
  padding: 15px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: #fbfdfc;
}

.ai-documents-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.ai-documents-subtitle {
  margin-top: 5px;
  color: var(--slate);
  font-size: 10px;
}

.ai-document-list {
  margin: 12px 0 0;
  padding-left: 18px;
  color: var(--charcoal);
  font-size: 12px;
  line-height: 1.6;
}

.ai-document-list li + li {
  margin-top: 6px;
}

.ai-documents-warning {
  display: flex;
  gap: 10px;
  margin: 12px 0 16px;
  padding: 12px 14px;
  border: 1px solid #eadfc5;
  border-radius: 14px;
  background: #fffaf0;
  color: #6e5a2f;
  font-size: 11px;
  line-height: 1.5;
}

.ai-documents-warning > span {
  flex: 0 0 auto;
}

.ai-documents-warning ul {
  margin: 6px 0 0;
  padding-left: 16px;
}

.ai-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 14px;
}

.ai-list-card {
  min-width: 0;
  padding: 13px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: #fbfdfc;
}

.ai-list-card.critical {
  background: #fffafb;
  border-color: #efdfe2;
}

.ai-list-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 10px;
  font-weight: 850;
}

.ai-list-dot {
  width: 20px;
  height: 20px;
  display: grid;
  place-items: center;
  border-radius: 7px;
  background: var(--mint);
  color: var(--teal);
  font-size: 10px;
  font-weight: 900;
}

.ai-list-card.critical .ai-list-dot {
  background: #fde8eb;
  color: var(--crimson);
}

.ai-list-card ul {
  margin: 9px 0 0;
  padding-left: 16px;
  color: var(--slate);
  font-size: 10px;
  line-height: 1.55;
}

.ai-list-card li + li {
  margin-top: 5px;
}

.ai-empty {
  margin-top: 9px;
  color: var(--slate);
  font-size: 10px;
}

.ai-safety {
  display: flex;
  align-items: flex-start;
  gap: 9px;
  margin-top: 12px;
  padding: 11px 12px;
  border-radius: 12px;
  background: rgba(230,243,239,.65);
  color: var(--slate);
}

.ai-safety > span {
  color: var(--teal);
  font-weight: 900;
}

.ai-safety strong {
  display: block;
  color: var(--charcoal);
  font-size: 10px;
}

.ai-safety p {
  margin: 3px 0 0;
  font-size: 9px;
  line-height: 1.5;
}

.records-card {
  margin-top: 15px;
  padding: 21px;
}

.records-header,
.insurance-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
  margin-bottom: 15px;
}

.records-header h2,
.insurance-header h2 {
  margin: 5px 0 0;
  font-size: 22px;
  letter-spacing: -.025em;
}

.record-list,
.insurance-list {
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

.insurance-card {
  margin-top: 15px;
  padding: 21px;
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

.insurance-private-pill {
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(230,243,239,.65);
  color: var(--teal);
  font-size: 10px;
  font-weight: 850;
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

.sensitive-access-card {
  margin-top: 15px;
  padding: 21px;
  background: white;
  border: 1px solid var(--border);
  border-radius: 20px;
  box-shadow: 0 10px 35px rgba(25,48,47,.055);
}

.sensitive-access-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 15px;
}

.sensitive-access-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sensitive-access-icon {
  width: 42px;
  height: 42px;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: var(--mint);
  font-size: 19px;
}

.sensitive-access-header h2 {
  margin: 5px 0 0;
  font-size: 22px;
  letter-spacing: -.025em;
}

.sensitive-status-pill {
  flex: 0 0 auto;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(230,243,239,.65);
  color: var(--teal);
  font-size: 9px;
  font-weight: 850;
}

.sensitive-access-description {
  margin: 14px 0 15px;
  color: var(--slate);
  font-size: 11px;
  line-height: 1.55;
}

.sensitive-lock-card,
.sensitive-active,
.sensitive-pending {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 15px;
  border-radius: 15px;
  border: 1px solid var(--border);
}

.sensitive-lock-card {
  background: #fbfdfc;
}

.sensitive-active {
  background: var(--mint);
  border-color: #cfe4dd;
}

.sensitive-pending {
  background: #fffaf0;
  border-color: #eadfc5;
}

.sensitive-lock-icon,
.sensitive-active-icon,
.sensitive-pending-icon {
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  border-radius: 11px;
  background: white;
}

.sensitive-active-icon {
  color: var(--teal);
  font-weight: 900;
}

.sensitive-lock-card h3,
.sensitive-active strong,
.sensitive-pending strong {
  display: block;
  margin: 0;
  font-size: 12px;
  font-weight: 850;
}

.sensitive-lock-card p,
.sensitive-active p,
.sensitive-pending p {
  margin: 4px 0 0;
  color: var(--slate);
  font-size: 10px;
  line-height: 1.5;
}

.sensitive-scope {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 13px;
}

.sensitive-scope > div {
  padding: 12px;
  border-radius: 12px;
  background: var(--ivory);
  border: 1px solid var(--border);
}

.sensitive-scope span {
  display: block;
  color: var(--slate);
  font-size: 9px;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: .07em;
}

.sensitive-scope strong {
  display: block;
  margin-top: 4px;
  font-size: 11px;
}

.sensitive-reason-label {
  display: block;
  color: var(--charcoal);
  font-size: 10px;
  font-weight: 850;
}

.sensitive-reason-label textarea {
  display: block;
  width: 100%;
  margin-top: 7px;
  resize: vertical;
  min-height: 88px;
  padding: 11px 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  outline: none;
  background: #fbfdfc;
  color: var(--charcoal);
  font: inherit;
  font-size: 11px;
  line-height: 1.5;
}

.sensitive-reason-label textarea:focus {
  border-color: var(--sage);
  box-shadow: 0 0 0 3px rgba(123,174,157,.14);
}

.sensitive-request-button {
  width: 100%;
  min-height: 46px;
  margin-top: 11px;
  border: 0;
  border-radius: 13px;
  background: var(--teal);
  color: white;
  font-size: 12px;
  font-weight: 850;
}

.sensitive-request-button:hover:not(:disabled) {
  background: var(--teal-dark);
}

.sensitive-request-button:disabled {
  opacity: .55;
}

.sensitive-message {
  margin-top: 11px;
  padding: 11px 12px;
  border-radius: 12px;
  background: rgba(230,243,239,.7);
  color: var(--teal);
  font-size: 10px;
  line-height: 1.5;
}

.sensitive-loading {
  padding: 14px;
  border-radius: 12px;
  background: var(--ivory);
  color: var(--slate);
  font-size: 10px;
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
  to { transform: rotate(360deg); }
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

@media (max-width: 700px) {
  .ai-grid {
    grid-template-columns: 1fr;
  }
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

  .sensitive-access-header {
    align-items: flex-start;
    flex-direction: column;
  }

  .sensitive-status-pill {
    align-self: flex-start;
  }

  .sensitive-scope {
    grid-template-columns: 1fr;
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

  .ai-result-head {
    flex-direction: column;
  }

  .ai-regenerate {
    width: 100%;
  }

  footer {
    flex-direction: column;
    text-align: center;
  }
}
`;