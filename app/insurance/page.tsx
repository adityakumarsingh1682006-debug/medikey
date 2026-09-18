"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type Member = {
  id: string;
  full_name: string;
  relationship: string | null;
  photo_url: string | null;
};

type InsurancePolicy = {
  id: string;
  member_id: string;
  provider_name: string;
  policy_number: string;
  policy_type: string;
  policy_holder_name: string;
  coverage_amount: number | null;
  valid_from: string | null;
  valid_until: string | null;
  customer_care_phone: string | null;
  document_path: string | null;
  created_at: string;
};

type FormState = {
  provider_name: string;
  policy_number: string;
  policy_type: string;
  policy_holder_name: string;
  coverage_amount: string;
  valid_from: string;
  valid_until: string;
  customer_care_phone: string;
};

const EMPTY_FORM: FormState = {
  provider_name: "",
  policy_number: "",
  policy_type: "Health Insurance",
  policy_holder_name: "",
  coverage_amount: "",
  valid_from: "",
  valid_until: "",
  customer_care_phone: "",
};

const POLICY_TYPES = [
  "Health Insurance",
  "Personal Accident",
  "Employer Insurance",
  "Family Floater",
  "Other",
];

export default function InsurancePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const [policies, setPolicies] = useState<InsurancePolicy[]>([]);

  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] =
    useState<InsurancePolicy | null>(null);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const selectedMember = useMemo(
    () => members.find((member) => member.id === selectedMemberId) ?? null,
    [members, selectedMemberId]
  );

  useEffect(() => {
    loadPage();
  }, []);

  useEffect(() => {
    if (selectedMemberId) {
      loadPolicies(selectedMemberId);
    }
  }, [selectedMemberId]);

  async function loadPage() {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: family, error: familyError } = await supabase
        .from("families")
        .select("id")
        .eq("owner_id", user.id)
        .limit(1)
        .maybeSingle();

      if (familyError) throw familyError;

      if (!family) {
        setMembers([]);
        setLoading(false);
        return;
      }

      const { data: memberRows, error: membersError } = await supabase
        .from("family_members")
        .select("id, full_name, relationship, photo_url")
        .eq("family_id", family.id)
        .order("created_at", { ascending: true });

      if (membersError) throw membersError;

      const loadedMembers = (memberRows ?? []) as Member[];

      setMembers(loadedMembers);

      const self =
        loadedMembers.find(
          (member) =>
            (member.relationship ?? "").trim().toLowerCase() === "self"
        ) ?? loadedMembers[0];

      if (self) {
        setSelectedMemberId(self.id);
      }
    } catch (err) {
      console.error(err);
      setError("We couldn't load your insurance information.");
    } finally {
      setLoading(false);
    }
  }

  async function loadPolicies(memberId: string) {
    setError("");

    const { data, error: policiesError } = await supabase
      .from("insurance_policies")
      .select(
        `
        id,
        member_id,
        provider_name,
        policy_number,
        policy_type,
        policy_holder_name,
        coverage_amount,
        valid_from,
        valid_until,
        customer_care_phone,
        document_path,
        created_at
      `
      )
      .eq("member_id", memberId)
      .order("created_at", { ascending: false });

    if (policiesError) {
      console.error(policiesError);
      setError("Couldn't load insurance policies.");
      return;
    }

    setPolicies((data ?? []) as InsurancePolicy[]);
  }

  function openAddModal() {
    setEditingPolicy(null);

    setForm({
      ...EMPTY_FORM,
      policy_holder_name: selectedMember?.full_name ?? "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function openEditModal(policy: InsurancePolicy) {
    setEditingPolicy(policy);

    setForm({
      provider_name: policy.provider_name ?? "",
      policy_number: policy.policy_number ?? "",
      policy_type: policy.policy_type ?? "Health Insurance",
      policy_holder_name: policy.policy_holder_name ?? "",
      coverage_amount:
        policy.coverage_amount !== null
          ? String(policy.coverage_amount)
          : "",
      valid_from: policy.valid_from ?? "",
      valid_until: policy.valid_until ?? "",
      customer_care_phone: policy.customer_care_phone ?? "",
    });

    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setEditingPolicy(null);
    setForm(EMPTY_FORM);
  }

  function updateForm<K extends keyof FormState>(
    key: K,
    value: FormState[K]
  ) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function savePolicy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!selectedMemberId) {
      setError("Please select a family member first.");
      return;
    }

    if (!form.provider_name.trim()) {
      setError("Please enter the insurance provider.");
      return;
    }

    if (!form.policy_number.trim()) {
      setError("Please enter the policy number.");
      return;
    }

    if (!form.policy_holder_name.trim()) {
      setError("Please enter the policy holder name.");
      return;
    }

    if (
      form.valid_from &&
      form.valid_until &&
      form.valid_until < form.valid_from
    ) {
      setError("The valid-until date cannot be before the start date.");
      return;
    }

    const phone = form.customer_care_phone.replace(/\D/g, "");

    if (form.customer_care_phone && phone.length < 7) {
      setError("Please enter a valid customer-care phone number.");
      return;
    }

    const coverage =
      form.coverage_amount.trim() !== ""
        ? Number(form.coverage_amount)
        : null;

    if (
      form.coverage_amount.trim() !== "" &&
      (!Number.isFinite(coverage) || Number(coverage) < 0)
    ) {
      setError("Please enter a valid coverage amount.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        member_id: selectedMemberId,
        provider_name: form.provider_name.trim(),
        policy_number: form.policy_number.trim(),
        policy_type: form.policy_type,
        policy_holder_name: form.policy_holder_name.trim(),
        coverage_amount: coverage,
        valid_from: form.valid_from || null,
        valid_until: form.valid_until || null,
        customer_care_phone: phone || null,
      };

      if (editingPolicy) {
        const { error: updateError } = await supabase
          .from("insurance_policies")
          .update(payload)
          .eq("id", editingPolicy.id);

        if (updateError) throw updateError;

        setSuccess("Insurance policy updated successfully.");
      } else {
        const { error: insertError } = await supabase
          .from("insurance_policies")
          .insert(payload);

        if (insertError) throw insertError;

        setSuccess("Insurance policy added successfully.");
      }

      await loadPolicies(selectedMemberId);

      setShowModal(false);
      setEditingPolicy(null);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error(err);
      setError("We couldn't save the insurance policy. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePolicy(policy: InsurancePolicy) {
    const confirmed = window.confirm(
      `Delete the ${policy.provider_name} insurance policy? This cannot be undone.`
    );

    if (!confirmed) return;

    setDeleting(policy.id);
    setError("");
    setSuccess("");

    try {
      const { error: deleteError } = await supabase
        .from("insurance_policies")
        .delete()
        .eq("id", policy.id);

      if (deleteError) throw deleteError;

      setPolicies((current) =>
        current.filter((item) => item.id !== policy.id)
      );

      setSuccess("Insurance policy deleted.");
    } catch (err) {
      console.error(err);
      setError("We couldn't delete that policy.");
    } finally {
      setDeleting(null);
    }
  }

  function getPolicyStatus(policy: InsurancePolicy) {
    if (!policy.valid_until) {
      return {
        label: "Validity not specified",
        type: "neutral",
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const expiry = new Date(`${policy.valid_until}T00:00:00`);

    if (expiry < today) {
      return {
        label: "Expired",
        type: "expired",
      };
    }

    const difference =
      expiry.getTime() - today.getTime();

    const days = Math.ceil(
      difference / (1000 * 60 * 60 * 24)
    );

    if (days <= 30) {
      return {
        label: `Expires in ${days} day${days === 1 ? "" : "s"}`,
        type: "warning",
      };
    }

    return {
      label: "Active",
      type: "active",
    };
  }

  function formatDate(value: string | null) {
    if (!value) return "Not specified";

    const date = new Date(`${value}T00:00:00`);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  function formatCoverage(value: number | null) {
    if (value === null || value === undefined) {
      return "Coverage not specified";
    }

    return `₹${Number(value).toLocaleString("en-IN")}`;
  }

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <main className="min-h-screen bg-[#F7FAF8] text-[#19302F]">
      <div className="flex min-h-screen">
        <aside className="hidden w-[250px] shrink-0 border-r border-[#DFE9E6] bg-white lg:flex lg:flex-col">
          <Sidebar />
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-[#DFE9E6]/80 bg-[#F7FAF8]/95 backdrop-blur-xl">
            <div className="mx-auto flex max-w-[1200px] items-center justify-between px-5 py-4 sm:px-8">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#667A78]">
                  Family protection
                </p>
                <h1 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
                  Insurance
                </h1>
              </div>

              <Link
                href="/dashboard"
                className="rounded-xl border border-[#DFE9E6] bg-white px-4 py-2.5 text-sm font-semibold text-[#176B67] shadow-sm transition hover:border-[#7BAE9D] hover:bg-[#E6F3EF]"
              >
                Dashboard
              </Link>
            </div>
          </header>

          <div className="mx-auto max-w-[1200px] px-5 py-7 pb-28 sm:px-8 sm:py-9 lg:pb-10">
            {error && (
              <Alert
                type="error"
                message={error}
                onClose={() => setError("")}
              />
            )}

            {success && (
              <Alert
                type="success"
                message={success}
                onClose={() => setSuccess("")}
              />
            )}

            <section className="mb-7 overflow-hidden rounded-[24px] border border-[#DFE9E6] bg-white shadow-[0_12px_40px_rgba(25,48,47,0.06)]">
              <div className="relative overflow-hidden p-6 sm:p-8">
                <div className="absolute -right-16 -top-20 h-48 w-48 rounded-full bg-[#E6F3EF]" />
                <div className="absolute -bottom-24 right-24 h-40 w-40 rounded-full bg-[#F0F7F4]" />

                <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="max-w-2xl">
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E6F3EF] text-[#176B67]">
                      <ShieldIcon />
                    </div>

                    <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                      Keep insurance information in one secure place.
                    </h2>

                    <p className="mt-3 max-w-xl text-sm leading-6 text-[#667A78] sm:text-base">
                      Store policy details for each family member so
                      important information is easy to find when you need
                      it.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#DFE9E6] bg-[#F7FAF8] p-4 md:max-w-[270px]">
                    <div className="flex items-start gap-3">
                      <LockIcon />
                      <div>
                        <p className="text-sm font-bold">
                          Private by default
                        </p>
                        <p className="mt-1 text-xs leading-5 text-[#667A78]">
                          Policy numbers and documents aren't displayed on
                          the public emergency QR page.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {members.length === 0 ? (
              <EmptyMembers />
            ) : (
              <>
                <section className="mb-7">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <h2 className="text-base font-bold">
                        Select family member
                      </h2>
                      <p className="mt-1 text-sm text-[#667A78]">
                        Insurance policies are stored separately for each
                        person.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {members.map((member) => {
                      const selected =
                        member.id === selectedMemberId;

                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() =>
                            setSelectedMemberId(member.id)
                          }
                          className={`flex min-w-[190px] shrink-0 items-center gap-3 rounded-2xl border p-3 text-left transition ${
                            selected
                              ? "border-[#176B67] bg-[#E6F3EF] shadow-sm"
                              : "border-[#DFE9E6] bg-white hover:border-[#7BAE9D]"
                          }`}
                        >
                          {member.photo_url ? (
                            <img
                              src={member.photo_url}
                              alt=""
                              className="h-11 w-11 rounded-xl object-cover"
                            />
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E6F3EF] text-sm font-bold text-[#176B67]">
                              {getInitials(member.full_name)}
                            </div>
                          )}

                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">
                              {member.full_name}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-[#667A78]">
                              {member.relationship || "Family member"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                <section>
                  <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#667A78]">
                        {selectedMember?.full_name}
                      </p>
                      <h2 className="mt-1 text-xl font-bold">
                        Insurance policies
                      </h2>
                    </div>

                    <button
                      type="button"
                      onClick={openAddModal}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#176B67] px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-[#125955]"
                    >
                      <PlusIcon />
                      Add insurance
                    </button>
                  </div>

                  {policies.length === 0 ? (
                    <EmptyPolicies onAdd={openAddModal} />
                  ) : (
                    <div className="grid gap-4 lg:grid-cols-2">
                      {policies.map((policy) => {
                        const status = getPolicyStatus(policy);

                        return (
                          <PolicyCard
                            key={policy.id}
                            policy={policy}
                            status={status}
                            onEdit={() => openEditModal(policy)}
                            onDelete={() => deletePolicy(policy)}
                            deleting={deleting === policy.id}
                            formatDate={formatDate}
                            formatCoverage={formatCoverage}
                          />
                        );
                      })}
                    </div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </div>

      <MobileNav />

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#19302F]/35 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <div className="max-h-[94vh] w-full overflow-y-auto rounded-t-[28px] bg-white shadow-2xl sm:max-w-[680px] sm:rounded-[28px]">
            <div className="sticky top-0 z-10 border-b border-[#DFE9E6] bg-white/95 px-5 py-4 backdrop-blur sm:px-7">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#667A78]">
                    {editingPolicy ? "Update policy" : "New policy"}
                  </p>
                  <h2 className="mt-1 text-xl font-bold">
                    {editingPolicy
                      ? "Edit insurance"
                      : "Add insurance"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DFE9E6] text-[#667A78] transition hover:bg-[#F7FAF8]"
                  aria-label="Close"
                >
                  <CloseIcon />
                </button>
              </div>
            </div>

            <form onSubmit={savePolicy} className="space-y-5 p-5 sm:p-7">
              <div className="rounded-2xl bg-[#F7FAF8] p-4">
                <div className="flex items-center gap-3">
                  {selectedMember?.photo_url ? (
                    <img
                      src={selectedMember.photo_url}
                      alt=""
                      className="h-12 w-12 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#E6F3EF] font-bold text-[#176B67]">
                      {getInitials(
                        selectedMember?.full_name || "M"
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-[#667A78]">
                      Policy for
                    </p>
                    <p className="font-bold">
                      {selectedMember?.full_name}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Insurance provider"
                  value={form.provider_name}
                  onChange={(value) =>
                    updateForm("provider_name", value)
                  }
                  placeholder="e.g. Star Health"
                  required
                />

                <Field
                  label="Policy number"
                  value={form.policy_number}
                  onChange={(value) =>
                    updateForm("policy_number", value)
                  }
                  placeholder="Enter policy number"
                  required
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <SelectField
                  label="Policy type"
                  value={form.policy_type}
                  onChange={(value) =>
                    updateForm("policy_type", value)
                  }
                  options={POLICY_TYPES}
                />

                <Field
                  label="Policy holder name"
                  value={form.policy_holder_name}
                  onChange={(value) =>
                    updateForm("policy_holder_name", value)
                  }
                  placeholder="Full name"
                  required
                />
              </div>

              <Field
                label="Coverage amount"
                value={form.coverage_amount}
                onChange={(value) =>
                  updateForm("coverage_amount", value)
                }
                placeholder="e.g. 500000"
                type="number"
                min="0"
                prefix="₹"
                hint="Optional"
              />

              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Valid from"
                  value={form.valid_from}
                  onChange={(value) =>
                    updateForm("valid_from", value)
                  }
                  type="date"
                />

                <Field
                  label="Valid until"
                  value={form.valid_until}
                  onChange={(value) =>
                    updateForm("valid_until", value)
                  }
                  type="date"
                />
              </div>

              <Field
                label="Customer-care phone"
                value={form.customer_care_phone}
                onChange={(value) =>
                  updateForm("customer_care_phone", value)
                }
                placeholder="e.g. 1800 123 4567"
                type="tel"
                hint="Optional"
              />

              <div className="rounded-2xl border border-[#DFE9E6] bg-[#F7FAF8] p-4">
                <div className="flex items-start gap-3">
                  <InfoIcon />
                  <div>
                    <p className="text-sm font-bold">
                      Privacy reminder
                    </p>
                    <p className="mt-1 text-xs leading-5 text-[#667A78]">
                      Insurance details are private account information.
                      They won't be shown as full policy data on the
                      public emergency QR screen.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-[#DFE9E6] px-5 py-3 text-sm font-bold text-[#19302F] transition hover:bg-[#F7FAF8]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-xl bg-[#176B67] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#125955] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingPolicy
                    ? "Save changes"
                    : "Add insurance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}

/* =========================================================
   POLICY CARD
========================================================= */

function PolicyCard({
  policy,
  status,
  onEdit,
  onDelete,
  deleting,
  formatDate,
  formatCoverage,
}: {
  policy: InsurancePolicy;
  status: {
    label: string;
    type: string;
  };
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
  formatDate: (value: string | null) => string;
  formatCoverage: (value: number | null) => string;
}) {
  return (
    <article className="rounded-[22px] border border-[#DFE9E6] bg-white p-5 shadow-[0_8px_30px_rgba(25,48,47,0.05)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_35px_rgba(25,48,47,0.08)] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#E6F3EF] text-[#176B67]">
            <ShieldIcon />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-base font-bold">
              {policy.provider_name}
            </h3>
            <p className="mt-0.5 text-xs text-[#667A78]">
              {policy.policy_type}
            </p>
          </div>
        </div>

        <StatusBadge type={status.type}>
          {status.label}
        </StatusBadge>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <InfoItem
          label="Policy number"
          value={maskPolicyNumber(policy.policy_number)}
        />

        <InfoItem
          label="Coverage"
          value={formatCoverage(policy.coverage_amount)}
        />

        <InfoItem
          label="Valid from"
          value={formatDate(policy.valid_from)}
        />

        <InfoItem
          label="Valid until"
          value={formatDate(policy.valid_until)}
        />
      </div>

      <div className="mt-5 border-t border-[#DFE9E6] pt-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#667A78]">
              Policy holder
            </p>
            <p className="mt-1 text-sm font-semibold">
              {policy.policy_holder_name}
            </p>
          </div>

          {policy.customer_care_phone && (
            <a
              href={`tel:${policy.customer_care_phone}`}
              className="rounded-xl border border-[#DFE9E6] px-3 py-2 text-xs font-bold text-[#176B67] transition hover:bg-[#E6F3EF]"
            >
              Call support
            </a>
          )}
        </div>
      </div>

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onEdit}
          className="flex-1 rounded-xl border border-[#DFE9E6] px-4 py-2.5 text-sm font-bold transition hover:bg-[#F7FAF8]"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          className="rounded-xl border border-[#F0D9DC] px-4 py-2.5 text-sm font-bold text-[#C93C4B] transition hover:bg-[#FFF5F6] disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </article>
  );
}

/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar() {
  return (
    <div className="flex h-full flex-col p-5">
      <Link href="/dashboard" className="mb-8 flex items-center gap-3">
        <Logo />
        <div>
          <p className="text-[17px] font-black tracking-tight">
            Medi Key
          </p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#667A78]">
            Health identity
          </p>
        </div>
      </Link>

      <nav className="space-y-1.5">
        <NavItem href="/dashboard" label="Home" icon={<HomeIcon />} />
        <NavItem href="/family" label="Family" icon={<FamilyIcon />} />
        <NavItem href="/records" label="Records" icon={<RecordsIcon />} />
        <NavItem
          href="/insurance"
          label="Insurance"
          icon={<ShieldIcon />}
          active
        />
        <NavItem
          href="/security"
          label="Security"
          icon={<SecurityIcon />}
        />
        <NavItem
          href="/profile"
          label="Profile"
          icon={<ProfileIcon />}
        />
      </nav>

      <div className="mt-auto rounded-2xl bg-[#F7FAF8] p-4">
        <div className="flex items-center gap-2 text-[#176B67]">
          <LockIcon />
          <span className="text-xs font-bold">
            Your data stays private
          </span>
        </div>

        <p className="mt-2 text-[11px] leading-5 text-[#667A78]">
          Medi Key keeps sensitive personal information behind your
          authenticated account.
        </p>
      </div>
    </div>
  );
}

function NavItem({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-[#E6F3EF] text-[#176B67]"
          : "text-[#667A78] hover:bg-[#F7FAF8] hover:text-[#19302F]"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

/* =========================================================
   MOBILE NAV
========================================================= */

function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#DFE9E6] bg-white/95 px-2 py-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around">
        <MobileNavItem href="/dashboard" label="Home" icon={<HomeIcon />} />
        <MobileNavItem href="/family" label="Family" icon={<FamilyIcon />} />
        <MobileNavItem href="/records" label="Records" icon={<RecordsIcon />} />
        <MobileNavItem
          href="/insurance"
          label="Insurance"
          icon={<ShieldIcon />}
          active
        />
        <MobileNavItem
          href="/profile"
          label="Profile"
          icon={<ProfileIcon />}
        />
      </div>
    </nav>
  );
}

function MobileNavItem({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex min-w-[62px] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-bold ${
        active ? "text-[#176B67]" : "text-[#667A78]"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

/* =========================================================
   EMPTY STATES
========================================================= */

function EmptyMembers() {
  return (
    <div className="rounded-[24px] border border-[#DFE9E6] bg-white p-8 text-center shadow-sm">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#E6F3EF] text-[#176B67]">
        <FamilyIcon />
      </div>

      <h2 className="mt-4 text-lg font-bold">
        No family members yet
      </h2>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667A78]">
        Add a family member first, then you can store their insurance
        information here.
      </p>

      <Link
        href="/family/add"
        className="mt-5 inline-flex rounded-xl bg-[#176B67] px-5 py-3 text-sm font-bold text-white"
      >
        Add family member
      </Link>
    </div>
  );
}

function EmptyPolicies({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="rounded-[24px] border border-dashed border-[#C9DCD7] bg-white p-8 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F7FAF8] text-[#176B67]">
        <ShieldIcon />
      </div>

      <h3 className="mt-4 text-lg font-bold">
        No insurance added
      </h3>

      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#667A78]">
        Add a health or other insurance policy for this family member.
      </p>

      <button
        type="button"
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#176B67] px-5 py-3 text-sm font-bold text-white"
      >
        <PlusIcon />
        Add insurance
      </button>
    </div>
  );
}

/* =========================================================
   FORM COMPONENTS
========================================================= */

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  hint,
  min,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  hint?: string;
  min?: string;
  prefix?: string;
}) {
  return (
    <label className="block">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="text-sm font-bold">
          {label}
          {required && <span className="ml-1 text-[#C93C4B]">*</span>}
        </span>

        {hint && (
          <span className="text-[11px] font-medium text-[#667A78]">
            {hint}
          </span>
        )}
      </div>

      <div className="relative">
        {prefix && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#667A78]">
            {prefix}
          </span>
        )}

        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          required={required}
          min={min}
          className={`w-full rounded-xl border border-[#DFE9E6] bg-white px-4 py-3 text-sm outline-none transition placeholder:text-[#A0AFAD] focus:border-[#176B67] focus:ring-4 focus:ring-[#E6F3EF] ${
            prefix ? "pl-9" : ""
          }`}
        />
      </div>
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold">
        {label}
      </span>

      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#DFE9E6] bg-white px-4 py-3 text-sm outline-none transition focus:border-[#176B67] focus:ring-4 focus:ring-[#E6F3EF]"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-[#F7FAF8] p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-[#667A78]">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold">
        {value}
      </p>
    </div>
  );
}

function StatusBadge({
  type,
  children,
}: {
  type: string;
  children: React.ReactNode;
}) {
  const classes =
    type === "active"
      ? "bg-[#E6F3EF] text-[#176B67]"
      : type === "warning"
      ? "bg-[#FFF5DF] text-[#A36D12]"
      : type === "expired"
      ? "bg-[#FFF0F2] text-[#C93C4B]"
      : "bg-[#F0F3F2] text-[#667A78]";

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${classes}`}
    >
      {children}
    </span>
  );
}

/* =========================================================
   ALERTS
========================================================= */

function Alert({
  type,
  message,
  onClose,
}: {
  type: "error" | "success";
  message: string;
  onClose: () => void;
}) {
  return (
    <div
      className={`mb-5 flex items-start justify-between gap-4 rounded-2xl border p-4 ${
        type === "error"
          ? "border-[#F0D9DC] bg-[#FFF5F6] text-[#8E2633]"
          : "border-[#CFE5DE] bg-[#EFF9F5] text-[#176B67]"
      }`}
    >
      <div className="flex items-start gap-3">
        {type === "error" ? <AlertIcon /> : <CheckIcon />}
        <p className="text-sm font-semibold">{message}</p>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="opacity-60 transition hover:opacity-100"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

/* =========================================================
   LOADING
========================================================= */

function LoadingScreen() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F7FAF8] px-5">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-2xl bg-[#E6F3EF] text-[#176B67]">
          <ShieldIcon />
        </div>

        <p className="mt-4 text-sm font-semibold text-[#667A78]">
          Loading insurance...
        </p>
      </div>
    </main>
  );
}

/* =========================================================
   HELPERS
========================================================= */

function getInitials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "MK"
  );
}

function maskPolicyNumber(value: string) {
  const clean = value.trim();

  if (clean.length <= 4) {
    return "••••";
  }

  return `${"•".repeat(Math.min(clean.length - 4, 8))}${clean.slice(
    -4
  )}`;
}

/* =========================================================
   LOGO
========================================================= */

function Logo() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#176B67] text-white shadow-sm">
      <HeartIcon />
    </div>
  );
}

/* =========================================================
   ICONS
========================================================= */

function Icon({
  children,
  size = 19,
}: {
  children: React.ReactNode;
  size?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

function ShieldIcon() {
  return (
    <Icon>
      <path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6l8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </Icon>
  );
}

function LockIcon() {
  return (
    <Icon size={17}>
      <rect x="5" y="10" width="14" height="10" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Icon>
  );
}

function InfoIcon() {
  return (
    <Icon size={18}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </Icon>
  );
}

function PlusIcon() {
  return (
    <Icon size={17}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </Icon>
  );
}

function CloseIcon() {
  return (
    <Icon size={18}>
      <path d="m6 6 12 12" />
      <path d="m18 6-12 12" />
    </Icon>
  );
}

function CheckIcon() {
  return (
    <Icon size={18}>
      <path d="m5 12 4 4L19 6" />
    </Icon>
  );
}

function AlertIcon() {
  return (
    <Icon size={18}>
      <path d="M12 3 2.8 19h18.4L12 3Z" />
      <path d="M12 9v4" />
      <path d="M12 16h.01" />
    </Icon>
  );
}

function HeartIcon() {
  return (
    <Icon size={19}>
      <path d="M20.8 8.8c0 5.2-8.8 10.2-8.8 10.2S3.2 14 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z" />
      <path d="M5 11h3l1.3-2.5L11 14l1.5-3H16" />
    </Icon>
  );
}

function HomeIcon() {
  return (
    <Icon size={18}>
      <path d="m3 10 9-7 9 7" />
      <path d="M5 9v11h14V9" />
      <path d="M9 20v-6h6v6" />
    </Icon>
  );
}

function FamilyIcon() {
  return (
    <Icon size={18}>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M3.5 19c.6-3.2 2.4-5 5.5-5s4.9 1.8 5.5 5" />
      <path d="M14 15c2.8-.3 5 1 5.5 4" />
    </Icon>
  );
}

function RecordsIcon() {
  return (
    <Icon size={18}>
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6" />
      <path d="M9 16h5" />
    </Icon>
  );
}

function SecurityIcon() {
  return (
    <Icon size={18}>
      <path d="M12 3 19 6v5c0 4.5-3 7.7-7 9-4-1.3-7-4.5-7-9V6l7-3Z" />
      <path d="M9 12h6" />
    </Icon>
  );
}

function ProfileIcon() {
  return (
    <Icon size={18}>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 20c.8-4 3.1-6 7-6s6.2 2 7 6" />
    </Icon>
  );
}