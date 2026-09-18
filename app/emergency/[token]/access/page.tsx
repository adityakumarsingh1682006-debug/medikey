"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type Hospital = {
  id: string;
  hospital_name: string;
  registration_number: string;
  city: string | null;
  is_active: boolean;
};

type EmergencyPatient = {
  member_id: string;
  full_name: string | null;
};

export default function HospitalAccessPage() {
  const params = useParams();
  const router = useRouter();

  const token =
    typeof params?.token === "string"
      ? params.token
      : Array.isArray(params?.token)
        ? params.token[0]
        : "";

  const [hospitalName, setHospitalName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");

  const [patient, setPatient] = useState<EmergencyPatient | null>(null);
  const [verifiedHospital, setVerifiedHospital] =
    useState<Hospital | null>(null);
  const [grantId, setGrantId] = useState("");

  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    async function loadPatient() {
      if (!token) {
        setError("Invalid MediKey QR token.");
        setLoading(false);
        return;
      }

      try {
        setError("");

        const { data, error: rpcError } = await supabase.rpc(
          "get_public_medikey_emergency",
          {
            p_token: token,
          }
        );

        if (rpcError) {
          throw rpcError;
        }

        const result = Array.isArray(data) ? data[0] : data;

        if (!result?.member_id) {
          setError("This MediKey card is invalid or inactive.");
          return;
        }

        setPatient({
          member_id: result.member_id,
          full_name: result.full_name,
        });
      } catch (err) {
        console.error("Patient lookup failed:", err);

        setError(
          "Unable to verify this MediKey card. Please try again."
        );
      } finally {
        setLoading(false);
      }
    }

    loadPatient();
  }, [token]);

  async function verifyHospital() {
    setError("");
    setSuccess("");
    setVerifiedHospital(null);
    setGrantId("");

    const cleanName = hospitalName.trim();
    const cleanRegistration = registrationNumber.trim();

    if (!cleanName || !cleanRegistration) {
      setError("Enter both the hospital name and registration number.");
      return;
    }

    setVerifying(true);

    try {
      const { data, error: grantError } = await supabase.rpc(
        "create_hospital_access_grant",
        {
          p_token: token,
          p_registration_number: cleanRegistration,
          p_hospital_name: cleanName,
        }
      );

      if (grantError) throw grantError;

      const result = Array.isArray(data) ? data[0] : data;

      if (!result?.grant_id || !result?.hospital_id) {
        setError("Hospital could not be verified for this MediKey card.");
        return;
      }

      const hospital: Hospital = {
        id: result.hospital_id,
        hospital_name: result.hospital_name,
        registration_number: result.registration_number,
        city: result.city ?? null,
        is_active: true,
      };

      setVerifiedHospital(hospital);
      setGrantId(result.grant_id);
      sessionStorage.setItem(`medikey-hospital-grant:${token}`, result.grant_id);

      setSuccess(
        "Hospital verified. Private medical records are authorized for a limited time and every access is logged."
      );
    } catch (err) {
      console.error("Hospital verification failed:", err);
      setError(
        err instanceof Error && err.message
          ? err.message
          : "Hospital verification failed. Check the registration details and try again."
      );
    } finally {
      setVerifying(false);
    }
  }

  function goToRecords() {
    if (!token || !grantId) return;

    router.push(
      `/emergency/${encodeURIComponent(token)}/access/records`
    );
  }

  function goBack() {
    if (!token) {
      router.back();
      return;
    }

    router.push(
      `/emergency/${encodeURIComponent(token)}`
    );
  }

  if (loading) {
    return (
      <>
        <style jsx global>{styles}</style>

        <main className="page">
          <div className="center-card">
            <div className="brand-mark">+</div>

            <div className="spinner" />

            <h1>Verifying MediKey</h1>

            <p>
              Securely checking the emergency QR before
              continuing.
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

            <h1>Access unavailable</h1>

            <p>{error}</p>

            <button
              className="primary-button"
              onClick={goBack}
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
              onClick={goBack}
            >
              ← Back
            </button>

            <div className="brand">
              <div className="brand-mark">+</div>

              <div>
                <div className="brand-name">
                  MediKey
                </div>

                <div className="brand-subtitle">
                  Secure Medical Access
                </div>
              </div>
            </div>

            <div className="secure-pill">
              <span />
              Secure
            </div>

          </header>

          {/* HERO */}
          <section className="hero">

            <div className="hero-icon">
              🏥
            </div>

            <div className="eyebrow">
              HEALTHCARE ACCESS
            </div>

            <h1>
              Verify your hospital
            </h1>

            <p>
              To protect the patient's private medical
              records, MediKey requires healthcare staff to
              verify their hospital before access is granted.
            </p>

          </section>

          {/* PATIENT */}
          {patient && (
            <section className="patient-card">

              <div className="patient-icon">
                ♥
              </div>

              <div>

                <div className="small-label">
                  PATIENT
                </div>

                <div className="patient-name">
                  {patient.full_name || "Patient"}
                </div>

                <div className="patient-note">
                  Emergency profile verified
                </div>

              </div>

            </section>
          )}

          {/* SECURITY NOTICE */}
          <section className="security-card">

            <div className="security-icon">
              🔒
            </div>

            <div>

              <div className="security-title">
                Private medical records
              </div>

              <div className="security-text">
                Emergency information is already available on
                the previous screen. This verification step
                protects sensitive medical records.
              </div>

            </div>

          </section>

          {/* VERIFICATION FORM */}
          {!verifiedHospital && (
            <section className="form-card">

              <div className="section-label">
                HOSPITAL VERIFICATION
              </div>

              <h2>
                Enter hospital details
              </h2>

              <p className="form-description">
                Enter the details registered with MediKey.
              </p>

              <label>
                Hospital Registration Number

                <input
                  value={registrationNumber}
                  onChange={(event) =>
                    setRegistrationNumber(
                      event.target.value
                    )
                  }
                  placeholder="e.g. HOSP-DEMO-001"
                  autoComplete="off"
                />
              </label>

              <label>
                Hospital Name

                <input
                  value={hospitalName}
                  onChange={(event) =>
                    setHospitalName(
                      event.target.value
                    )
                  }
                  placeholder="e.g. City Hospital"
                  autoComplete="organization"
                />
              </label>

              {error && (
                <div className="error-message">

                  <strong>
                    Verification failed
                  </strong>

                  <span>
                    {error}
                  </span>

                </div>
              )}

              <button
                className="verify-button"
                onClick={verifyHospital}
                disabled={verifying}
              >
                {verifying ? (
                  <>
                    <span className="button-spinner" />
                    Verifying hospital...
                  </>
                ) : (
                  <>
                    Verify Hospital
                    <span>→</span>
                  </>
                )}
              </button>

              <div className="demo-hint">

                <strong>
                  Demo hospital
                </strong>

                <br />

                City Hospital · HOSP-DEMO-001

              </div>

            </section>
          )}

          {/* VERIFIED HOSPITAL */}
          {verifiedHospital && (
            <section className="verified-card">

              <div className="verified-icon">
                ✓
              </div>

              <div className="eyebrow">
                VERIFIED HOSPITAL
              </div>

              <h2>
                {verifiedHospital.hospital_name}
              </h2>

              <p>
                {verifiedHospital.city ||
                  "Registered hospital"}
              </p>

              <div className="verified-details">

                <div>

                  <span>
                    Registration number
                  </span>

                  <strong>
                    {verifiedHospital.registration_number}
                  </strong>

                </div>

                <div>

                  <span>
                    Status
                  </span>

                  <strong>
                    Active & verified
                  </strong>

                </div>

              </div>

              {success && (
                <div className="success-message">
                  {success}
                </div>
              )}

              {/* REAL NAVIGATION */}
              <button
                className="records-button"
                onClick={goToRecords}
              >
                Continue to Medical Records
                <span>→</span>
              </button>

              <button
                className="secondary-button"
                onClick={() => {
                  setVerifiedHospital(null);
                  setGrantId("");
                  sessionStorage.removeItem(`medikey-hospital-grant:${token}`);
                  setSuccess("");
                  setError("");
                }}
              >
                Verify another hospital
              </button>

            </section>
          )}

          {/* FOOTER */}
          <footer>

            <div className="footer-brand">
              <span>+</span>
              MediKey
            </div>

            <div>
              Emergency information should be instantly
              accessible. Sensitive information should be
              responsibly accessible.
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
input {
  font: inherit;
}

button {
  cursor: pointer;
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
  width: min(720px, 100%);
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
.section-label,
.small-label {
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

.patient-card,
.security-card,
.form-card,
.verified-card {
  background: var(--white);

  border: 1px solid var(--border);

  border-radius: 20px;

  box-shadow:
    0 10px 35px rgba(25,48,47,.055);
}

.patient-card {
  display: flex;
  align-items: center;
  gap: 13px;

  padding: 17px;

  margin-bottom: 12px;
}

.patient-icon {
  width: 43px;
  height: 43px;

  flex: 0 0 auto;

  display: grid;
  place-items: center;

  border-radius: 13px;

  background: var(--mint);
  color: var(--teal);
}

.patient-name {
  margin-top: 4px;

  font-size: 16px;
  font-weight: 850;
}

.patient-note {
  color: var(--slate);

  font-size: 11px;

  margin-top: 2px;
}

.security-card {
  display: flex;
  gap: 12px;

  padding: 16px;

  margin-bottom: 13px;

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
  color: var(--slate);

  font-size: 11px;

  line-height: 1.5;

  margin-top: 3px;
}

.form-card,
.verified-card {
  padding: 23px;
}

.form-card h2,
.verified-card h2 {
  margin: 6px 0 5px;

  font-size: 22px;

  letter-spacing: -.025em;
}

.form-description,
.verified-card > p {
  margin: 0 0 21px;

  color: var(--slate);

  font-size: 13px;

  line-height: 1.5;
}

label {
  display: block;

  margin-top: 16px;

  color: var(--charcoal);

  font-size: 12px;

  font-weight: 800;
}

input {
  display: block;

  width: 100%;

  margin-top: 7px;

  padding: 13px 14px;

  border: 1px solid var(--border);

  border-radius: 12px;

  outline: none;

  background: #fbfdfc;

  color: var(--charcoal);

  font-size: 13px;
}

input:focus {
  border-color: var(--sage);

  box-shadow:
    0 0 0 3px rgba(123,174,157,.13);
}

.verify-button,
.records-button {
  width: 100%;

  margin-top: 20px;

  border: 0;

  border-radius: 13px;

  padding: 14px 16px;

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 8px;

  background: var(--teal);

  color: white;

  font-size: 13px;

  font-weight: 850;
}

.verify-button:disabled {
  opacity: .7;

  cursor: wait;
}

.error-message {
  margin-top: 15px;

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

.demo-hint {
  margin-top: 14px;

  padding: 11px;

  border-radius: 11px;

  background: var(--mint);

  color: var(--slate);

  font-size: 10px;

  line-height: 1.5;
}

.demo-hint strong {
  color: var(--teal-dark);
}

.verified-card {
  text-align: center;
}

.verified-icon {
  width: 62px;
  height: 62px;

  margin: 0 auto 17px;

  display: grid;
  place-items: center;

  border-radius: 20px;

  background: var(--mint);

  color: var(--teal);

  font-size: 29px;

  font-weight: 900;
}

.verified-card h2 {
  font-size: 24px;
}

.verified-card > p {
  margin-bottom: 18px;
}

.verified-details {
  display: grid;

  grid-template-columns: 1fr 1fr;

  gap: 10px;

  text-align: left;
}

.verified-details div {
  padding: 13px;

  border-radius: 13px;

  background: var(--ivory);

  border: 1px solid var(--border);
}

.verified-details span,
.verified-details strong {
  display: block;
}

.verified-details span {
  color: var(--slate);

  font-size: 10px;
}

.verified-details strong {
  margin-top: 4px;

  font-size: 12px;
}

.success-message {
  margin-top: 15px;

  padding: 12px;

  border-radius: 12px;

  background: var(--mint);

  color: var(--teal-dark);

  font-size: 11px;

  line-height: 1.45;
}

.records-button {
  cursor: pointer;

  transition:
    transform .15s ease,
    box-shadow .15s ease;
}

.records-button:hover {
  transform: translateY(-1px);

  box-shadow:
    0 8px 20px rgba(23,107,103,.18);
}

.secondary-button {
  width: 100%;

  margin-top: 10px;

  border: 1px solid var(--border);

  border-radius: 12px;

  padding: 12px;

  background: white;

  color: var(--slate);

  font-size: 12px;

  font-weight: 750;
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

.spinner,
.button-spinner {
  border-radius: 50%;

  border: 3px solid var(--mint);

  border-top-color: var(--teal);

  animation: spin .8s linear infinite;
}

.spinner {
  width: 27px;
  height: 27px;

  margin: auto;
}

.button-spinner {
  width: 15px;
  height: 15px;

  border-width: 2px;
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

footer {
  display: flex;

  justify-content: space-between;

  gap: 15px;

  padding: 20px 2px 0;

  color: var(--slate);

  font-size: 9px;

  line-height: 1.5;
}

.footer-brand {
  color: var(--teal);

  font-weight: 850;

  white-space: nowrap;
}

.footer-brand span {
  margin-right: 4px;
}

@media (max-width: 560px) {

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

  .verified-details {
    grid-template-columns: 1fr;
  }

  footer {
    flex-direction: column;

    text-align: center;
  }
}
`;