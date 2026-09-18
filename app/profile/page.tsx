"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type Member = {
  id: string;
  full_name: string;
  relationship: string | null;
  date_of_birth: string | null;
  family_id: string;
  photo_url: string | null;
};

type EmergencyProfile = {
  blood_group: string | null;
  allergies: string | null;
  critical_medications: string | null;
  medical_conditions: string | null;
  emergency_notes: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

/* =========================================================
   ICONS
========================================================= */

function Icon({
  name,
  size = 20,
}: {
  name:
    | "user"
    | "edit"
    | "camera"
    | "trash"
    | "arrow"
    | "shield"
    | "heart"
    | "phone"
    | "calendar"
    | "activity"
    | "alert"
    | "check"
    | "home"
    | "qr";
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

  switch (name) {
    case "user":
      return (
        <svg {...common}>
          <circle cx="12" cy="7" r="4" />
          <path d="M4 21c.6-4 3.2-6 8-6s7.4 2 8 6" />
        </svg>
      );

    case "edit":
      return (
        <svg {...common}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
        </svg>
      );

    case "camera":
      return (
        <svg {...common}>
          <path d="M4 7h3l1.5-2h7L17 7h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1Z" />
          <circle cx="12" cy="13" r="4" />
        </svg>
      );

    case "trash":
      return (
        <svg {...common}>
          <path d="M4 7h16" />
          <path d="M10 11v6" />
          <path d="M14 11v6" />
          <path d="M6 7l1 14h10l1-14" />
          <path d="M9 7V4h6v3" />
        </svg>
      );

    case "arrow":
      return (
        <svg {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 20 6v5c0 5-3.3 8.5-8 10-4.7-1.5-8-5-8-10V6z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );

    case "heart":
      return (
        <svg {...common}>
          <path d="M20.8 8.8c0 5.5-8.8 10.2-8.8 10.2S3.2 14.3 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z" />
        </svg>
      );

    case "phone":
      return (
        <svg {...common}>
          <path d="M5 4h3l2 5-2 1.5a15 15 0 0 0 5.5 5.5L15 14l5 2v3a2 2 0 0 1-2 2C10.3 21 3 13.7 3 6a2 2 0 0 1 2-2Z" />
        </svg>
      );

    case "calendar":
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M16 3v4M8 3v4M3 10h18" />
        </svg>
      );

    case "activity":
      return (
        <svg {...common}>
          <path d="M3 12h4l2-7 4 14 2-7h6" />
        </svg>
      );

    case "alert":
      return (
        <svg {...common}>
          <path d="M12 3 22 20H2Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      );

    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );

    case "home":
      return (
        <svg {...common}>
          <path d="M3 10.5 12 3l9 7.5" />
          <path d="M5 9.5V21h14V9.5" />
          <path d="M9 21v-6h6v6" />
        </svg>
      );

    case "qr":
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <path d="M14 14h3v3h-3z" />
          <path d="M18 18h3v3h-3z" />
          <path d="M18 14h3" />
          <path d="M14 18v3" />
        </svg>
      );
  }
}

/* =========================================================
   HELPERS
========================================================= */

function formatDate(
  date: string | null
) {
  if (!date) {
    return "Not provided";
  }

  const parsed =
    new Date(date);

  if (
    Number.isNaN(
      parsed.getTime()
    )
  ) {
    return date;
  }

  return parsed.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }
  );
}

/* =========================================================
   PAGE
========================================================= */

