"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

export default function AddFamilyMemberPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [dob, setDob] = useState("");
  const [relationship, setRelationship] = useState("Parent");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [familyId, setFamilyId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
        router.replace("/login");
        return;
      }

      /*
       * Find the family owned by the logged-in user.
       *
       * We use limit(1) instead of single() so duplicate
       * family rows cannot crash the page.
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

      const existingFamilyId = families?.[0]?.id;

      if (!existingFamilyId) {
        throw new Error(
          "No family profile was found. Please return to the dashboard and try again."
        );
      }

      setFamilyId(existingFamilyId);
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

  async function handleAddMember() {
    setError("");
    setSuccess("");

    const cleanName = name.trim();

    if (!cleanName) {
      setError("Please enter the family member's full name.");
      return;
    }

    if (cleanName.length < 2) {
      setError("Please enter a valid full name.");
      return;
    }

    if (!familyId) {
      setError("Your family could not be found. Please try again.");
      return;
    }

    setSaving(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw new Error(authError.message);
      }

      if (!user) {
        router.replace("/login");
        return;
      }

      /*
       * Create the family member.
       *
       * user_id is intentionally set to the logged-in account
       * because the current database structure uses it as the
       * account relationship.
       */
      const { data: newMember, error: memberError } =
        await supabase
          .from("family_members")
          .insert({
            family_id: familyId,
            user_id: user.id,
            full_name: cleanName,
            date_of_birth: dob || null,
            relationship: relationship,
          })
          .select("id, full_name, relationship, family_id")
          .maybeSingle();

      if (memberError) {
        console.error("Member insert error:", memberError);

        throw new Error(
          `Could not add family member: ${memberError.message}`
        );
      }

      if (!newMember) {
        throw new Error(
          "The family member was not created. Please try again."
        );
      }

      /*
       * Create an empty emergency profile for the new member.
       */
      const { error: emergencyError } = await supabase
        .from("emergency_profiles")
        .insert({
          member_id: newMember.id,
        });

      /*
       * If the emergency profile already exists, don't treat
       * that as a fatal problem.
       */
      if (
        emergencyError &&
        !emergencyError.message.toLowerCase().includes("duplicate")
      ) {
        console.error("Emergency profile error:", emergencyError);

        throw new Error(
          `Member was created, but the emergency profile could not be created: ${emergencyError.message}`
        );
      }

      setSuccess(`${cleanName} was added successfully.`);

      /*
       * Give the user a moment to see the success message,
       * then return to the family page.
       */
      setTimeout(() => {
        router.push("/family");
        router.refresh();
      }, 700);
    } catch (err) {
      console.error("Add member error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while adding the family member."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-medikey-ivory flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-medikey-mint flex items-center justify-center text-medikey-teal">
            <span className="text-2xl">+</span>
          </div>

          <h1 className="mt-5 text-xl font-bold text-medikey-text">
            Preparing family setup
          </h1>

          <p className="mt-2 text-sm text-medikey-muted">
            Loading your family profile...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-medikey-ivory">

      {/* Header */}
      <header className="bg-white border-b border-medikey-border">
        <div className="max-w-3xl mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">

          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-xl bg-medikey-mint flex items-center justify-center text-medikey-teal">
              <span className="text-lg font-bold">♥</span>
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
            href="/family"
            className="text-sm font-semibold text-medikey-teal hover:opacity-80"
          >
            ← Family
          </Link>

        </div>
      </header>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-5 sm:px-8 py-10 pb-16">

        <div className="mb-8">

          <div className="inline-flex items-center gap-2 rounded-full bg-medikey-mint px-3 py-1.5 text-xs font-bold text-medikey-teal">
            <span>Family</span>
            <span>•</span>
            <span>New member</span>
          </div>

          <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-medikey-text">
            Add a family member
          </h1>

          <p className="mt-3 text-sm sm:text-base text-medikey-muted leading-6 max-w-2xl">
            Create a separate MediKey profile for someone you care
            about. Their emergency information will be managed
            separately from yours.
          </p>

        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 rounded-2xl border border-medikey-border bg-white p-5">

            <div className="flex gap-3">

              <div className="w-9 h-9 shrink-0 rounded-xl bg-medikey-mint flex items-center justify-center text-medikey-danger font-bold">
                !
              </div>

              <div>
                <p className="text-sm font-bold text-medikey-text">
                  We couldn't add the member
                </p>

                <p className="mt-1 text-sm text-medikey-muted leading-6">
                  {error}
                </p>
              </div>

            </div>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="mb-6 rounded-2xl border border-medikey-border bg-medikey-mint p-5">

            <p className="text-sm font-bold text-medikey-text">
              ✓ {success}
            </p>

            <p className="mt-1 text-xs text-medikey-muted">
              Opening your family...
            </p>

          </div>
        )}

        {/* Form */}
        <div className="bg-white border border-medikey-border rounded-3xl shadow-sm overflow-hidden">

          <div className="p-6 sm:p-8">

            <div className="mb-7">
              <h2 className="text-lg font-bold text-medikey-text">
                Basic information
              </h2>

              <p className="mt-1 text-sm text-medikey-muted">
                You can complete their emergency health information later.
              </p>
            </div>

            <div className="space-y-6">

              {/* Name */}
              <div>
                <label
                  htmlFor="member-name"
                  className="block text-sm font-semibold text-medikey-text mb-2"
                >
                  Full name
                </label>

                <input
                  id="member-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  autoComplete="name"
                  disabled={saving}
                  className="w-full px-4 py-3.5 rounded-xl border border-medikey-border bg-white text-medikey-text outline-none transition placeholder:text-medikey-muted/60 focus:border-medikey-teal focus:ring-4 focus:ring-medikey-mint disabled:opacity-60"
                />
              </div>

              {/* Relationship */}
              <div>
                <label
                  htmlFor="relationship"
                  className="block text-sm font-semibold text-medikey-text mb-2"
                >
                  Relationship
                </label>

                <select
                  id="relationship"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  disabled={saving}
                  className="w-full px-4 py-3.5 rounded-xl border border-medikey-border bg-white text-medikey-text outline-none transition focus:border-medikey-teal focus:ring-4 focus:ring-medikey-mint disabled:opacity-60"
                >
                  <option value="Parent">Parent</option>
                  <option value="Child">Child</option>
                  <option value="Partner">Partner</option>
                  <option value="Sibling">Sibling</option>
                  <option value="Grandparent">Grandparent</option>
                  <option value="Grandchild">Grandchild</option>
                  <option value="Spouse">Spouse</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* DOB */}
              <div>
                <label
                  htmlFor="date-of-birth"
                  className="block text-sm font-semibold text-medikey-text mb-2"
                >
                  Date of birth
                  <span className="ml-2 text-xs font-normal text-medikey-muted">
                    Optional
                  </span>
                </label>

                <input
                  id="date-of-birth"
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  disabled={saving}
                  className="w-full px-4 py-3.5 rounded-xl border border-medikey-border bg-white text-medikey-text outline-none transition focus:border-medikey-teal focus:ring-4 focus:ring-medikey-mint disabled:opacity-60"
                />
              </div>

            </div>

            {/* Info */}
            <div className="mt-8 rounded-2xl bg-medikey-ivory border border-medikey-border p-5">

              <div className="flex gap-3">

                <div className="w-9 h-9 shrink-0 rounded-xl bg-medikey-mint flex items-center justify-center text-medikey-teal font-bold">
                  i
                </div>

                <div>
                  <p className="text-sm font-bold text-medikey-text">
                    What's next?
                  </p>

                  <p className="mt-1 text-xs text-medikey-muted leading-5">
                    After adding this person, you can open their profile
                    and add emergency information such as blood group,
                    allergies, critical medications and emergency contacts.
                  </p>
                </div>

              </div>

            </div>

          </div>

          {/* Footer */}
          <div className="px-6 sm:px-8 py-5 bg-medikey-ivory border-t border-medikey-border flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">

            <Link
              href="/family"
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-medikey-border bg-white text-center text-sm font-semibold text-medikey-text hover:bg-medikey-mint/30 transition"
            >
              Cancel
            </Link>

            <button
              type="button"
              onClick={handleAddMember}
              disabled={saving || !familyId}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-medikey-teal text-white text-sm font-bold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Adding member..." : "Add family member"}
            </button>

          </div>

        </div>

      </div>
    </main>
  );
}