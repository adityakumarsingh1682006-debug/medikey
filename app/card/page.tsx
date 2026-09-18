"use client";

/**
 * app/card/page.tsx
 * MediKey — Emergency Medical ID Card
 *
 * NOTE ON DEPENDENCIES:
 * This file uses `html2canvas` to rasterize the on-screen card (built with
 * plain DOM + inline styles for pixel-perfect, print-safe output) into the
 * PDF/PNG exports so the exported files are guaranteed to match the browser
 * preview exactly. If it isn't already in the project, install it once:
 *
 *   npm install html2canvas
 *
 * Everything else (qrcode.react, jspdf, @/src/lib/supabase) matches the
 * existing project as given.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { QRCodeCanvas } from "qrcode.react";
import jsPDF from "jspdf";
import {
  Phone,
  Calendar,
  Lock,
  ScanLine,
  Globe,
  Loader2,
  Download,
  Printer,
  Copy,
  Check,
  ChevronDown,
  ImageOff,
  AlertTriangle,
  RefreshCcw,
} from "lucide-react";

/* ============================================================================
   TYPES
   ========================================================================= */

interface FamilyMember {
  id: string;
  full_name: string;
  relationship: string;
  date_of_birth: string;
  photo_url: string | null;
}

interface EmergencyProfile {
  blood_group: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
}

interface MedikeyCard {
  id: string;
  qr_token: string;
  is_active: boolean;
}

interface ExportBundle {
  member: FamilyMember;
  profile: EmergencyProfile | null;
  card: MedikeyCard;
}

/* ============================================================================
   CONSTANTS
   ========================================================================= */

const COLORS = {
  deepTeal: "#176B67",
  darkTeal: "#083E3B",
  darkCharcoal: "#162B2A",
  red: "#C93C4B",
  ivory: "#F8FBFA",
  mint: "#E6F3F0",
  white: "#FFFFFF",
};

// CR80 card: 85.6mm x 53.98mm, rendered at ~300dpi for print-quality export.
const CARD_MM_W = 85.6;
const CARD_MM_H = 53.98;
const CARD_W = 1013;
const CARD_H = 638;

// CR80 cards ship with a ~3.18mm corner radius — this mirrors that at our
// render resolution instead of the oversized "app card" radius.
const CARD_RADIUS = 20;
const CARD_SHADOW = "0 10px 28px rgba(8,62,59,0.16)";

const FONT_STACK =
  "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

/* ============================================================================
   HELPERS
   ========================================================================= */

function formatDOB(dob: string | null | undefined): string {
  if (!dob) return "—";
  const d = new Date(dob);
  if (isNaN(d.getTime())) return dob;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getQrDestinationUrl(token: string): string {
  if (typeof window === "undefined") return `/emergency/${token}`;
  return `${window.location.origin}/emergency/${token}`;
}

async function convertImageToDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/** Reads a rendered QR <canvas> node and returns a PNG data URL. */
function convertQrCanvasToDataUrl(container: HTMLElement | null): string | null {
  if (!container) return null;
  const canvas = container.querySelector("canvas");
  if (!canvas) return null;
  try {
    return (canvas as HTMLCanvasElement).toDataURL("image/png", 1.0);
  } catch {
    return null;
  }
}

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/* ============================================================================
   LOGO / ICONOGRAPHY
   ========================================================================= */

function MediKeyLogo({ size = 60 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <defs>
        <linearGradient id="mkShieldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#1E9089" />
          <stop offset="100%" stopColor="#083E3B" />
        </linearGradient>
      </defs>
      <path
        d="M50 4 L90 18 V46 C90 72 72 90 50 98 C28 90 10 72 10 46 V18 Z"
        fill="url(#mkShieldGrad)"
      />
      <path
        d="M50 12 L82 24 V46 C82 68 67 83 50 90 C33 83 18 68 18 46 V24 Z"
        fill="none"
        stroke="#6FD0C6"
        strokeWidth="2"
        opacity="0.55"
      />
      {/* medical cross */}
      <rect x="42" y="24" width="16" height="34" rx="3" fill="#FFFFFF" />
      <rect x="28" y="34" width="44" height="16" rx="3" fill="#FFFFFF" />
      {/* subtle key detail merging out of the cross base */}
      <circle
        cx="50"
        cy="70"
        r="7.5"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="3.2"
        opacity="0.95"
      />
      <rect x="47.2" y="76.3" width="5.6" height="9" fill="#FFFFFF" opacity="0.95" />
      <rect x="52.8" y="79.6" width="4.6" height="2.8" fill="#FFFFFF" opacity="0.95" />
      <rect x="52.8" y="84" width="4.6" height="2.8" fill="#FFFFFF" opacity="0.95" />
    </svg>
  );
}

function MediKeyWordmark({ dark = false, size = 30 }: { dark?: boolean; size?: number }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "baseline",
        fontFamily: FONT_STACK,
        fontWeight: 800,
        lineHeight: 1,
      }}
    >
      <span
        style={{
          color: dark ? "#FFFFFF" : "#12302E",
          fontSize: size,
          letterSpacing: "-0.5px",
        }}
      >
        Medi
      </span>
      <span style={{ color: "#2BA79D", fontSize: size, letterSpacing: "-0.5px" }}>
        Key
      </span>
    </div>
  );
}

