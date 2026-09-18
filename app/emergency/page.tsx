"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type EmergencyData = {
  member_id: string;
  full_name: string | null;
  relationship: string | null;
  date_of_birth: string | null;
  photo_url: string | null;

  blood_group: string | null;
  allergies: string | null;
  critical_medications: string | null;
  medical_conditions: string | null;
  emergency_notes: string | null;

  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;

  card_active: boolean;
};

function formatDate(date: string | null) {
  if (!date) return "Not provided";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return date;
  }

  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function cleanValue(value: string | null) {
  if (!value || !value.trim()) {
    return "Not provided";
  }

  return value.trim();
}

function Icon({
  name,
  size = 22,
}: {
  name:
    | "alert"
    | "blood"
    | "allergy"
    | "medicine"
    | "condition"
    | "contact"
    | "phone"
    | "shield"
    | "file"
    | "arrow"
    | "heart";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "alert") {
    return (
      <svg {...common}>
        <path d="M12 3 2.8 19a1.5 1.5 0 0 0 1.3 2.25h15.8A1.5 1.5 0 0 0 21.2 19L12 3Z" />
        <path d="M12 9v4" />
        <circle cx="12" cy="16.5" r=".7" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (name === "blood") {
    return (
      <svg {...common}>
        <path d="M12 3.5s6 6.2 6 10.7a6 6 0 1 1-12 0C6 9.7 12 3.5 12 3.5Z" />
        <path d="M9.5 14.5h5" />
        <path d="M12 12v5" />
      </svg>
    );
  }

  if (name === "allergy") {
    return (
      <svg {...common}>
        <path d="M8.5 4.5 6 7l2 2-2 2 2 2-2 2 2.5 2.5" />
        <path d="M15.5 4.5 18 7l-2 2 2 2-2 2 2 2-2.5 2.5" />
        <path d="M12 5v14" />
      </svg>
    );
  }

  if (name === "medicine") {
    return (
      <svg {...common}>
        <rect x="5" y="3.5" width="14" height="17" rx="2" />
        <path d="M9 3.5v3h6v-3" />
        <path d="M8.5 11h7" />
        <path d="M12 7.5v7" />
      </svg>
    );
  }

  if (name === "condition") {
    return (
      <svg {...common}>
        <path d="M4 12h3l1.5-4 3 8 1.8-4H20" />
      </svg>
    );
  }

  if (name === "contact") {
    return (
      <svg {...common}>
        <circle cx="12" cy="8" r="3" />
        <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
      </svg>
    );
  }

  if (name === "phone") {
    return (
      <svg {...common}>
        <path d="M6.5 3.8 9 3l2 4.5-2 1.3a13.2 13.2 0 0 0 6.2 6.2l1.3-2L21 15l-.8 2.5c-.4 1.2-1.7 1.8-2.9 1.4A17 17 0 0 1 5.1 6.7C4.7 5.5 5.3 4.2 6.5 3.8Z" />
      </svg>
    );
  }

  if (name === "shield") {
    return (
      <svg {...common}>
        <path d="M12 3 20 6v5.5c0 4.7-3.2 7.8-8 9.5-4.8-1.7-8-4.8-8-9.5V6l8-3Z" />
        <path d="m9 12 2 2 4-4" />
      </svg>
    );
  }

  if (name === "file") {
    return (
      <svg {...common}>
        <path d="M6 3.5h8l4 4V20.5H6z" />
        <path d="M14 3.5v4h4" />
        <path d="M9 12h6" />
        <path d="M9 15.5h6" />
      </svg>
    );
  }

  if (name === "arrow") {
    return (
      <svg {...common}>
        <path d="M5 12h13" />
        <path d="m13 7 5 5-5 5" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M20.8 8.7c0 5.3-8.8 10-8.8 10s-8.8-4.7-8.8-10A4.7 4.7 0 0 1 12 6a4.7 4.7 0 0 1 8.8 2.7Z" />
    </svg>
  );
}

function InfoRow({
  icon,
  label,
  value,
  danger = false,
}: {
  icon:
    | "blood"
    | "allergy"
    | "medicine"
    | "condition"
    | "contact";
  label: string;
  value: string | null;
  danger?: boolean;
}) {
  const hasValue = Boolean(value?.trim());

  return (
    <div
      className={`info-row ${danger && hasValue ? "danger-row" : ""}`}
    >
      <div className="info-icon">
        <Icon name={icon} size={20} />
      </div>

      <div className="info-content">
        <div className="info-label">{label}</div>
        <div className="info-value">
          {hasValue ? value : "Not provided"}
        </div>
      </div>
    </div>
  );
}

export default function EmergencyQRPage() {
  const params = useParams();
  const router = useRouter();

  const token =
    typeof params?.token === "string"
      ? params.token
      : Array.isArray(params?.token)
        ? params.token[0]
        : "";

  const [data, setData] = useState<EmergencyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadEmergencyData() {
      if (!token) {
        if (mounted) {
          setError("This MediKey QR code is invalid.");
          setLoading(false);
        }
        return;
      }

      try {
        setLoading(true);
        setError("");

        const { data: result, error: rpcError } = await supabase.rpc(
          "get_public_medikey_emergency",
          {
            p_token: token,
          }
        );

        if (rpcError) {
          console.error("MediKey QR error:", {
            message: rpcError.message,
            details: rpcError.details,
            hint: rpcError.hint,
            code: rpcError.code,
          });

          throw rpcError;
        }

        const profile = Array.isArray(result) ? result[0] : result;

        if (!profile) {
          if (mounted) {
            setData(null);
            setError(
              "This MediKey card is invalid, inactive, or no longer available."
            );
          }
          return;
        }

        if (mounted) {
          setData(profile as EmergencyData);
        }
      } catch (err) {
        console.error("Emergency QR failed:", err);

        if (mounted) {
          setError(
            "We couldn't load this emergency profile. Please try scanning the QR again."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadEmergencyData();

    return () => {
      mounted = false;
    };
  }, [token]);

  if (loading) {
    return (
      <>
        <style jsx global>{styles}</style>

        <main className="page loading-page">
          <div className="loading-card">
            <div className="brand-mark">
              <span>+</span>
            </div>

            <div className="spinner" />

            <h1>Loading emergency information</h1>
            <p>
              MediKey is securely retrieving the emergency profile.
            </p>
          </div>
        </main>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <style jsx global>{styles}</style>

        <main className="page">
          <div className="error-card">
            <div className="error-icon">
              <Icon name="alert" size={30} />
            </div>

            <div className="eyebrow">MEDIKEY</div>

            <h1>Emergency profile unavailable</h1>

            <p>
              {error ||
                "This MediKey QR code could not be verified."}
            </p>

            <button
              className="primary-button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </div>
        </main>
      </>
    );
  }

  const emergencyContactAvailable =
    Boolean(data.emergency_contact_name?.trim()) ||
    Boolean(data.emergency_contact_phone?.trim());

  return (
    <>
      <style jsx global>{styles}</style>

      <main className="page">
        <div className="shell">

          {/* HEADER */}
          <header className="header">
            <div className="brand">
              <div className="brand-mark">
                <span>+</span>
              </div>

              <div>
                <div className="brand-name">MediKey</div>
                <div className="brand-subtitle">
                  Emergency Health Identity
                </div>
              </div>
            </div>

            <div className="verified-pill">
              <span className="verified-dot" />
              Active MediKey
            </div>
          </header>

          {/* EMERGENCY BANNER */}
          <section className="emergency-banner">
            <div className="emergency-symbol">
              <Icon name="alert" size={25} />
            </div>

            <div>
              <div className="emergency-title">
                Emergency information
              </div>

              <div className="emergency-subtitle">
                For emergency responders and healthcare professionals
              </div>
            </div>
          </section>

          {/* PROFILE */}
          <section className="profile-card">
            <div className="profile-left">
              {data.photo_url ? (
                <img
                  src={data.photo_url}
                  alt={data.full_name || "MediKey profile"}
                  className="profile-photo"
                />
              ) : (
                <div className="profile-placeholder">
                  {data.full_name?.charAt(0)?.toUpperCase() || "M"}
                </div>
              )}

              <div className="profile-details">
                <div className="profile-label">
                  MEDIKEY PROFILE
                </div>

                <h1>{data.full_name || "Name not provided"}</h1>

                <div className="profile-meta">
                  {data.relationship && (
                    <span>{data.relationship}</span>
                  )}

                  {data.date_of_birth && (
                    <>
                      <span className="meta-dot">•</span>
                      <span>
                        DOB {formatDate(data.date_of_birth)}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="blood-badge">
              <div className="blood-badge-label">
                BLOOD GROUP
              </div>

              <div className="blood-badge-value">
                {cleanValue(data.blood_group)}
              </div>
            </div>
          </section>

          {/* CRITICAL ALERTS */}
          {(data.allergies ||
            data.critical_medications ||
            data.medical_conditions) && (
            <section className="critical-section">
              <div className="section-heading">
                <div>
                  <div className="section-eyebrow">
                    PRIORITY INFORMATION
                  </div>

                  <h2>Critical medical alerts</h2>
                </div>
              </div>

              <div className="info-grid">
                <InfoRow
                  icon="allergy"
                  label="Critical allergies"
                  value={data.allergies}
                  danger
                />

                <InfoRow
                  icon="medicine"
                  label="Critical medications"
                  value={data.critical_medications}
                  danger
                />

                <InfoRow
                  icon="condition"
                  label="Major medical conditions"
                  value={data.medical_conditions}
                />
              </div>
            </section>
          )}

          {/* EMERGENCY NOTES */}
          {data.emergency_notes?.trim() && (
            <section className="notes-card">
              <div className="notes-icon">
                <Icon name="heart" size={21} />
              </div>

              <div>
                <div className="notes-label">
                  EMERGENCY NOTES
                </div>

                <p>{data.emergency_notes}</p>
              </div>
            </section>
          )}

          {/* EMERGENCY CONTACT */}
          {emergencyContactAvailable && (
            <section className="contact-card">
              <div className="contact-icon">
                <Icon name="contact" size={22} />
              </div>

              <div className="contact-content">
                <div className="contact-label">
                  EMERGENCY CONTACT
                </div>

                <div className="contact-name">
                  {cleanValue(data.emergency_contact_name)}
                </div>

                {data.emergency_contact_phone && (
                  <a
                    href={`tel:${data.emergency_contact_phone}`}
                    className="contact-phone"
                  >
                    <Icon name="phone" size={17} />
                    {data.emergency_contact_phone}
                  </a>
                )}
              </div>

              {data.emergency_contact_phone && (
                <a
                  href={`tel:${data.emergency_contact_phone}`}
                  className="call-button"
                >
                  Call
                </a>
              )}
            </section>
          )}

          {/* FULL RECORDS */}
          <section className="records-card">
            <div className="records-main">
              <div className="records-icon">
                <Icon name="file" size={22} />
              </div>

              <div>
                <h2>Need more medical information?</h2>

                <p>
                  Authorized hospital staff can verify their
                  hospital and request access to the patient&apos;s
                  private medical records.
                </p>
              </div>
            </div>

            <button
              className="records-button"
              onClick={() =>
                router.push(
                  `/emergency/${encodeURIComponent(token)}/access`
                )
              }
            >
              View Full Medical Records
              <Icon name="arrow" size={18} />
            </button>
          </section>

          {/* PRIVACY */}
          <section className="privacy-card">
            <div className="privacy-icon">
              <Icon name="shield" size={20} />
            </div>

            <div>
              <div className="privacy-title">
                Privacy protected
              </div>

              <div className="privacy-text">
                This QR displays emergency information only.
                Private medical records require verified
                hospital access.
              </div>
            </div>
          </section>

          {/* FOOTER */}
          <footer className="footer">
            <div className="footer-brand">
              <span className="footer-mark">+</span>
              MediKey
            </div>

            <div>
              When you can&apos;t speak, MediKey speaks for you.
            </div>
          </footer>
        </div>
      </main>
    </>
  );
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
  --amber: #C98A28;
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

button,
a {
  font: inherit;
}

.page {
  min-height: 100vh;
  background:
    radial-gradient(
      circle at 50% -10%,
      rgba(230, 243, 239, 0.9),
      transparent 40%
    ),
    var(--ivory);
  padding: 28px 18px 50px;
}

.shell {
  width: min(920px, 100%);
  margin: 0 auto;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 22px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 11px;
}

.brand-mark {
  width: 43px;
  height: 43px;
  border-radius: 13px;
  background: var(--mint);
  color: var(--teal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 27px;
  font-weight: 800;
  box-shadow: inset 0 0 0 1px rgba(23, 107, 103, 0.08);
}

.brand-name {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.brand-subtitle {
  color: var(--slate);
  font-size: 11px;
  margin-top: 2px;
}

.verified-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 11px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: rgba(255,255,255,.78);
  color: var(--teal);
  font-size: 12px;
  font-weight: 700;
}

.verified-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--sage);
}

.emergency-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  background: #fff6f7;
  border: 1px solid #f1d5d9;
  border-radius: 18px;
  padding: 17px 19px;
  margin-bottom: 16px;
}

.emergency-symbol {
  flex: 0 0 auto;
  width: 45px;
  height: 45px;
  border-radius: 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--crimson);
  background: #fde6e9;
}

.emergency-title {
  font-size: 15px;
  font-weight: 800;
  color: #8e2834;
}

.emergency-subtitle {
  margin-top: 3px;
  color: #8c656a;
  font-size: 12px;
}

.profile-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 22px;
  padding: 22px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  box-shadow: 0 8px 30px rgba(25,48,47,.055);
}

.profile-left {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 17px;
}

.profile-photo,
.profile-placeholder {
  width: 82px;
  height: 82px;
  border-radius: 20px;
  flex: 0 0 auto;
}

.profile-photo {
  object-fit: cover;
}

.profile-placeholder {
  background: var(--mint);
  color: var(--teal);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30px;
  font-weight: 800;
}

.profile-label,
.section-eyebrow,
.notes-label,
.contact-label {
  color: var(--sage);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: .12em;
}

.profile-details h1 {
  margin: 5px 0 6px;
  font-size: clamp(25px, 5vw, 34px);
  line-height: 1.05;
  letter-spacing: -.035em;
}

.profile-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  color: var(--slate);
  font-size: 13px;
}

.meta-dot {
  color: var(--sage);
}

.blood-badge {
  min-width: 112px;
  border-radius: 17px;
  background: var(--mint);
  padding: 14px 15px;
  text-align: center;
}

.blood-badge-label {
  color: var(--teal);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .1em;
}

.blood-badge-value {
  margin-top: 4px;
  color: var(--teal-dark);
  font-size: 23px;
  font-weight: 900;
}

.critical-section {
  margin-top: 22px;
}

.section-heading {
  display: flex;
  justify-content: space-between;
  align-items: end;
  margin-bottom: 11px;
}

.section-heading h2 {
  margin: 5px 0 0;
  font-size: 19px;
  letter-spacing: -.02em;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 11px;
}

.info-row {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 17px;
  padding: 17px;
  min-height: 126px;
}

.info-icon {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: var(--mint);
  color: var(--teal);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 14px;
}

.danger-row .info-icon {
  color: var(--crimson);
  background: #fde9eb;
}

.info-label {
  color: var(--slate);
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 5px;
}

.info-value {
  color: var(--charcoal);
  font-size: 14px;
  line-height: 1.45;
  font-weight: 600;
  white-space: pre-line;
}

.notes-card {
  display: flex;
  gap: 13px;
  margin-top: 13px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 17px;
  padding: 18px;
}

.notes-icon {
  width: 39px;
  height: 39px;
  flex: 0 0 auto;
  border-radius: 11px;
  background: var(--mint);
  color: var(--teal);
  display: flex;
  align-items: center;
  justify-content: center;
}

.notes-card p {
  margin: 5px 0 0;
  color: var(--charcoal);
  line-height: 1.55;
  font-size: 14px;
}

.contact-card {
  margin-top: 13px;
  display: flex;
  align-items: center;
  gap: 13px;
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 17px;
  padding: 17px;
}

.contact-icon {
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  border-radius: 12px;
  background: var(--mint);
  color: var(--teal);
  display: flex;
  align-items: center;
  justify-content: center;
}

.contact-content {
  min-width: 0;
  flex: 1;
}

.contact-name {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 800;
}

.contact-phone {
  margin-top: 5px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  color: var(--teal);
  text-decoration: none;
  font-size: 13px;
  font-weight: 700;
}

.call-button {
  background: var(--teal);
  color: white;
  text-decoration: none;
  padding: 9px 15px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 800;
}

.records-card {
  margin-top: 22px;
  padding: 20px;
  border-radius: 20px;
  background: var(--teal);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  box-shadow: 0 12px 30px rgba(23,107,103,.18);
}

.records-main {
  display: flex;
  align-items: flex-start;
  gap: 13px;
}

.records-icon {
  width: 43px;
  height: 43px;
  flex: 0 0 auto;
  border-radius: 12px;
  background: rgba(255,255,255,.13);
  display: flex;
  align-items: center;
  justify-content: center;
}

.records-card h2 {
  margin: 0;
  font-size: 16px;
}

.records-card p {
  margin: 5px 0 0;
  max-width: 570px;
  color: rgba(255,255,255,.76);
  line-height: 1.45;
  font-size: 12px;
}

.records-button {
  flex: 0 0 auto;
  border: 0;
  background: white;
  color: var(--teal-dark);
  border-radius: 12px;
  padding: 12px 15px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 800;
}

.records-button:hover {
  transform: translateY(-1px);
}

.privacy-card {
  display: flex;
  align-items: center;
  gap: 11px;
  margin-top: 13px;
  padding: 14px 16px;
  background: rgba(230,243,239,.58);
  border: 1px solid var(--border);
  border-radius: 15px;
}

.privacy-icon {
  width: 37px;
  height: 37px;
  border-radius: 10px;
  color: var(--teal);
  background: var(--white);
  display: flex;
  align-items: center;
  justify-content: center;
}

.privacy-title {
  font-size: 12px;
  font-weight: 800;
}

.privacy-text {
  margin-top: 2px;
  color: var(--slate);
  font-size: 11px;
  line-height: 1.4;
}

.footer {
  display: flex;
  justify-content: space-between;
  gap: 15px;
  padding: 22px 3px 0;
  color: var(--slate);
  font-size: 10px;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 5px;
  font-weight: 800;
  color: var(--teal);
}

.footer-mark {
  font-size: 16px;
}

.loading-page,
.error-card {
  min-height: calc(100vh - 78px);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-card,
.error-card {
  width: min(500px, 100%);
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 22px;
  padding: 36px;
  text-align: center;
  box-shadow: 0 10px 35px rgba(25,48,47,.06);
}

.loading-card .brand-mark {
  margin: 0 auto 22px;
}

.loading-card h1,
.error-card h1 {
  margin: 18px 0 8px;
  font-size: 23px;
  letter-spacing: -.025em;
}

.loading-card p,
.error-card p {
  color: var(--slate);
  line-height: 1.5;
  font-size: 13px;
}

.spinner {
  width: 26px;
  height: 26px;
  margin: 0 auto;
  border: 3px solid var(--mint);
  border-top-color: var(--teal);
  border-radius: 50%;
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
  margin: 0 auto;
  border-radius: 17px;
  background: #fde8eb;
  color: var(--crimson);
  display: flex;
  align-items: center;
  justify-content: center;
}

.eyebrow {
  margin-top: 18px;
  color: var(--teal);
  font-size: 10px;
  font-weight: 900;
  letter-spacing: .14em;
}

.primary-button {
  margin-top: 15px;
  border: 0;
  background: var(--teal);
  color: white;
  border-radius: 11px;
  padding: 12px 17px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 800;
}

@media (max-width: 720px) {
  .page {
    padding: 15px 12px 35px;
  }

  .header {
    margin-bottom: 15px;
  }

  .brand-mark {
    width: 39px;
    height: 39px;
    border-radius: 11px;
  }

  .brand-subtitle {
    display: none;
  }

  .verified-pill {
    font-size: 10px;
    padding: 7px 9px;
  }

  .emergency-banner {
    padding: 14px;
  }

  .emergency-symbol {
    width: 40px;
    height: 40px;
  }

  .emergency-title {
    font-size: 13px;
  }

  .emergency-subtitle {
    font-size: 10px;
  }

  .profile-card {
    align-items: flex-start;
    flex-direction: column;
    padding: 18px;
  }

  .profile-left {
    width: 100%;
  }

  .profile-photo,
  .profile-placeholder {
    width: 66px;
    height: 66px;
    border-radius: 16px;
  }

  .profile-details h1 {
    font-size: 25px;
  }

  .blood-badge {
    width: 100%;
    text-align: left;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .blood-badge-value {
    margin-top: 0;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .info-row {
    min-height: auto;
  }

  .records-card {
    flex-direction: column;
    align-items: stretch;
  }

  .records-button {
    justify-content: center;
    width: 100%;
  }

  .contact-card {
    align-items: flex-start;
  }

  .call-button {
    align-self: center;
  }

  .footer {
    flex-direction: column;
    text-align: center;
  }
}

@media (max-width: 430px) {
  .profile-left {
    align-items: flex-start;
  }

  .profile-meta {
    font-size: 11px;
  }

  .contact-card {
    flex-wrap: wrap;
  }

  .contact-content {
    min-width: calc(100% - 58px);
  }

  .call-button {
    margin-left: 55px;
  }
}
`;