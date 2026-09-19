"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

type Member = {
  id: string;
  full_name: string;
  relationship: string | null;
  date_of_birth: string | null;
  photo_url?: string | null;
};

type EmergencyProfile = {
  id?: string;
  member_id: string;
  blood_group: string;
  allergies: string;
  critical_medications: string;
  medical_conditions: string;
  emergency_notes: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
};

const BLOOD_GROUPS = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
  "Unknown",
];

const MAX_NOTES = 500;
const MAX_TEXT = 300;

const emptyProfile = (memberId: string): EmergencyProfile => ({
  member_id: memberId,
  blood_group: "",
  allergies: "",
  critical_medications: "",
  medical_conditions: "",
  emergency_notes: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
});

function Icon({
  name,
  size = 20,
  strokeWidth = 1.9,
}: {
  name:
    | "arrow"
    | "back"
    | "check"
    | "chevron"
    | "contact"
    | "heart"
    | "info"
    | "lock"
    | "medical"
    | "phone"
    | "save"
    | "shield"
    | "user"
    | "warning";
  size?: number;
  strokeWidth?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  switch (name) {
    case "back":
      return (
        <svg {...common}>
          <path d="M19 12H5" />
          <path d="m12 19-7-7 7-7" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "chevron":
      return (
        <svg {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "contact":
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6" />
          <path d="M22 11h-6" />
        </svg>
      );

    case "heart":
      return (
        <svg {...common}>
          <path d="M20.8 8.6c0 5.1-8.8 10.2-8.8 10.2S3.2 13.7 3.2 8.6A4.6 4.6 0 0 1 12 6.1a4.6 4.6 0 0 1 8.8 2.5Z" />
        </svg>
      );

    case "info":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 10v6" />
          <path d="M12 7h.01" />
        </svg>
      );

    case "lock":
      return (
        <svg {...common}>
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
      );

    case "medical":
      return (
        <svg {...common}>
          <path d="M9 3h6" />
          <path d="M10 3v3h4V3" />
          <rect x="5" y="6" width="14" height="15" rx="3" />
          <path d="M9 13h6" />
          <path d="M12 10v6" />
        </svg>
      );

    case "phone":
      return (
        <svg {...common}>
          <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.7 19.7 0 0 1-8.6-3.1 19.3 19.3 0 0 1-6-6A19.7 19.7 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7A2 2 0 0 1 22 16.9Z" />
        </svg>
      );

    case "save":
      return (
        <svg {...common}>
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
          <path d="M17 21v-8H7v8" />
          <path d="M7 3v5h8" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );

    case "warning":
      return (
        <svg {...common}>
          <path d="M10.3 3.5 2.1 18a2 2 0 0 0 1.7 3h16.4a2 2 0 0 0 1.7-3L13.7 3.5a2 2 0 0 0-3.4 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );

    default:
      return null;
  }
}

function EmergencyProfileContent() {
  const searchParams = useSearchParams();

  const requestedMemberId = searchParams.get("member");

  const [member, setMember] = useState<Member | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [profile, setProfile] = useState<EmergencyProfile | null>(null);

  const [savedProfile, setSavedProfile] =
    useState<EmergencyProfile | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedMemberId]);

  async function loadPage() {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        window.location.href = "/login";
        return;
      }

      // A fresh account may open this page before the dashboard has created
      // its family/member rows. Initialize them here instead of showing a
      // blank/error page.
      let familyId: string | null = null;
      let loadedMembers: Member[] = [];

      const { data: family, error: familyError } = await supabase
        .from("families")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (familyError) {
        throw familyError;
      }

      familyId = family?.id ?? null;

      if (familyId) {
        const { data: memberData, error: memberError } = await supabase
          .from("family_members")
          .select(
            "id, full_name, relationship, date_of_birth, photo_url"
          )
          .eq("family_id", familyId)
          .order("created_at", { ascending: true });

        if (memberError) {
          throw memberError;
        }

        loadedMembers = (memberData || []) as Member[];
      }

      // If this is a brand-new account (or initialization was incomplete),
      // create the family and Self member safely.
      if (loadedMembers.length === 0) {
        const fullName =
          (user.user_metadata?.full_name as string | undefined)?.trim() ||
          user.email?.split("@")[0] ||
          "Medi Key User";

        if (!familyId) {
          const { data: createdFamily, error: createFamilyError } =
            await supabase
              .from("families")
              .insert({
                name: `${fullName}'s Family`,
                owner_id: user.id,
              })
              .select("id")
              .single();

          if (createFamilyError) {
            throw createFamilyError;
          }

          familyId = createdFamily.id;
        }

        // Prefer an existing Self/member row before inserting another one.
        const { data: existingMember, error: existingMemberError } =
          await supabase
            .from("family_members")
            .select(
              "id, full_name, relationship, date_of_birth, photo_url"
            )
            .eq("family_id", familyId)
            .eq("user_id", user.id)
            .limit(1)
            .maybeSingle();

        if (existingMemberError) {
          throw existingMemberError;
        }

        if (existingMember) {
          loadedMembers = [existingMember as Member];
        } else {
          const { data: createdMember, error: createMemberError } =
            await supabase
              .from("family_members")
              .insert({
                family_id: familyId,
                user_id: user.id,
                full_name: fullName,
                relationship: "Self",
              })
              .select(
                "id, full_name, relationship, date_of_birth, photo_url"
              )
              .single();

          if (createMemberError) {
            throw createMemberError;
          }

          loadedMembers = [createdMember as Member];
        }
      }

      setMembers(loadedMembers);

      let selected = loadedMembers[0];

      if (requestedMemberId) {
        const requested = loadedMembers.find(
          (item) => item.id === requestedMemberId
        );

        if (requested) {
          selected = requested;
        }
      } else {
        const self = loadedMembers.find(
          (item) =>
            item.relationship?.trim().toLowerCase() === "self"
        );

        if (self) {
          selected = self;
        }
      }

      setMember(selected);

      // A missing emergency_profiles row is normal for a new user.
      // loadEmergencyProfile() converts it into an empty editable form.
      await loadEmergencyProfile(selected.id);
    } catch (err) {
      console.error("Emergency profile load error:", err);

      const technicalMessage =
        err instanceof Error ? err.message : String(err);

      if (
        technicalMessage.toLowerCase().includes("row-level security") ||
        technicalMessage.toLowerCase().includes("permission") ||
        technicalMessage.toLowerCase().includes("policy")
      ) {
        setError(
          "Medi Key couldn't access your family profile. Please sign out and sign in again."
        );
      } else {
        setError(
          "We couldn't load this emergency profile. Please refresh and try again."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function loadEmergencyProfile(memberId: string) {
    const { data, error: profileError } = await supabase
      .from("emergency_profiles")
      .select(
        `
          id,
          member_id,
          blood_group,
          allergies,
          critical_medications,
          medical_conditions,
          emergency_notes,
          emergency_contact_name,
          emergency_contact_phone
        `
      )
      .eq("member_id", memberId)
      .maybeSingle();

    if (profileError) {
      throw profileError;
    }

    const nextProfile = data
      ? {
          ...emptyProfile(memberId),
          ...data,
          blood_group: data.blood_group ?? "",
          allergies: data.allergies ?? "",
          critical_medications: data.critical_medications ?? "",
          medical_conditions: data.medical_conditions ?? "",
          emergency_notes: data.emergency_notes ?? "",
          emergency_contact_name: data.emergency_contact_name ?? "",
          emergency_contact_phone: data.emergency_contact_phone ?? "",
        }
      : emptyProfile(memberId);

    setProfile(nextProfile);
    setSavedProfile(structuredClone(nextProfile));
  }

  async function handleMemberChange(memberId: string) {
    const selected = members.find(
      (item) => item.id === memberId
    );

    if (!selected) {
      return;
    }

    setMember(selected);
    setError("");
    setMessage("");

    try {
      await loadEmergencyProfile(selected.id);
    } catch (err) {
      console.error(err);

      setError(
        "Couldn't load this member's emergency information."
      );
    }
  }

  function updateField(
    field: keyof EmergencyProfile,
    value: string
  ) {
    setProfile((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current
    );

    setMessage("");
  }

  const hasUnsavedChanges = useMemo(() => {
    if (!profile || !savedProfile) {
      return false;
    }

    return JSON.stringify(profile) !== JSON.stringify(savedProfile);
  }, [profile, savedProfile]);

  function validateProfile() {
    if (!profile) {
      return "Emergency profile is not available.";
    }

    const phone = profile.emergency_contact_phone.trim();

    if (phone) {
      const digits = phone.replace(/\D/g, "");

      if (digits.length < 10 || digits.length > 15) {
        return "Please enter a valid emergency contact number.";
      }
    }

    if (
      profile.emergency_contact_name.trim() &&
      !phone
    ) {
      return "Please add a phone number for the emergency contact.";
    }

    if (
      phone &&
      !profile.emergency_contact_name.trim()
    ) {
      return "Please add the emergency contact's name.";
    }

    return null;
  }

  async function saveProfile() {
    if (!member || !profile || saving) {
      return;
    }

    const validationError = validateProfile();

    if (validationError) {
      setError(validationError);
      setMessage("");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        member_id: member.id,
        blood_group: profile.blood_group.trim(),
        allergies: profile.allergies.trim(),
        critical_medications:
          profile.critical_medications.trim(),
        medical_conditions:
          profile.medical_conditions.trim(),
        emergency_notes:
          profile.emergency_notes.trim(),
        emergency_contact_name:
          profile.emergency_contact_name.trim(),
        emergency_contact_phone:
          profile.emergency_contact_phone.trim(),
      };

      const { data, error: saveError } = await supabase
        .from("emergency_profiles")
        .upsert(payload, {
          onConflict: "member_id",
        })
        .select(
          `
            id,
            member_id,
            blood_group,
            allergies,
            critical_medications,
            medical_conditions,
            emergency_notes,
            emergency_contact_name,
            emergency_contact_phone
          `
        )
        .single();

      if (saveError) {
        throw saveError;
      }

      const updatedProfile = data as EmergencyProfile;

      setProfile(updatedProfile);
      setSavedProfile(structuredClone(updatedProfile));

      setMessage(
        "Emergency profile saved successfully."
      );
    } catch (err) {
      console.error(err);

      setError(
        "We couldn't save the emergency profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <LoadingState />;
  }

  if (!member) {
    return (
      <main className="min-h-screen bg-[#F7FAF8] px-5 py-10 text-[#19302F]">
        <div className="mx-auto max-w-2xl">
          <div className="rounded-[28px] border border-[#DFE9E6] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#E6F3EF] text-[#176B67]">
              <Icon name="user" size={28} />
            </div>

            <h1 className="mt-5 text-2xl font-black">
              No family member found
            </h1>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667A78]">
              Add a family member before creating emergency
              information.
            </p>

            <Link
              href="/family/add"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#176B67] px-5 py-3 font-bold text-white transition hover:bg-[#125B58]"
            >
              Add Family Member
              <Icon name="arrow" size={17} />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7FAF8] text-[#19302F]">
      {/* HEADER */}
      <header className="sticky top-0 z-30 border-b border-[#DFE9E6] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#E6F3EF] text-[#176B67]">
              <Icon name="heart" size={23} />
            </div>

            <div>
              <div className="text-xl font-black tracking-[-0.04em]">
                Medi
                <span className="text-[#176B67]">
                  Key
                </span>
              </div>

              <div className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#667A78]">
                Emergency Profile
              </div>
            </div>
          </Link>

          <div className="hidden items-center gap-2 sm:flex">
            <Link
              href="/dashboard"
              className="rounded-xl border border-[#DFE9E6] px-4 py-2 text-sm font-bold text-[#667A78] transition hover:bg-[#F5F9F7]"
            >
              Dashboard
            </Link>

            <Link
              href={`/profile?member=${encodeURIComponent(
                member.id
              )}`}
              className="rounded-xl border border-[#DFE9E6] px-4 py-2 text-sm font-bold text-[#667A78] transition hover:bg-[#F5F9F7]"
            >
              Profile
            </Link>
          </div>

          <Link
            href="/dashboard"
            className="flex items-center gap-1 rounded-xl border border-[#DFE9E6] px-3 py-2 text-sm font-bold text-[#667A78] sm:hidden"
            aria-label="Back to dashboard"
          >
            <Icon name="back" size={17} />
          </Link>
        </div>
      </header>

      {/* MAIN */}
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        {/* PAGE INTRO */}
        <div className="mb-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#E6F3EF] px-3 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#176B67]">
                <Icon name="shield" size={14} />
                Emergency information
              </div>

              <h1 className="text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                Emergency Profile
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667A78]">
                Keep critical information accurate so the
                right details are available when they matter
                most.
              </p>
            </div>

            {hasUnsavedChanges && (
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-[#E8D7AD] bg-[#FFF9EA] px-3.5 py-2 text-xs font-bold text-[#8A641F]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C98A28]" />
                Unsaved changes
              </div>
            )}
          </div>
        </div>

        {/* MEMBER SELECTOR */}
        {members.length > 1 && (
          <div className="mb-6 rounded-[24px] border border-[#DFE9E6] bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E6F3EF] text-[#176B67]">
                <Icon name="user" size={18} />
              </div>

              <div>
                <p className="text-sm font-black">
                  Family member
                </p>

                <p className="text-xs text-[#667A78]">
                  Choose whose emergency profile you want
                  to edit.
                </p>
              </div>
            </div>

            <div className="relative">
              <select
                id="member"
                value={member.id}
                onChange={(event) =>
                  handleMemberChange(event.target.value)
                }
                className="w-full appearance-none rounded-xl border border-[#DFE9E6] bg-white px-4 py-3.5 pr-10 text-sm font-semibold outline-none transition focus:border-[#176B67] focus:ring-4 focus:ring-[#E6F3EF]"
              >
                {members.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                  >
                    {item.full_name} —{" "}
                    {item.relationship ||
                      "Family Member"}
                  </option>
                ))}
              </select>

              <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#667A78]">
                <Icon name="chevron" size={17} />
              </div>
            </div>
          </div>
        )}

        {/* ALERTS */}
        {error && (
          <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-[#F0C9CD] bg-[#FFF5F6] p-4 text-sm text-[#9D2D39] sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0">
                <Icon name="warning" size={18} />
              </div>

              <div>
                <p className="font-black">
                  Something needs attention
                </p>

                <p className="mt-0.5 leading-5">
                  {error}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={loadPage}
              className="w-fit rounded-xl border border-[#E8B9BE] bg-white px-3.5 py-2 text-xs font-black text-[#9D2D39] transition hover:bg-[#FFF0F1]"
            >
              Try again
            </button>
          </div>
        )}

        {message && (
          <div className="mb-5 flex items-center gap-3 rounded-2xl border border-[#CBE4DC] bg-[#EFF9F5] p-4 text-sm text-[#176B67]">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white">
              <Icon name="check" size={16} />
            </div>

            <p className="font-bold">{message}</p>
          </div>
        )}

        {/* MEMBER CARD */}
        <section className="mb-6 overflow-hidden rounded-[28px] border border-[#DFE9E6] bg-white shadow-sm">
          <div className="h-2 bg-[#176B67]" />

          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
            <div className="flex items-center gap-4">
              {member.photo_url ? (
                <img
                  src={member.photo_url}
                  alt={member.full_name}
                  className="h-16 w-16 rounded-2xl object-cover ring-4 ring-[#E6F3EF]"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-[#E6F3EF] text-[#176B67]">
                  <Icon name="user" size={28} />
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-black tracking-[-0.03em]">
                    {member.full_name}
                  </h2>

                  <span className="rounded-full bg-[#EFF8F5] px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-[#176B67]">
                    {member.relationship ||
                      "Family Member"}
                  </span>
                </div>

                <p className="mt-1 text-sm text-[#667A78]">
                  {member.date_of_birth
                    ? `DOB ${new Date(
                        member.date_of_birth
                      ).toLocaleDateString("en-IN")}`
                    : "Date of birth not added"}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href={`/profile?member=${encodeURIComponent(
                  member.id
                )}`}
                className="inline-flex items-center gap-2 rounded-xl border border-[#DFE9E6] px-4 py-2.5 text-xs font-bold text-[#667A78] transition hover:bg-[#F7FAF8]"
              >
                <Icon name="user" size={16} />
                Edit profile
              </Link>

              <Link
                href={`/card?member=${encodeURIComponent(
                  member.id
                )}`}
                className="inline-flex items-center gap-2 rounded-xl bg-[#E6F3EF] px-4 py-2.5 text-xs font-bold text-[#176B67] transition hover:bg-[#D9ECE6]"
              >
                View card
                <Icon name="arrow" size={15} />
              </Link>
            </div>
          </div>
        </section>

        {profile && (
          <div className="space-y-6">
            {/* CRITICAL INFORMATION */}
            <section className="rounded-[28px] border border-[#DFE9E6] bg-white p-6 shadow-sm sm:p-7">
              <SectionHeader
                icon="medical"
                title="Critical Information"
                description="These details are designed for quick access during an emergency."
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Blood group"
                  value={profile.blood_group}
                  onChange={(value) =>
                    updateField(
                      "blood_group",
                      value
                    )
                  }
                  options={BLOOD_GROUPS}
                  placeholder="Select blood group"
                />

                <Field
                  label="Critical medications"
                  value={profile.critical_medications}
                  onChange={(value) =>
                    updateField(
                      "critical_medications",
                      value
                    )
                  }
                  placeholder="e.g. Insulin, Epinephrine"
                  maxLength={MAX_TEXT}
                />

                <TextArea
                  label="Critical allergies"
                  value={profile.allergies}
                  onChange={(value) =>
                    updateField(
                      "allergies",
                      value
                    )
                  }
                  placeholder="List serious allergies or write 'None known'"
                  maxLength={MAX_TEXT}
                />

                <TextArea
                  label="Medical conditions"
                  value={profile.medical_conditions}
                  onChange={(value) =>
                    updateField(
                      "medical_conditions",
                      value
                    )
                  }
                  placeholder="Important diagnosed conditions"
                  maxLength={MAX_TEXT}
                />
              </div>
            </section>

            {/* EMERGENCY NOTES */}
            <section className="rounded-[28px] border border-[#DFE9E6] bg-white p-6 shadow-sm sm:p-7">
              <SectionHeader
                icon="warning"
                title="Emergency Notes"
                description="Keep this short, practical and focused on information a responder may need immediately."
              />

              <TextArea
                label="Emergency instructions"
                value={profile.emergency_notes}
                onChange={(value) =>
                  updateField(
                    "emergency_notes",
                    value
                  )
                }
                placeholder="Example: Carry epinephrine. Avoid penicillin. Contact family immediately."
                rows={5}
                maxLength={MAX_NOTES}
                showCounter
              />
            </section>

            {/* EMERGENCY CONTACT */}
            <section className="rounded-[28px] border border-[#DFE9E6] bg-white p-6 shadow-sm sm:p-7">
              <SectionHeader
                icon="contact"
                title="Emergency Contact"
                description="Someone responders can contact when immediate family support is needed."
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Contact name"
                  value={
                    profile.emergency_contact_name
                  }
                  onChange={(value) =>
                    updateField(
                      "emergency_contact_name",
                      value
                    )
                  }
                  placeholder="e.g. Parent, spouse or guardian"
                  maxLength={100}
                />

                <PhoneField
                  label="Contact phone"
                  value={
                    profile.emergency_contact_phone
                  }
                  onChange={(value) =>
                    updateField(
                      "emergency_contact_phone",
                      value
                    )
                  }
                  placeholder="+91 XXXXX XXXXX"
                />
              </div>

              <div className="mt-5 flex items-start gap-3 rounded-2xl border border-[#E5ECEA] bg-[#F8FBFA] p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#176B67]">
                  <Icon name="phone" size={17} />
                </div>

                <div>
                  <p className="text-xs font-black text-[#19302F]">
                    Keep this number reachable
                  </p>

                  <p className="mt-1 text-xs leading-5 text-[#667A78]">
                    This contact may appear on the public
                    emergency profile when the QR card is
                    scanned.
                  </p>
                </div>
              </div>
            </section>

            {/* PRIVACY */}
            <section className="overflow-hidden rounded-[28px] border border-[#D6E7E2] bg-[#EFF8F5]">
              <div className="p-6 sm:p-7">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#176B67] shadow-sm">
                    <Icon name="shield" size={21} />
                  </div>

                  <div>
                    <h3 className="font-black">
                      Emergency information stays focused
                    </h3>

                    <p className="mt-1 text-sm leading-6 text-[#667A78]">
                      Your Medi Key QR is designed to show
                      critical emergency information. Sensitive
                      medical records remain protected behind
                      appropriate access controls.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <PrivacyPoint
                    title="QR emergency view"
                    text="Critical information for immediate assistance."
                  />

                  <PrivacyPoint
                    title="Medical records"
                    text="Private records require authorized access."
                  />
                </div>
              </div>
            </section>

            {/* ACTION BAR */}
            <div className="sticky bottom-4 z-20">
              <div className="rounded-[22px] border border-[#DFE9E6] bg-white/95 p-3 shadow-lg shadow-[#19302F]/5 backdrop-blur">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="hidden sm:block">
                    <p className="text-xs font-black text-[#19302F]">
                      Emergency profile
                    </p>

                    <p className="mt-0.5 text-xs text-[#667A78]">
                      {hasUnsavedChanges
                        ? "You have unsaved changes."
                        : "Everything is up to date."}
                    </p>
                  </div>

                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <Link
                      href="/dashboard"
                      className="rounded-xl border border-[#DFE9E6] bg-white px-5 py-3 text-center text-sm font-bold text-[#667A78] transition hover:bg-[#F7FAF8]"
                    >
                      Cancel
                    </Link>

                    <button
                      type="button"
                      onClick={saveProfile}
                      disabled={
                        saving ||
                        !hasUnsavedChanges
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#176B67] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#125B58] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Icon name="save" size={17} />
                          Save Emergency Profile
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

/* =========================================================
   SECTION HEADER
========================================================= */

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon:
    | "medical"
    | "warning"
    | "contact";
  title: string;
  description: string;
}) {
  return (
    <div className="mb-6 flex items-start gap-4">
      <div
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
          icon === "warning"
            ? "bg-[#FFF4E8] text-[#A36A19]"
            : "bg-[#E6F3EF] text-[#176B67]"
        }`}
      >
        <Icon name={icon} size={21} />
      </div>

      <div>
        <h2 className="text-xl font-black tracking-[-0.03em]">
          {title}
        </h2>

        <p className="mt-1 max-w-2xl text-sm leading-6 text-[#667A78]">
          {description}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   FIELD
========================================================= */

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-[#19302F]">
        {label}
      </label>

      <input
        type={type}
        value={value}
        maxLength={maxLength}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        className="w-full rounded-xl border border-[#DFE9E6] bg-white px-4 py-3.5 text-sm text-[#19302F] outline-none transition placeholder:text-[#9AA9A7] focus:border-[#176B67] focus:ring-4 focus:ring-[#E6F3EF]"
      />
    </div>
  );
}

/* =========================================================
   PHONE FIELD
========================================================= */

function PhoneField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-[#19302F]">
        {label}
      </label>

      <div className="relative">
        <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#667A78]">
          <Icon name="phone" size={17} />
        </div>

        <input
          type="tel"
          inputMode="tel"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          placeholder={placeholder}
          className="w-full rounded-xl border border-[#DFE9E6] bg-white py-3.5 pl-11 pr-4 text-sm text-[#19302F] outline-none transition placeholder:text-[#9AA9A7] focus:border-[#176B67] focus:ring-4 focus:ring-[#E6F3EF]"
        />
      </div>

      <p className="mt-1.5 text-xs text-[#667A78]">
        Include the country code when possible.
      </p>
    </div>
  );
}

/* =========================================================
   SELECT FIELD
========================================================= */

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-bold text-[#19302F]">
        {label}
      </label>

      <div className="relative">
        <select
          value={value ?? ""}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="w-full appearance-none rounded-xl border border-[#DFE9E6] bg-white px-4 py-3.5 pr-10 text-sm font-medium text-[#19302F] outline-none transition focus:border-[#176B67] focus:ring-4 focus:ring-[#E6F3EF]"
        >
          <option value="">
            {placeholder}
          </option>

          {options.map((option) => (
            <option
              key={option}
              value={option}
            >
              {option}
            </option>
          ))}
        </select>

        <div className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#667A78]">
          <Icon name="chevron" size={17} />
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   TEXT AREA
========================================================= */

function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  maxLength,
  showCounter = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  showCounter?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="block text-sm font-bold text-[#19302F]">
          {label}
        </label>

        {showCounter && maxLength && (
          <span className="text-[11px] font-semibold text-[#9AA9A7]">
            {value.length}/{maxLength}
          </span>
        )}
      </div>

      <textarea
        value={value}
        maxLength={maxLength}
        onChange={(event) =>
          onChange(event.target.value)
        }
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-xl border border-[#DFE9E6] bg-white px-4 py-3.5 text-sm leading-6 text-[#19302F] outline-none transition placeholder:text-[#9AA9A7] focus:border-[#176B67] focus:ring-4 focus:ring-[#E6F3EF]"
      />

      {!showCounter && maxLength && (
        <p className="mt-1.5 text-right text-[11px] font-semibold text-[#9AA9A7]">
          {value.length}/{maxLength}
        </p>
      )}
    </div>
  );
}

/* =========================================================
   PRIVACY POINT
========================================================= */

function PrivacyPoint({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-[#DCEBE6] bg-white/70 p-4">
      <div className="mt-0.5 text-[#176B67]">
        <Icon name="check" size={17} />
      </div>

      <div>
        <p className="text-xs font-black">
          {title}
        </p>

        <p className="mt-1 text-xs leading-5 text-[#667A78]">
          {text}
        </p>
      </div>
    </div>
  );
}

/* =========================================================
   LOADING
========================================================= */

function LoadingState() {
  return (
    <main className="min-h-screen bg-[#F7FAF8]">
      <header className="border-b border-[#DFE9E6] bg-white">
        <div className="mx-auto flex max-w-6xl items-center px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 animate-pulse rounded-[14px] bg-[#E4EEEB]" />

            <div>
              <div className="h-5 w-24 animate-pulse rounded bg-[#E4EEEB]" />
              <div className="mt-2 h-2.5 w-28 animate-pulse rounded bg-[#EAF1EF]" />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">
        <div className="h-5 w-44 animate-pulse rounded bg-[#E4EEEB]" />

        <div className="mt-4 h-10 w-72 animate-pulse rounded-xl bg-[#E4EEEB]" />

        <div className="mt-3 h-5 w-full max-w-xl animate-pulse rounded bg-[#EAF1EF]" />

        <div className="mt-8 h-32 animate-pulse rounded-[28px] bg-[#E4EEEB]" />

        <div className="mt-6 h-[430px] animate-pulse rounded-[28px] bg-[#E4EEEB]" />

        <div className="mt-6 h-72 animate-pulse rounded-[28px] bg-[#E4EEEB]" />
      </div>
    </main>
  );
}

/* =========================================================
   SUSPENSE WRAPPER
========================================================= */

export default function EmergencyProfilePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <EmergencyProfileContent />
    </Suspense>
  );
}