export default function ProfilePage() {
  const searchParams =
    useSearchParams();

  const memberId =
    searchParams.get(
      "member"
    );

  const fileInputRef =
    useRef<HTMLInputElement>(
      null
    );

  const [member, setMember] =
    useState<Member | null>(
      null
    );

  const [
    emergencyProfile,
    setEmergencyProfile,
  ] =
    useState<EmergencyProfile | null>(
      null
    );

  const [loading, setLoading] =
    useState(true);

  const [
    savingProfile,
    setSavingProfile,
  ] =
    useState(false);

  const [
    uploadingPhoto,
    setUploadingPhoto,
  ] =
    useState(false);

  const [deletingPhoto, setDeletingPhoto] =
    useState(false);

  const [editing, setEditing] =
    useState(false);

  const [editName, setEditName] =
    useState("");

  const [
    editRelationship,
    setEditRelationship,
  ] =
    useState("");

  const [editDob, setEditDob] =
    useState("");

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  /* =======================================================
     LOAD PROFILE
  ======================================================= */

  useEffect(() => {
    loadProfile();
  }, [memberId]);

  async function loadProfile() {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (!user) {
        window.location.href =
          "/login";

        return;
      }

      let memberData:
        | Member
        | null = null;

      /* -----------------------------------------------
         Specific family member
      ------------------------------------------------ */

      if (memberId) {
        const {
          data,
          error:
            memberError,
        } =
          await supabase
            .from(
              "family_members"
            )
            .select(
              "id, full_name, relationship, date_of_birth, family_id, photo_url"
            )
            .eq(
              "id",
              memberId
            )
            .maybeSingle();

        if (memberError) {
          throw memberError;
        }

        memberData =
          data as Member | null;
      } else {
        /* ---------------------------------------------
           Logged-in user's own member
        --------------------------------------------- */

        const {
          data,
          error:
            memberError,
        } =
          await supabase
            .from(
              "family_members"
            )
            .select(
              "id, full_name, relationship, date_of_birth, family_id, photo_url"
            )
            .eq(
              "user_id",
              user.id
            )
            .limit(1)
            .maybeSingle();

        if (memberError) {
          throw memberError;
        }

        memberData =
          data as Member | null;
      }

      if (!memberData) {
        setError(
          "Profile not found."
        );

        return;
      }

      setMember(
        memberData
      );

      setEditName(
        memberData.full_name ||
          ""
      );

      setEditRelationship(
        memberData.relationship ||
          ""
      );

      setEditDob(
        memberData.date_of_birth ||
          ""
      );

      /* -----------------------------------------------
         Emergency profile
      ------------------------------------------------ */

      const {
        data:
          emergencyData,
        error:
          emergencyError,
      } =
        await supabase
          .from(
            "emergency_profiles"
          )
          .select(
            "blood_group, allergies, critical_medications, medical_conditions, emergency_notes, emergency_contact_name, emergency_contact_phone"
          )
          .eq(
            "member_id",
            memberData.id
          )
          .maybeSingle();

      if (
        emergencyError
      ) {
        console.warn(
          emergencyError
        );
      }

      setEmergencyProfile(
        emergencyData
          ? (emergencyData as EmergencyProfile)
          : null
      );
    } catch (err) {
      console.error(err);

      setError(
        "We couldn't load this profile."
      );
    } finally {
      setLoading(false);
    }
  }

  /* =======================================================
     SAVE BASIC PROFILE
  ======================================================= */

  async function saveBasicProfile() {
    if (!member) {
      return;
    }

    const cleanName =
      editName.trim();

    const cleanRelationship =
      editRelationship.trim();

    if (!cleanName) {
      setError(
        "Please enter a name."
      );

      return;
    }

    setSavingProfile(true);
    setError("");
    setSuccess("");

    try {
      const {
        data: updatedMember,
        error: updateError,
      } =
        await supabase
          .from(
            "family_members"
          )
          .update({
            full_name:
              cleanName,

            relationship:
              cleanRelationship ||
              null,

            date_of_birth:
              editDob || null,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            member.id
          )
          .select(
            "id, full_name, relationship, date_of_birth, family_id, photo_url"
          )
          .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (!updatedMember) {
        throw new Error(
          "Profile was not updated."
        );
      }

      const updated =
        updatedMember as Member;

      setMember(
        updated
      );

      /*
       * Keep dashboard greeting synced
       * for the account owner.
       */

      if (
        updated.relationship
          ?.toLowerCase() ===
        "self"
      ) {
        const {
          data: {
            user,
          },
        } =
          await supabase.auth.getUser();

        if (user) {
          await supabase.auth.updateUser(
            {
              data: {
                full_name:
                  updated.full_name,
              },
            }
          );
        }
      }

      setEditing(false);

      setSuccess(
        "Basic profile updated successfully."
      );
    } catch (err) {
      console.error(err);

      setError(
        "We couldn't update the profile."
      );
    } finally {
      setSavingProfile(false);
    }
  }

  /* =======================================================
     PHOTO PICKER
  ======================================================= */

  function openPhotoPicker() {
    setError("");
    setSuccess("");

    fileInputRef.current?.click();
  }

  /* =======================================================
     PHOTO UPLOAD
  ======================================================= */

  async function handlePhotoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    /*
     * Allow selecting the same image again.
     */

    event.target.value = "";

    if (!file || !member) {
      return;
    }

    setError("");
    setSuccess("");

    /* -----------------------------------------------
       Validation
    ------------------------------------------------ */

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please choose an image file."
      );

      return;
    }

    const maxSize =
      5 * 1024 * 1024;

    if (
      file.size >
      maxSize
    ) {
      setError(
        "Image must be smaller than 5 MB."
      );

      return;
    }

    setUploadingPhoto(
      true
    );

    try {
      const {
        data: {
          user,
        },
      } =
        await supabase.auth.getUser();

      if (!user) {
        throw new Error(
          "You are not logged in."
        );
      }

      /*
       * Normalize extension.
       */

      const extension =
        file.name
          .split(".")
          .pop()
          ?.toLowerCase() ||
        "jpg";

      /*
       * Each family member gets
       * their own folder/path.
       *
       * This means Aditya's photo
       * cannot accidentally become
       * Sesh Nath's photo.
       */

      const filePath =
        `${user.id}/${member.id}/profile-${Date.now()}.${extension}`;

      const {
        error:
          uploadError,
      } =
        await supabase.storage
          .from(
            "profile-photos"
          )
          .upload(
            filePath,
            file,
            {
              cacheControl:
                "3600",

              upsert: false,

              contentType:
                file.type,
            }
          );

      if (uploadError) {
        throw uploadError;
      }

      /*
       * Get public URL.
       */

      const {
        data:
          publicUrlData,
      } =
        supabase.storage
          .from(
            "profile-photos"
          )
          .getPublicUrl(
            filePath
          );

      const photoUrl =
        publicUrlData
          .publicUrl;

      if (!photoUrl) {
        throw new Error(
          "Photo URL could not be created."
        );
      }

      /*
       * Save URL to member.
       */

      const {
        data:
          updatedMember,
        error:
          updateError,
      } =
        await supabase
          .from(
            "family_members"
          )
          .update({
            photo_url:
              photoUrl,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            member.id
          )
          .select(
            "id, full_name, relationship, date_of_birth, family_id, photo_url"
          )
          .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (!updatedMember) {
        throw new Error(
          "Profile photo URL could not be saved."
        );
      }

      setMember(
        updatedMember as Member
      );

      setSuccess(
        "Profile photo updated. It will now appear on the MediKey card."
      );
    } catch (err) {
      console.error(
        "Photo upload error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't upload the photo."
      );
    } finally {
      setUploadingPhoto(
        false
      );
    }
  }

  /* =======================================================
     REMOVE PHOTO
  ======================================================= */

  async function removePhoto() {
    if (
      !member?.photo_url
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Remove this profile photo? The MediKey card will return to the default placeholder."
      );

    if (!confirmed) {
      return;
    }

    setDeletingPhoto(
      true
    );

    setError("");
    setSuccess("");

    try {
      /*
       * We only need to clear the
       * profile reference.
       *
       * Keeping old storage files is
       * safer than accidentally deleting
       * another member's image.
       */

      const {
        data:
          updatedMember,
        error:
          updateError,
      } =
        await supabase
          .from(
            "family_members"
          )
          .update({
            photo_url:
              null,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            member.id
          )
          .select(
            "id, full_name, relationship, date_of_birth, family_id, photo_url"
          )
          .maybeSingle();

      if (updateError) {
        throw updateError;
      }

      if (!updatedMember) {
        throw new Error(
          "Photo could not be removed."
        );
      }

      setMember(
        updatedMember as Member
      );

      setSuccess(
        "Profile photo removed."
      );
    } catch (err) {
      console.error(err);

      setError(
        "We couldn't remove the photo."
      );
    } finally {
      setDeletingPhoto(
        false
      );
    }
  }

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F7FAF8] p-6">

        <div className="mx-auto max-w-5xl">

          <div className="h-10 w-56 animate-pulse rounded-xl bg-[#E4EEEB]" />

          <div className="mt-8 h-[520px] animate-pulse rounded-[28px] bg-[#E4EEEB]" />

        </div>

      </main>
    );
  }

  /* =======================================================
     ERROR / NO MEMBER
  ======================================================= */

  if (!member) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#F7FAF8] p-6">

        <div className="w-full max-w-md rounded-[28px] border border-[#DFE9E6] bg-white p-8 text-center shadow-sm">

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#FFF0F1] text-[#B83240]">

            <Icon
              name="alert"
              size={28}
            />

          </div>

          <h1 className="mt-5 text-2xl font-black">
            Profile unavailable
          </h1>

          <p className="mt-2 text-sm leading-6 text-[#667A78]">
            {error ||
              "We couldn't find this family member."}
          </p>

          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#176B67] px-5 py-3 font-bold text-white"
          >

            <Icon
              name="home"
              size={18}
            />

            Back to Dashboard

          </Link>

        </div>

      </main>
    );
  }

  /* =======================================================
     PHOTO SOURCE
  ======================================================= */

  const hasPhoto =
    Boolean(
      member.photo_url
    );

  /* =======================================================
     MAIN UI
  ======================================================= */

  return (
    <main className="min-h-screen bg-[#F7FAF8] text-[#19302F]">

      {/* =================================================
          HEADER
      ================================================= */}

      <header className="border-b border-[#DFE9E6] bg-white">

        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">

          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >

            <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#E6F3EF] text-[#176B67]">

              <span className="text-2xl">
                ♥
              </span>

            </div>

            <div>

              <div className="text-xl font-black tracking-[-0.03em]">

                Medi
                <span className="text-[#176B67]">
                  Key
                </span>

              </div>

              <div className="-mt-0.5 text-[9px] font-bold uppercase tracking-[0.15em] text-[#667A78]">
                Family Health
              </div>

            </div>

          </Link>

          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl border border-[#DFE9E6] bg-white px-4 py-2.5 text-sm font-bold text-[#667A78] hover:bg-[#F5FAF8] hover:text-[#176B67]"
          >

            <Icon
              name="arrow"
              size={17}
            />

            Dashboard

          </Link>

        </div>

      </header>

      {/* =================================================
          CONTENT
      ================================================= */}

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8 lg:py-12">

        {/* TITLE */}

        <div className="mb-8">

          <div className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-[#176B67]">
            Family Profile
          </div>

          <h1 className="text-[36px] font-black tracking-[-0.045em] sm:text-[46px]">
            {member.full_name}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#667A78]">
            Manage basic information,
            profile photo and emergency
            information for this family
            member.
          </p>

        </div>

        {/* =================================================
            ALERTS
        ================================================= */}

        {error && (

          <div className="mb-5 rounded-2xl border border-[#F0C9CD] bg-[#FFF5F6] p-4 text-sm font-medium text-[#9D2D39]">
            {error}
          </div>

        )}

        {success && (

          <div className="mb-5 flex items-center gap-2 rounded-2xl border border-[#CBE4DC] bg-[#F0FAF7] p-4 text-sm font-medium text-[#176B67]">

            <Icon
              name="check"
              size={18}
            />

            {success}

          </div>

        )}

        <div className="grid gap-7 lg:grid-cols-[390px_1fr]">

          {/* =================================================
              LEFT — PROFILE CARD
          ================================================= */}

          <section className="rounded-[28px] border border-[#DFE9E6] bg-white p-6 shadow-sm">

            {/* PHOTO */}

            <div className="flex flex-col items-center">

              <div className="group relative">

                {hasPhoto ? (

                  <img
                    src={
                      member.photo_url!
                    }
                    alt={
                      member.full_name
                    }
                    className="h-52 w-52 rounded-[30px] object-cover shadow-[0_16px_45px_rgba(25,48,47,0.14)]"
                  />

                ) : (

                  <div className="flex h-52 w-52 items-center justify-center rounded-[30px] bg-[#E6F3EF] text-[#176B67]">

                    <Icon
                      name="user"
                      size={72}
                    />

                  </div>

                )}

                {/* CAMERA BUTTON */}

                <button
                  type="button"
                  onClick={
                    openPhotoPicker
                  }
                  disabled={
                    uploadingPhoto ||
                    deletingPhoto
                  }
                  className="absolute bottom-3 right-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#176B67] text-white shadow-lg transition hover:scale-105 hover:bg-[#125B57] disabled:opacity-60"
                  aria-label="Change profile photo"
                >

                  <Icon
                    name="camera"
                    size={21}
                  />

                </button>

              </div>

              <input
                ref={
                  fileInputRef
                }
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                className="hidden"
                onChange={
                  handlePhotoChange
                }
              />

              <h2 className="mt-5 text-xl font-black">
                {member.full_name}
              </h2>

              <p className="mt-1 text-sm text-[#667A78]">
                {member.relationship ||
                  "Family Member"}
              </p>

              {/* PHOTO ACTIONS */}

              <div className="mt-5 flex flex-wrap justify-center gap-2">

                <button
                  type="button"
                  onClick={
                    openPhotoPicker
                  }
                  disabled={
                    uploadingPhoto
                  }
                  className="flex items-center gap-2 rounded-xl bg-[#E6F3EF] px-4 py-2.5 text-sm font-bold text-[#176B67] transition hover:bg-[#D9EEE8] disabled:opacity-60"
                >

                  <Icon
                    name="camera"
                    size={17}
                  />

                  {uploadingPhoto
                    ? "Uploading..."
                    : hasPhoto
                    ? "Change Photo"
                    : "Add Photo"}

                </button>

                {hasPhoto && (

                  <button
                    type="button"
                    onClick={
                      removePhoto
                    }
                    disabled={
                      deletingPhoto
                    }
                    className="flex items-center gap-2 rounded-xl border border-[#F0C9CD] bg-[#FFF8F8] px-4 py-2.5 text-sm font-bold text-[#B83240] transition hover:bg-[#FFF0F1] disabled:opacity-60"
                  >

                    <Icon
                      name="trash"
                      size={17}
                    />

                    {deletingPhoto
                      ? "Removing..."
                      : "Remove"}

                  </button>

                )}

              </div>

              <p className="mt-3 text-center text-[11px] leading-5 text-[#8A9997]">
                JPG, PNG or WebP • Maximum
                5 MB
                <br />
                This photo will automatically
                appear on the MediKey card.
              </p>

            </div>

            {/* DIVIDER */}

            <div className="my-6 border-t border-[#DFE9E6]" />

            {/* BASIC DETAILS */}

            <div className="space-y-4">

              <div className="flex items-center justify-between">

                <h3 className="font-extrabold">
                  Basic Information
                </h3>

                {!editing && (

                  <button
                    type="button"
                    onClick={() => {
                      setEditing(
                        true
                      );

                      setError("");
                      setSuccess("");
                    }}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-[#176B67] hover:bg-[#E6F3EF]"
                  >

                    <Icon
                      name="edit"
                      size={16}
                    />

                    Edit

                  </button>

                )}

              </div>

              {editing ? (

                <div className="space-y-4">

                  <div>

                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#667A78]">
                      Full Name
                    </label>

                    <input
                      value={
                        editName
                      }
                      onChange={(
                        event
                      ) =>
                        setEditName(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#DFE9E6] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#176B67] focus:ring-2 focus:ring-[#E6F3EF]"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#667A78]">
                      Relationship
                    </label>

                    <input
                      value={
                        editRelationship
                      }
                      onChange={(
                        event
                      ) =>
                        setEditRelationship(
                          event.target.value
                        )
                      }
                      placeholder="Self, Parent, Child..."
                      className="w-full rounded-xl border border-[#DFE9E6] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#176B67] focus:ring-2 focus:ring-[#E6F3EF]"
                    />

                  </div>

                  <div>

                    <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-[#667A78]">
                      Date of Birth
                    </label>

                    <input
                      type="date"
                      value={
                        editDob
                      }
                      onChange={(
                        event
                      ) =>
                        setEditDob(
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-[#DFE9E6] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#176B67] focus:ring-2 focus:ring-[#E6F3EF]"
                    />

                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">

                    <button
                      type="button"
                      onClick={() =>
                        setEditing(
                          false
                        )
                      }
                      disabled={
                        savingProfile
                      }
                      className="rounded-xl border border-[#DFE9E6] px-4 py-3 text-sm font-bold text-[#667A78]"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={
                        saveBasicProfile
                      }
                      disabled={
                        savingProfile
                      }
                      className="rounded-xl bg-[#176B67] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {savingProfile
                        ? "Saving..."
                        : "Save Changes"}
                    </button>

                  </div>

                </div>

              ) : (

                <div className="space-y-3">

                  <div className="rounded-2xl bg-[#F7FAF8] p-4">

                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#8A9997]">
                      Full Name
                    </p>

                    <p className="mt-1 font-bold">
                      {
                        member.full_name
                      }
                    </p>

                  </div>

                  <div className="rounded-2xl bg-[#F7FAF8] p-4">

                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#8A9997]">
                      Relationship
                    </p>

                    <p className="mt-1 font-bold">
                      {
                        member.relationship ||
                        "Not provided"
                      }
                    </p>

                  </div>

                  <div className="rounded-2xl bg-[#F7FAF8] p-4">

                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#8A9997]">
                      Date of Birth
                    </p>

                    <p className="mt-1 font-bold">
                      {formatDate(
                        member.date_of_birth
                      )}
                    </p>

                  </div>

                </div>

              )}

            </div>

          </section>

          {/* =================================================
              RIGHT — EMERGENCY INFORMATION
          ================================================= */}

          <section className="space-y-6">

            {/* EMERGENCY HEADER */}

            <div className="rounded-[28px] border border-[#D9E9E5] bg-white p-6 shadow-sm sm:p-7">

              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

                <div className="flex items-center gap-4">

                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF0F1] text-[#B83240]">

                    <Icon
                      name="heart"
                      size={23}
                    />

                  </div>

                  <div>

                    <h2 className="text-xl font-black">
                      Emergency Information
                    </h2>

                    <p className="mt-1 text-sm text-[#667A78]">
                      The information visible
                      when this person's QR is
                      scanned.
                    </p>

                  </div>

                </div>

                <Link
                  href={`/emergency-profile?member=${member.id}`}
                  className="flex items-center justify-center gap-2 rounded-xl bg-[#176B67] px-5 py-3 text-sm font-bold text-white hover:bg-[#125B57]"
                >

                  <Icon
                    name="edit"
                    size={17}
                  />

                  Edit Emergency Info

                </Link>

              </div>

              {/* INFO GRID */}

              <div className="mt-7 grid gap-3 sm:grid-cols-2">

                <InfoBox
                  icon="activity"
                  label="Blood Group"
                  value={
                    emergencyProfile?.blood_group
                  }
                />

                <InfoBox
                  icon="alert"
                  label="Critical Allergies"
                  value={
                    emergencyProfile?.allergies
                  }
                  danger
                />

                <InfoBox
                  icon="heart"
                  label="Critical Medications"
                  value={
                    emergencyProfile?.critical_medications
                  }
                />

                <InfoBox
                  icon="activity"
                  label="Medical Conditions"
                  value={
                    emergencyProfile?.medical_conditions
                  }
                />

              </div>

            </div>

            {/* CONTACT */}

            <div className="rounded-[28px] border border-[#DFE9E6] bg-white p-6 shadow-sm">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E6F3EF] text-[#176B67]">

                  <Icon
                    name="phone"
                    size={20}
                  />

                </div>

                <div>

                  <h3 className="font-extrabold">
                    Emergency Contact
                  </h3>

                  <p className="text-xs text-[#667A78]">
                    Person to contact in an emergency
                  </p>

                </div>

              </div>

              <div className="mt-5 rounded-2xl bg-[#F7FAF8] p-4">

                {emergencyProfile?.emergency_contact_name ? (

                  <>

                    <p className="font-bold">
                      {
                        emergencyProfile.emergency_contact_name
                      }
                    </p>

                    {emergencyProfile.emergency_contact_phone && (

                      <a
                        href={`tel:${emergencyProfile.emergency_contact_phone}`}
                        className="mt-2 inline-flex items-center gap-2 text-sm font-bold text-[#176B67]"
                      >

                        <Icon
                          name="phone"
                          size={15}
                        />

                        {
                          emergencyProfile.emergency_contact_phone
                        }

                      </a>

                    )}

                  </>

                ) : (

                  <p className="text-sm text-[#8A9997]">
                    No emergency contact added yet.
                  </p>

                )}

              </div>

            </div>

            {/* QR CONNECTION */}

            <div className="rounded-[28px] border border-[#D6E7E2] bg-[#EFF8F5] p-6">

              <div className="flex gap-4">

                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-[#176B67]">

                  <Icon
                    name="qr"
                    size={21}
                  />

                </div>

                <div>

                  <h3 className="font-extrabold">
                    Your card uses this profile
                  </h3>

                  <p className="mt-1 text-sm leading-6 text-[#667A78]">

                    The profile photo and basic
                    information shown here are
                    automatically used on this
                    member's permanent MediKey
                    card.

                  </p>

                  <Link
                    href={`/card?member=${member.id}`}
                    className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-[#176B67]"
                  >

                    View QR Card

                    <Icon
                      name="arrow"
                      size={16}
                    />

                  </Link>

                </div>

              </div>

            </div>

            {/* SECURITY */}

            <div className="flex gap-3 rounded-2xl border border-[#DFE9E6] bg-white p-5">

              <div className="text-[#176B67]">

                <Icon
                  name="shield"
                  size={22}
                />

              </div>

              <div>

                <p className="text-sm font-bold">
                  Profile privacy
                </p>

                <p className="mt-1 text-xs leading-5 text-[#667A78]">
                  Only the emergency information
                  configured for this member is
                  shown through their public QR
                  emergency page.
                </p>

              </div>

            </div>

          </section>

        </div>

      </div>

    </main>
  );
}

/* =========================================================
   INFO BOX
========================================================= */

function InfoBox({
  icon,
  label,
  value,
  danger = false,
}: {
  icon:
    | "activity"
    | "heart"
    | "alert";

  label: string;

  value:
    | string
    | null
    | undefined;

  danger?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        danger &&
        value
          ? "border-[#F0D1D4] bg-[#FFF8F8]"
          : "border-[#DFE9E6] bg-[#F9FCFB]"
      }`}
    >

      <div className="flex items-center gap-2">

        <span
          className={
            danger &&
            value
              ? "text-[#B83240]"
              : "text-[#176B67]"
          }
        >

          <Icon
            name={icon}
            size={17}
          />

        </span>

        <span className="text-[11px] font-black uppercase tracking-wide text-[#667A78]">
          {label}
        </span>

      </div>

      <p className="mt-3 text-sm font-bold leading-5">

        {value ||
          "Not provided"}

      </p>

    </div>
  );
}