function MediKeyTagline({ dark = false }: { dark?: boolean }) {
  return (
    <div
      style={{
        fontFamily: FONT_STACK,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: "1.4px",
        color: dark ? "rgba(255,255,255,0.85)" : "#3F6461",
        marginTop: 3,
      }}
    >
      YOUR HEALTH. ALWAYS ACCESSIBLE.
    </div>
  );
}

function EcgLine({ width = 120, height = 36 }: { width?: number; height?: number }) {
  return (
    <svg width={width} height={height} viewBox="0 0 140 40" fill="none">
      <polyline
        points="0,20 28,20 36,20 43,4 50,36 57,20 66,20 74,10 80,30 86,20 140,20"
        stroke={COLORS.red}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BloodDropIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={COLORS.red}>
      <path d="M12 2C12 2 5 11.5 5 15.5C5 19.09 8.13 22 12 22C15.87 22 19 19.09 19 15.5C19 11.5 12 2 12 2Z" />
    </svg>
  );
}

/** A faint diagonal hairline texture, standing in for real security printing —
 *  never a scaled-up logo watermark. */
function SecurityTexture({ dark = false }: { dark?: boolean }) {
  const patternId = dark ? "mkTextureDark" : "mkTextureLight";
  const stroke = dark ? "rgba(255,255,255,0.05)" : "rgba(8,62,59,0.045)";
  return (
    <svg
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0 }}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <pattern
          id={patternId}
          width="13"
          height="13"
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
        >
          <line x1="0" y1="0" x2="0" y2="13" stroke={stroke} strokeWidth="1" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${patternId})`} />
    </svg>
  );
}

function StarOfLife({ size = 96, color = "#7FD3C7" }: { size?: number; color?: string }) {
  const bars = [0, 60, 120, 180, 240, 300];
  return (
    <svg width={size} height={size} viewBox="0 0 100 100">
      <g transform="translate(50,50)">
        {bars.map((deg) => (
          <g key={deg} transform={`rotate(${deg})`}>
            <path d="M-11,-46 L11,-46 L11,-17 L-11,-17 Z" fill={color} />
          </g>
        ))}
      </g>
      <circle cx="50" cy="50" r="15" fill="none" stroke={color} strokeWidth="2.4" />
      <path
        d="M50 41 Q56 46 50 51 Q44 56 50 61"
        stroke={color}
        strokeWidth="2.4"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ============================================================================
   CARD FACES
   ========================================================================= */

interface CardFaceProps {
  member: FamilyMember;
  profile: EmergencyProfile | null;
  card: MedikeyCard;
  photoSrc: string | null;
}

function CardFront({ member, profile, card, photoSrc }: CardFaceProps) {
  const qrValue = getQrDestinationUrl(card.qr_token);

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        position: "relative",
        overflow: "hidden",
        borderRadius: CARD_RADIUS,
        fontFamily: FONT_STACK,
        background: `linear-gradient(150deg, ${COLORS.ivory} 0%, ${COLORS.mint} 100%)`,
        boxShadow: CARD_SHADOW,
      }}
    >
      <SecurityTexture />
      {/* soft directional sheen — premium matte-laminate feel, not glossy */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 15% -10%, rgba(255,255,255,0.5), transparent 50%), radial-gradient(ellipse at 100% 120%, rgba(8,62,59,0.05), transparent 55%)",
          pointerEvents: "none",
        }}
      />

      {/* header */}
      <div
        style={{
          position: "relative",
          padding: "30px 44px 0 44px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <MediKeyLogo size={72} />
          <div>
            <MediKeyWordmark size={40} />
            <MediKeyTagline />
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 20,
            borderLeft: `2px solid ${COLORS.mint}`,
            paddingLeft: 26,
            height: 64,
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span
              style={{
                color: COLORS.red,
                fontWeight: 800,
                fontSize: 28,
                letterSpacing: "0.3px",
              }}
            >
              EMERGENCY
            </span>
            <span
              style={{
                color: COLORS.darkCharcoal,
                fontWeight: 800,
                fontSize: 28,
                letterSpacing: "0.3px",
              }}
            >
              MEDICAL ID
            </span>
          </div>
          <EcgLine width={130} height={38} />
        </div>
      </div>

      {/* body */}
      <div
        style={{
          position: "relative",
          padding: "20px 44px 0 44px",
          display: "flex",
          alignItems: "center",
          gap: 34,
        }}
      >
        {/* photo */}
        <div
          style={{
            width: 300,
            height: 366,
            borderRadius: 16,
            overflow: "hidden",
            border: "5px solid #FFFFFF",
            boxShadow: "0 10px 26px rgba(8,62,59,0.18)",
            background: "#DCE6E4",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {photoSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoSrc}
              alt={member.full_name}
              crossOrigin="anonymous"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <ImageOff size={64} color="#9FB4B1" />
          )}
        </div>

        {/* holder info */}
        <div style={{ flex: 1, paddingTop: 2 }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: "1.8px",
              color: "#3F6461",
            }}
          >
            CARD HOLDER
          </div>
          <div
            style={{
              fontSize: 40,
              fontWeight: 800,
              color: COLORS.darkCharcoal,
              marginTop: 6,
              lineHeight: 1.1,
            }}
          >
            {member.full_name}
          </div>

          {/* blood-group chip — a clear data point, not a decorative block */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 13,
              marginTop: 24,
              border: "1.5px solid #D7E6E3",
              borderRadius: 13,
              padding: "13px 24px",
            }}
          >
            <BloodDropIcon size={25} />
            <span
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: "1.2px",
                color: "#3F6461",
              }}
            >
              BLOOD GROUP
            </span>
            <span style={{ fontSize: 30, fontWeight: 800, color: COLORS.darkCharcoal }}>
              {profile?.blood_group || "—"}
            </span>
          </div>

          <div
            style={{
              marginTop: 22,
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: COLORS.darkCharcoal,
              fontSize: 19,
              fontWeight: 600,
            }}
          >
            <Calendar size={19} color={COLORS.deepTeal} />
            DOB: {formatDOB(member.date_of_birth)}
          </div>
        </div>

        {/* QR */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div
            style={{
              background: "#FFFFFF",
              padding: 19,
              borderRadius: 18,
              border: "1px solid #E3EEEC",
              boxShadow: "0 8px 22px rgba(8,62,59,0.14)",
            }}
          >
            <QRCodeCanvas
              value={qrValue}
              size={228}
              level="M"
              fgColor={COLORS.darkCharcoal}
              bgColor="#FFFFFF"
            />
          </div>
          <div
            style={{
              textAlign: "center",
              fontSize: 16,
              fontWeight: 700,
              color: COLORS.darkCharcoal,
              lineHeight: 1.42,
              letterSpacing: "0.2px",
            }}
          >
            SCAN FOR EMERGENCY
            <br />
            INFORMATION
          </div>
        </div>
      </div>

      {/* footer */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: COLORS.darkTeal,
          padding: "20px 44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ color: "#FFFFFF", fontSize: 13.5, fontWeight: 700 }}>
          WHEN YOU CAN&apos;T SPEAK, MEDI KEY SPEAKS FOR YOU.
        </div>
        <div style={{ color: "#8FD9CF", fontSize: 12, fontWeight: 700, letterSpacing: "1px" }}>
          SECURE • PRIVATE • LIFE-SAVING
        </div>
      </div>
    </div>
  );
}

function CardBack({ member, profile, card }: CardFaceProps) {
  const hasPhone = !!profile?.emergency_contact_phone;
  const hasContactName = !!profile?.emergency_contact_name;

  return (
    <div
      style={{
        width: CARD_W,
        height: CARD_H,
        position: "relative",
        overflow: "hidden",
        borderRadius: CARD_RADIUS,
        fontFamily: FONT_STACK,
        background: `linear-gradient(155deg, ${COLORS.deepTeal} 0%, ${COLORS.darkTeal} 62%)`,
        boxShadow: CARD_SHADOW,
        color: "#FFFFFF",
      }}
    >
      <SecurityTexture dark />
      {/* soft directional sheen — premium matte-laminate feel, not glossy */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 15% -10%, rgba(255,255,255,0.07), transparent 55%)",
          pointerEvents: "none",
        }}
      />

      {/* header */}
      <div
        style={{
          position: "relative",
          padding: "28px 44px 0 44px",
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <MediKeyLogo size={64} />
          <div>
            <MediKeyWordmark dark size={32} />
            <MediKeyTagline dark />
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 23, fontWeight: 800, letterSpacing: "0.4px" }}>
            EMERGENCY ID CARD
          </div>
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "1.8px",
              color: "#8FD9CF",
              marginTop: 6,
            }}
          >
            SCAN • ACCESS • SAVE LIVES
          </div>
        </div>
      </div>

      {/* body: left content + right rail */}
      <div style={{ position: "relative", display: "flex", padding: "26px 0 0 44px", gap: 30 }}>
        <div style={{ flex: 1, paddingRight: 24, paddingBottom: 82 }}>
          {/* emergency contact row */}
          <div
            style={{
              border: "1.5px solid rgba(255,255,255,0.2)",
              borderRadius: 14,
              padding: "26px 30px",
              display: "flex",
              alignItems: "center",
              gap: 24,
            }}
          >
            <Phone size={30} color="#FFFFFF" />
            <div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: "1px",
                }}
              >
                EMERGENCY CONTACT
              </div>
              <div
                style={{
                  marginTop: 13,
                }}
              >
                {hasPhone && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 12,
                      background: "#FFFFFF",
                      borderRadius: 12,
                      padding: "11px 22px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
                    }}
                  >
                    <Phone size={28} color={COLORS.darkTeal} />
                    <span
                      style={{
                        fontSize: 36,
                        fontWeight: 900,
                        letterSpacing: "0.4px",
                        color: COLORS.darkTeal,
                      }}
                    >
                      {profile?.emergency_contact_phone}
                    </span>
                  </div>
                )}
                {hasContactName && (
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: "#FFFFFF",
                      marginTop: hasPhone ? 14 : 0,
                    }}
                  >
                    {profile?.emergency_contact_name}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* QR security */}
          <div style={{ display: "flex", gap: 16, marginTop: 38 }}>
            <ScanLine size={22} color="#8FD9CF" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 16.5, fontWeight: 800, letterSpacing: "0.7px" }}>
                QR SECURITY &amp; INSTRUCTIONS
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: "rgba(255,255,255,0.85)",
                  marginTop: 7,
                  lineHeight: 1.55,
                  maxWidth: 520,
                }}
              >
                If found, scan the QR code on the front of this card to view
                emergency information. No app is required.
              </div>
            </div>
          </div>

          <div
            style={{
              height: 1,
              background: "rgba(255,255,255,0.18)",
              margin: "28px 0",
            }}
          />

          {/* privacy */}
          <div style={{ display: "flex", gap: 16 }}>
            <Lock size={22} color="#8FD9CF" style={{ marginTop: 2, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 16.5, fontWeight: 800, letterSpacing: "0.7px" }}>
                PRIVACY
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: "rgba(255,255,255,0.85)",
                  marginTop: 7,
                  lineHeight: 1.55,
                  maxWidth: 520,
                }}
              >
                Emergency information is instantly accessible.
                <br />
                Sensitive medical records require authorized access.
              </div>
            </div>
          </div>
        </div>

        {/* right rail */}
        <div
          style={{
            width: 190,
            borderLeft: "1.5px solid rgba(255,255,255,0.18)",
            padding: "10px 30px 0 26px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
          }}
        >
          <StarOfLife size={112} />
          <div
            style={{
              fontSize: 19,
              fontWeight: 800,
              lineHeight: 1.4,
              marginTop: 20,
              letterSpacing: "0.3px",
            }}
          >
            SCAN
            <br />
            HELP
            <br />
            SAVE A LIFE
          </div>
          <div
            style={{
              width: 42,
              height: 2,
              background: "rgba(255,255,255,0.3)",
              margin: "22px 0",
            }}
          />
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "rgba(255,255,255,0.75)",
              lineHeight: 1.55,
              letterSpacing: "0.4px",
            }}
          >
            TOGETHER
            <br />
            FOR A SAFER
            <br />
            TOMORROW
          </div>
        </div>
      </div>

      {/* footer */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "20px 44px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid rgba(255,255,255,0.14)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Globe size={16} color="#8FD9CF" />
          <span style={{ fontSize: 13.5, fontWeight: 700 }}>www.medikey.in</span>
        </div>
        <div style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: "0.6px", color: "#8FD9CF" }}>
          MEDI KEY • EMERGENCY HEALTH IDENTITY
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
   RESPONSIVE STAGE — renders a fixed-size card, scaled to fit its container
   ========================================================================= */

function CardStage({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    function updateScale() {
      if (!containerRef.current) return;
      const w = containerRef.current.offsetWidth;
      setScale(w / CARD_W);
    }
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        maxWidth: 620,
        aspectRatio: `${CARD_W} / ${CARD_H}`,
        margin: "0 auto",
        position: "relative",
      }}
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top left",
          width: CARD_W,
          height: CARD_H,
        }}
      >
        {children}
      </div>
    </div>
  );
}

/* ============================================================================
   MAIN PAGE
   ========================================================================= */

export default function MedikeyCardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [emergencyProfile, setEmergencyProfile] = useState<EmergencyProfile | null>(null);
  const [medikeyCard, setMedikeyCard] = useState<MedikeyCard | null>(null);

  const [side, setSide] = useState<"front" | "back">("front");
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState<"pdf" | "png" | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);

  // Data + assets frozen for export, so PDF/PNG always reflect the latest DB state.
  const [exportData, setExportData] = useState<ExportBundle | null>(null);
  const [exportPhotoUrl, setExportPhotoUrl] = useState<string | null>(null);

  const frontExportRef = useRef<HTMLDivElement>(null);
  const backExportRef = useRef<HTMLDivElement>(null);

  const selectedMember = familyMembers.find((m) => m.id === selectedMemberId) || null;

  /* ---------------- loading ---------------- */

  const loadFamilyMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setError("Please sign in to view your MediKey card.");
        setLoading(false);
        return;
      }

      const { data, error: fmError } = await supabase
        .from("family_members")
        .select("id, full_name, relationship, date_of_birth, photo_url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (fmError) throw fmError;

      const members = (data as FamilyMember[]) || [];
      setFamilyMembers(members);
      if (members.length > 0) {
        setSelectedMemberId((prev) => prev || members[0].id);
      } else {
        setError("No family members found. Add a member to generate a MediKey card.");
      }
    } catch (e: any) {
      setError(e?.message || "Failed to load your MediKey profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCardData = useCallback(async (memberId: string) => {
    try {
      const [profileRes, cardRes] = await Promise.all([
        supabase
          .from("emergency_profiles")
          .select("blood_group, emergency_contact_name, emergency_contact_phone")
          .eq("member_id", memberId)
          .maybeSingle(),
        supabase
          .from("medikey_cards")
          .select("id, qr_token, is_active")
          .eq("member_id", memberId)
          .maybeSingle(),
      ]);

      if (profileRes.error) throw profileRes.error;
      if (cardRes.error) throw cardRes.error;

      setEmergencyProfile((profileRes.data as EmergencyProfile) || null);
      setMedikeyCard((cardRes.data as MedikeyCard) || null);
    } catch (e: any) {
      setError(e?.message || "Failed to load card data for this member.");
    }
  }, []);

  useEffect(() => {
    loadFamilyMembers();
  }, [loadFamilyMembers]);

  useEffect(() => {
    if (selectedMemberId) {
      loadCardData(selectedMemberId);
    }
  }, [selectedMemberId, loadCardData]);

  /* ---------------- actions ---------------- */

  const handleCopyLink = useCallback(async () => {
    if (!medikeyCard) return;
    const url = getQrDestinationUrl(medikeyCard.qr_token);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy the link. Please copy it manually.");
    }
  }, [medikeyCard]);

  const handleToggleActive = useCallback(async () => {
    if (!medikeyCard) return;
    setTogglingActive(true);
    const nextState = !medikeyCard.is_active;
    try {
      const { error: updErr } = await supabase
        .from("medikey_cards")
        .update({ is_active: nextState })
        .eq("id", medikeyCard.id);
      if (updErr) throw updErr;
      setMedikeyCard({ ...medikeyCard, is_active: nextState });
    } catch (e: any) {
      setError(e?.message || "Failed to update card status.");
    } finally {
      setTogglingActive(false);
    }
  }, [medikeyCard]);

  /** Refetches the latest member/profile/card rows right before export. */
  const getFreshExportData = useCallback(async (): Promise<ExportBundle | null> => {
    if (!selectedMemberId) return null;
    try {
      const [memberRes, profileRes, cardRes] = await Promise.all([
        supabase
          .from("family_members")
          .select("id, full_name, relationship, date_of_birth, photo_url")
          .eq("id", selectedMemberId)
          .maybeSingle(),
        supabase
          .from("emergency_profiles")
          .select("blood_group, emergency_contact_name, emergency_contact_phone")
          .eq("member_id", selectedMemberId)
          .maybeSingle(),
        supabase
          .from("medikey_cards")
          .select("id, qr_token, is_active")
          .eq("member_id", selectedMemberId)
          .maybeSingle(),
      ]);

      if (!memberRes.data || !cardRes.data) return null;

      return {
        member: memberRes.data as FamilyMember,
        profile: (profileRes.data as EmergencyProfile) || null,
        card: cardRes.data as MedikeyCard,
      };
    } catch {
      return null;
    }
  }, [selectedMemberId]);

  /** Pulls fresh data + a CORS-safe photo data URL, and waits one paint for the hidden export nodes to update. */
  const prepareExportAssets = useCallback(async (): Promise<ExportBundle | null> => {
    const fresh = await getFreshExportData();
    if (!fresh) return null;

    if (fresh.member.photo_url) {
      const dataUrl = await convertImageToDataUrl(fresh.member.photo_url);
      setExportPhotoUrl(dataUrl);
    } else {
      setExportPhotoUrl(null);
    }

    setExportData(fresh);
    await waitForNextPaint();
    return fresh;
  }, [getFreshExportData]);

  const downloadPDF = useCallback(async () => {
    if (exporting) return;
    setExporting("pdf");
    setError(null);
    try {
      const fresh = await prepareExportAssets();
      if (!fresh || !frontExportRef.current || !backExportRef.current) {
        setError("Card data isn't ready yet. Please try again.");
        return;
      }

      const html2canvas = (await import("html2canvas")).default;

      const frontCanvas = await html2canvas(frontExportRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const backCanvas = await html2canvas(backExportRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: COLORS.darkTeal,
      });

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [CARD_MM_W, CARD_MM_H],
      });

      pdf.addImage(
        frontCanvas.toDataURL("image/png", 1.0),
        "PNG",
        0,
        0,
        CARD_MM_W,
        CARD_MM_H,
        undefined,
        "FAST"
      );
      pdf.addPage([CARD_MM_W, CARD_MM_H], "landscape");
      pdf.addImage(
        backCanvas.toDataURL("image/png", 1.0),
        "PNG",
        0,
        0,
        CARD_MM_W,
        CARD_MM_H,
        undefined,
        "FAST"
      );

      pdf.save(`MediKey-${fresh.member.full_name.replace(/\s+/g, "_")}.pdf`);
    } catch (e: any) {
      console.error(e);
      setError("Failed to generate the PDF. Please try again.");
    } finally {
      setExporting(null);
    }
  }, [exporting, prepareExportAssets]);

  const downloadPNG = useCallback(async () => {
    if (exporting) return;
    setExporting("png");
    setError(null);
    try {
      const fresh = await prepareExportAssets();
      const ref = side === "front" ? frontExportRef : backExportRef;
      if (!fresh || !ref.current) {
        setError("Card data isn't ready yet. Please try again.");
        return;
      }

      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(ref.current, {
        scale: 4,
        useCORS: true,
        backgroundColor: side === "front" ? "#ffffff" : COLORS.darkTeal,
      });

      const link = document.createElement("a");
      link.download = `MediKey-${fresh.member.full_name.replace(/\s+/g, "_")}-${side}.png`;
      link.href = canvas.toDataURL("image/png", 1.0);
      link.click();
    } catch (e: any) {
      console.error(e);
      setError("Failed to generate the PNG. Please try again.");
    } finally {
      setExporting(null);
    }
  }, [exporting, prepareExportAssets, side]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  /* ---------------- derived export bundle for hidden nodes ---------------- */

  const liveBundle: ExportBundle | null =
    selectedMember && medikeyCard
      ? { member: selectedMember, profile: emergencyProfile, card: medikeyCard }
      : null;

  const bundleForExportNodes = exportData || liveBundle;
  const photoForExportNodes = exportPhotoUrl ?? bundleForExportNodes?.member.photo_url ?? null;
  const photoForPreview = selectedMember?.photo_url ?? null;

  /* ============================================================================
     RENDER
     ========================================================================= */

  if (loading) {
    return (
      <div
        style={{ minHeight: "60vh" }}
        className="flex items-center justify-center"
      >
        <div className="flex flex-col items-center gap-3 text-[#3F6461]">
          <Loader2 className="animate-spin" size={30} />
          <span className="text-sm font-medium">Loading your MediKey card…</span>
        </div>
      </div>
    );
  }

  if (error && familyMembers.length === 0) {
    return (
      <div
        style={{ minHeight: "60vh" }}
        className="flex items-center justify-center px-6"
      >
        <div className="flex flex-col items-center gap-3 text-center max-w-md">
          <AlertTriangle size={30} color={COLORS.red} />
          <p className="text-[#162B2A] font-medium">{error}</p>
          <button
            onClick={loadFamilyMembers}
            className="mt-2 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: COLORS.deepTeal }}
          >
            <RefreshCcw size={14} />
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: `linear-gradient(180deg, ${COLORS.mint} 0%, #FFFFFF 40%)` }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* page header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: COLORS.darkCharcoal }}>
              Your MediKey Card
            </h1>
            <p className="text-sm text-[#3F6461] mt-1">
              Physical CR80 emergency ID — preview, print, or export it below.
            </p>
          </div>

          {familyMembers.length > 1 && (
            <div className="relative w-full sm:w-64">
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full appearance-none rounded-xl border border-[#C9DEDA] bg-white px-4 py-2.5 pr-9 text-sm font-medium text-[#162B2A] shadow-sm focus:outline-none focus:ring-2"
                style={{ borderColor: "#C9DEDA" }}
              >
                {familyMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.full_name} ({m.relationship})
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#3F6461]"
              />
            </div>
          )}
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-lg border border-[#F1C6CB] bg-[#FBEEEF] px-4 py-2.5 text-sm text-[#8E2A35]">
            <AlertTriangle size={15} />
            {error}
          </div>
        )}

        {!selectedMember || !medikeyCard ? (
          <div className="rounded-xl border border-[#C9DEDA] bg-white p-8 text-center text-sm text-[#3F6461]">
            No card has been generated for this member yet.
          </div>
        ) : (
          <>
            {/* front/back toggle */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex rounded-full bg-white border border-[#C9DEDA] p-1 shadow-sm">
                {(["front", "back"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setSide(s)}
                    className="px-5 py-1.5 rounded-full text-sm font-semibold transition-colors"
                    style={{
                      background: side === s ? COLORS.deepTeal : "transparent",
                      color: side === s ? "#FFFFFF" : "#3F6461",
                    }}
                  >
                    {s === "front" ? "Front" : "Back"}
                  </button>
                ))}
              </div>
            </div>

            {/* card preview */}
            <div id="medikey-print-area">
              <CardStage>
                {side === "front" ? (
                  <CardFront
                    member={selectedMember}
                    profile={emergencyProfile}
                    card={medikeyCard}
                    photoSrc={photoForPreview}
                  />
                ) : (
                  <CardBack
                    member={selectedMember}
                    profile={emergencyProfile}
                    card={medikeyCard}
                    photoSrc={photoForPreview}
                  />
                )}
              </CardStage>
            </div>

            {/* actions */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={downloadPDF}
                disabled={exporting !== null}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-sm disabled:opacity-60"
                style={{ background: COLORS.deepTeal }}
              >
                {exporting === "pdf" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                Download 2-Sided PDF
              </button>

              <button
                onClick={downloadPNG}
                disabled={exporting !== null}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-60"
                style={{
                  background: "#FFFFFF",
                  color: COLORS.deepTeal,
                  border: `1.5px solid ${COLORS.deepTeal}`,
                }}
              >
                {exporting === "png" ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                Download PNG ({side})
              </button>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm"
                style={{
                  background: "#FFFFFF",
                  color: "#162B2A",
                  border: "1.5px solid #C9DEDA",
                }}
              >
                <Printer size={16} />
                Print Card
              </button>

              <button
                onClick={handleCopyLink}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm"
                style={{
                  background: "#FFFFFF",
                  color: "#162B2A",
                  border: "1.5px solid #C9DEDA",
                }}
              >
                {copied ? <Check size={16} color={COLORS.deepTeal} /> : <Copy size={16} />}
                {copied ? "Link Copied" : "Copy Emergency Link"}
              </button>

              <button
                onClick={handleToggleActive}
                disabled={togglingActive}
                className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold shadow-sm disabled:opacity-60"
                style={{
                  background: medikeyCard.is_active ? "#EAF3F1" : "#FBEEEF",
                  color: medikeyCard.is_active ? COLORS.deepTeal : COLORS.red,
                  border: `1.5px solid ${medikeyCard.is_active ? "#C9DEDA" : "#F1C6CB"}`,
                }}
              >
                {togglingActive ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: medikeyCard.is_active ? COLORS.deepTeal : COLORS.red,
                    }}
                  />
                )}
                {medikeyCard.is_active ? "QR Active — Deactivate" : "QR Inactive — Activate"}
              </button>
            </div>
          </>
        )}
      </div>

      {/* hidden, full-resolution export nodes (always mounted, off-screen) */}
      <div
        aria-hidden
        style={{
          position: "fixed",
          top: -10000,
          left: -10000,
          pointerEvents: "none",
        }}
      >
        {bundleForExportNodes && (
          <>
            <div ref={frontExportRef}>
              <CardFront
                member={bundleForExportNodes.member}
                profile={bundleForExportNodes.profile}
                card={bundleForExportNodes.card}
                photoSrc={photoForExportNodes}
              />
            </div>
            <div ref={backExportRef}>
              <CardBack
                member={bundleForExportNodes.member}
                profile={bundleForExportNodes.profile}
                card={bundleForExportNodes.card}
                photoSrc={photoForExportNodes}
              />
            </div>
          </>
        )}
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #medikey-print-area,
          #medikey-print-area * {
            visibility: visible;
          }
          #medikey-print-area {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}