"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type Member = {
  id: string;
  full_name: string;
  relationship: string | null;
  date_of_birth: string | null;
  user_id: string | null;
};

export default function FamilyPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [deletingId, setDeletingId] = useState("");
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  useEffect(() => {
    loadFamily();
  }, []);

  async function loadFamily() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!user) {
        window.location.href = "/login";
        return;
      }

      /*
       * First find the owner's family.
       */
      const { data: families, error: familyError } = await supabase
        .from("families")
        .select("id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: true })
        .limit(1);

      if (familyError) {
        throw new Error(familyError.message);
      }

      const familyId = families?.[0]?.id;

      if (!familyId) {
        throw new Error("Your family could not be found.");
      }

      /*
       * Load every member in this family.
       */
      const { data, error: memberError } = await supabase
        .from("family_members")
        .select(
          "id, full_name, relationship, date_of_birth, user_id"
        )
        .eq("family_id", familyId)
        .order("created_at", { ascending: true });

      if (memberError) {
        throw new Error(memberError.message);
      }

      setMembers(data || []);
    } catch (err) {
      console.error("Family loading error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load your family."
      );
    } finally {
      setLoading(false);
    }
  }

  async function removeMember() {
    if (!memberToDelete) return;

    setDeletingId(memberToDelete.id);
    setError("");

    try {
      /*
       * Remove emergency profile first.
       */
      const { error: emergencyError } = await supabase
        .from("emergency_profiles")
        .delete()
        .eq("member_id", memberToDelete.id);

      if (emergencyError) {
        throw new Error(
          `Could not remove emergency profile: ${emergencyError.message}`
        );
      }

      /*
       * Remove medical records belonging to the member.
       */
      const { error: recordsError } = await supabase
        .from("medical_records")
        .delete()
        .eq("member_id", memberToDelete.id);

      if (recordsError) {
        throw new Error(
          `Could not remove medical records: ${recordsError.message}`
        );
      }

      /*
       * Remove the family member itself.
       */
      const { error: memberError } = await supabase
        .from("family_members")
        .delete()
        .eq("id", memberToDelete.id);

      if (memberError) {
        throw new Error(
          `Could not remove ${memberToDelete.full_name}: ${memberError.message}`
        );
      }

      /*
       * Immediately update the UI.
       */
      setMembers((current) =>
        current.filter(
          (member) => member.id !== memberToDelete.id
        )
      );

      setMemberToDelete(null);
    } catch (err) {
      console.error("Remove member error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to remove this family member."
      );
    } finally {
      setDeletingId("");
    }
  }

  return (
    <main className="min-h-screen bg-medikey-ivory">

      {/* Header */}
      <header className="bg-white border-b border-medikey-border">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">

          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-medikey-mint flex items-center justify-center text-medikey-teal font-bold">
              ♥
            </div>

            <div>
              <p className="font-bold text-medikey-text">
                MediKey
              </p>

              <p className="text-xs text-medikey-muted">
                Family health
              </p>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="text-sm font-semibold text-medikey-teal"
          >
            ← Dashboard
          </Link>

        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 pb-16">

        {/* Heading */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-5">

          <div>
            <p className="text-sm font-semibold text-medikey-teal">
              Family
            </p>

            <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-medikey-text">
              Your family
            </h1>

            <p className="mt-3 text-sm text-medikey-muted max-w-xl leading-6">
              Every person has their own MediKey profile and emergency
              information.
            </p>
          </div>

          <Link
            href="/family/add"
            className="inline-flex items-center justify-center bg-medikey-teal text-white px-5 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition"
          >
            + Add member
          </Link>

        </div>

        {/* Error */}
        {error && (
          <div className="mt-7 bg-white border border-medikey-border rounded-2xl p-5">

            <p className="font-semibold text-medikey-text">
              Something went wrong
            </p>

            <p className="mt-1 text-sm text-medikey-muted">
              {error}
            </p>

            <button
              onClick={loadFamily}
              className="mt-4 text-sm font-bold text-medikey-teal"
            >
              Try again →
            </button>

          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="mt-8 bg-white rounded-3xl border border-medikey-border p-8">

            <div className="animate-pulse">
              <div className="h-5 w-40 bg-medikey-mint rounded mb-3" />
              <div className="h-4 w-64 bg-medikey-ivory rounded" />
            </div>

          </div>
        )}

        {/* Empty */}
        {!loading && !error && members.length === 0 && (
          <div className="mt-8 bg-white rounded-3xl border border-medikey-border p-10 text-center">

            <div className="w-16 h-16 mx-auto rounded-2xl bg-medikey-mint flex items-center justify-center text-medikey-teal text-2xl">
              +
            </div>

            <h2 className="mt-5 text-xl font-bold text-medikey-text">
              No family members yet
            </h2>

            <p className="mt-2 text-sm text-medikey-muted">
              Add someone to create their own MediKey profile.
            </p>

            <Link
              href="/family/add"
              className="inline-block mt-6 bg-medikey-teal text-white px-5 py-3 rounded-xl text-sm font-bold"
            >
              Add family member
            </Link>

          </div>
        )}

        {/* Members */}
        {!loading && members.length > 0 && (
          <div className="mt-8 grid gap-5">

            {members.map((member) => {

              /*
               * The primary account is the member whose
               * relationship is "Self".
               *
               * Other members can be removed.
               */
              const isSelf =
                member.relationship?.toLowerCase() === "self";

              return (
                <div
                  key={member.id}
                  className="bg-white rounded-3xl border border-medikey-border p-6 shadow-sm"
                >

                  {/* Member top */}
                  <div className="flex items-start justify-between gap-4">

                    <Link
                      href={`/profile?member=${member.id}`}
                      className="flex items-center gap-4 min-w-0"
                    >

                      <div className="w-14 h-14 shrink-0 rounded-2xl bg-medikey-mint flex items-center justify-center text-medikey-teal text-xl font-bold">
                        {member.full_name
                          ?.charAt(0)
                          ?.toUpperCase() || "M"}
                      </div>

                      <div className="min-w-0">

                        <h2 className="font-bold text-lg text-medikey-text truncate">
                          {member.full_name}
                        </h2>

                        <p className="mt-1 text-sm text-medikey-muted">
                          {member.relationship || "Family member"}
                        </p>

                        {member.date_of_birth && (
                          <p className="mt-1 text-xs text-medikey-muted">
                            DOB: {member.date_of_birth}
                          </p>
                        )}

                      </div>

                    </Link>

                    {isSelf && (
                      <span className="shrink-0 text-xs font-semibold bg-medikey-mint text-medikey-teal px-3 py-1.5 rounded-full">
                        You
                      </span>
                    )}

                  </div>

                  {/* Actions */}
                  <div className="mt-6 grid sm:grid-cols-2 gap-3">

                    <Link
                      href={`/emergency-profile?member=${member.id}`}
                      className="flex items-center justify-center gap-2 bg-medikey-teal text-white px-4 py-3 rounded-xl text-sm font-bold hover:opacity-90 transition"
                    >
                      <span>♥</span>
                      Emergency profile
                    </Link>

                    <Link
                      href={`/profile?member=${member.id}`}
                      className="flex items-center justify-center gap-2 bg-white border border-medikey-border text-medikey-text px-4 py-3 rounded-xl text-sm font-semibold hover:bg-medikey-ivory transition"
                    >
                      View profile
                      <span>→</span>
                    </Link>

                  </div>

                  {/* Remove button */}
                  {!isSelf && (
                    <div className="mt-4 pt-4 border-t border-medikey-border">

                      <button
                        type="button"
                        onClick={() => setMemberToDelete(member)}
                        className="min-h-[44px] text-sm font-semibold text-medikey-danger hover:opacity-75 transition"
                      >
                        Remove {member.full_name}
                      </button>

                    </div>
                  )}

                </div>
              );
            })}

          </div>
        )}

      </div>

      {/* Confirmation modal */}
      {memberToDelete && (
        <div
          className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm flex items-center justify-center p-5"
          onClick={() => {
            if (!deletingId) {
              setMemberToDelete(null);
            }
          }}
        >

          <div
            className="w-full max-w-md bg-white rounded-3xl border border-medikey-border shadow-2xl p-7"
            onClick={(event) => event.stopPropagation()}
          >

            <div className="w-12 h-12 rounded-2xl bg-medikey-ivory flex items-center justify-center text-medikey-danger text-xl font-bold">
              !
            </div>

            <h2 className="mt-5 text-xl font-bold text-medikey-text">
              Remove family member?
            </h2>

            <p className="mt-2 text-sm text-medikey-muted leading-6">
              You're about to remove{" "}
              <span className="font-semibold text-medikey-text">
                {memberToDelete.full_name}
              </span>{" "}
              from your family.
            </p>

            <p className="mt-3 text-xs text-medikey-muted leading-5">
              Their MediKey profile, emergency information and
              medical records stored in this prototype will also
              be removed.
            </p>

            <div className="mt-7 flex flex-col-reverse sm:flex-row gap-3">

              <button
                type="button"
                disabled={!!deletingId}
                onClick={() => setMemberToDelete(null)}
                className="flex-1 px-5 py-3.5 rounded-xl border border-medikey-border text-sm font-semibold text-medikey-text hover:bg-medikey-ivory transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={!!deletingId}
                onClick={removeMember}
                className="flex-1 px-5 py-3.5 rounded-xl bg-medikey-danger text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50"
              >
                {deletingId
                  ? "Removing..."
                  : "Yes, remove member"}
              </button>

            </div>

          </div>

        </div>
      )}

    </main>
  );
}