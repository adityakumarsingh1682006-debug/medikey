"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type RecordItem = {
  id: string;
  title: string;
  record_type: string | null;
  file_path: string | null;
  record_date: string | null;
  created_at: string | null;
};

type Member = {
  id: string;
  full_name: string;
  relationship: string | null;
};

const RECORD_TYPES = [
  "Prescription",
  "Lab Report",
  "Scan / Imaging",
  "Discharge Summary",
  "Medical Certificate",
  "Other",
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export default function RecordsPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedMember, setSelectedMember] =
    useState<Member | null>(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [showUpload, setShowUpload] = useState(false);
  const [selectedRecord, setSelectedRecord] =
    useState<RecordItem | null>(null);

  const [title, setTitle] = useState("");
  const [recordType, setRecordType] =
    useState("Prescription");
  const [recordDate, setRecordDate] = useState("");
  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    loadPage();
  }, []);

  async function loadPage() {
    setLoading(true);
    setError("");

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

      const {
        data: memberData,
        error: memberError,
      } = await supabase
        .from("family_members")
        .select("id, full_name, relationship")
        .eq("user_id", user.id)
        .order("created_at", {
          ascending: true,
        });

      if (memberError) {
        throw memberError;
      }

      const loadedMembers =
        (memberData || []) as Member[];

      setMembers(loadedMembers);

      if (loadedMembers.length === 0) {
        setSelectedMember(null);
        setRecords([]);
        return;
      }

      const self =
        loadedMembers.find(
          (member) =>
            member.relationship?.toLowerCase() ===
            "self"
        );

      const member = self || loadedMembers[0];

      setSelectedMember(member);

      await loadRecords(member.id);
    } catch (err) {
      console.error(err);
      setError(
        "We couldn't load your medical records."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadRecords(memberId: string) {
    const {
      data,
      error: recordsError,
    } = await supabase
      .from("medical_records")
      .select(
        `
        id,
        title,
        record_type,
        file_path,
        record_date,
        created_at
        `
      )
      .eq("member_id", memberId)
      .order("record_date", {
        ascending: false,
        nullsFirst: false,
      });

    if (recordsError) {
      throw recordsError;
    }

    setRecords(
      (data || []) as RecordItem[]
    );
  }

  async function changeMember(
    memberId: string
  ) {
    const member =
      members.find(
        (item) => item.id === memberId
      );

    if (!member) return;

    setSelectedMember(member);
    setError("");
    setMessage("");

    try {
      await loadRecords(member.id);
    } catch (err) {
      console.error(err);

      setError(
        "Couldn't load records for this family member."
      );
    }
  }

  function resetUploadForm() {
    setTitle("");
    setRecordType("Prescription");
    setRecordDate("");
    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function closeUpload() {
    if (uploading) return;

    setShowUpload(false);
    resetUploadForm();
  }

  function handleFileChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setError("");
    setMessage("");

    const file =
      event.target.files?.[0];

    if (!file) {
      setSelectedFile(null);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setSelectedFile(null);

      event.target.value = "";

      setError(
        "File is too large. Maximum size is 10 MB."
      );

      return;
    }

    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setSelectedFile(null);

      event.target.value = "";

      setError(
        "Please upload a PDF, JPG, PNG, or WebP file."
      );

      return;
    }

    setSelectedFile(file);
  }

  async function uploadRecord() {
    if (!selectedMember) {
      setError(
        "Please select a family member first."
      );
      return;
    }

    if (!title.trim()) {
      setError(
        "Please enter a title for the record."
      );
      return;
    }

    if (!selectedFile) {
      setError(
        "Please choose a medical document."
      );
      return;
    }

    setUploading(true);
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

      const extension =
        selectedFile.name
          .split(".")
          .pop()
          ?.toLowerCase() || "file";

      const safeName =
        selectedFile.name
          .replace(
            /[^a-zA-Z0-9._-]/g,
            "-"
          )
          .slice(0, 80);

      const filePath =
        `${user.id}/${selectedMember.id}/${Date.now()}-${safeName}`;

      /*
       * IMPORTANT:
       * The bucket name must be exactly:
       * medical-records
       */
      const {
        error: uploadError,
      } = await supabase.storage
        .from("medical-records")
        .upload(
          filePath,
          selectedFile,
          {
            cacheControl: "3600",
            upsert: false,
            contentType:
              selectedFile.type,
          }
        );

      if (uploadError) {
        throw uploadError;
      }

      const {
        data: insertedRecord,
        error: insertError,
      } = await supabase
        .from("medical_records")
        .insert({
          member_id:
            selectedMember.id,
          title: title.trim(),
          record_type: recordType,
          file_path: filePath,
          record_date:
            recordDate || null,
        })
        .select(
          `
          id,
          title,
          record_type,
          file_path,
          record_date,
          created_at
          `
        )
        .single();

      if (insertError) {
        // If database insertion fails,
        // remove the uploaded file.
        await supabase.storage
          .from("medical-records")
          .remove([filePath]);

        throw insertError;
      }

      setRecords((current) => [
        insertedRecord as RecordItem,
        ...current,
      ]);

      setShowUpload(false);
      resetUploadForm();

      setMessage(
        "Medical record uploaded successfully."
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "We couldn't upload the medical record."
      );
    } finally {
      setUploading(false);
    }
  }

  async function openRecord(
    record: RecordItem
  ) {
    if (!record.file_path) {
      setError(
        "This record doesn't have a file attached."
      );
      return;
    }

    setError("");

    try {
      const {
        data,
        error: signedError,
      } = await supabase.storage
        .from("medical-records")
        .createSignedUrl(
          record.file_path,
          60 * 10
        );

      if (signedError) {
        throw signedError;
      }

      if (!data?.signedUrl) {
        throw new Error(
          "Unable to create a secure document link."
        );
      }

      window.open(
        data.signedUrl,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (err) {
      console.error(err);

      setError(
        "We couldn't open this medical record."
      );
    }
  }

  async function deleteRecord(
    record: RecordItem
  ) {
    const confirmed =
      window.confirm(
        `Delete "${record.title}"? This cannot be undone.`
      );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      if (record.file_path) {
        const {
          error: storageError,
        } = await supabase.storage
          .from("medical-records")
          .remove([
            record.file_path,
          ]);

        if (storageError) {
          console.warn(
            "Storage deletion warning:",
            storageError
          );
        }
      }

      const {
        error: deleteError,
      } = await supabase
        .from("medical_records")
        .delete()
        .eq("id", record.id);

      if (deleteError) {
        throw deleteError;
      }

      setRecords((current) =>
        current.filter(
          (item) =>
            item.id !== record.id
        )
      );

      setSelectedRecord(null);

      setMessage(
        "Medical record deleted."
      );
    } catch (err) {
      console.error(err);

      setError(
        "We couldn't delete this record."
      );
    }
  }

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "Date not specified";
    }

    const parsed =
      new Date(`${date}T00:00:00`);

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
        day: "numeric",
        month: "short",
        year: "numeric",
      }
    );
  }

  function getRecordIcon(
    type: string | null
  ) {
    if (
      type
        ?.toLowerCase()
        .includes("lab")
    ) {
      return "⌁";
    }

    if (
      type
        ?.toLowerCase()
        .includes("scan")
    ) {
      return "⌗";
    }

    if (
      type
        ?.toLowerCase()
        .includes("prescription")
    ) {
      return "✚";
    }

    if (
      type
        ?.toLowerCase()
        .includes("discharge")
    ) {
      return "✓";
    }

    return "▤";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-medikey-ivory">
        <div className="mx-auto max-w-5xl px-5 py-10">

          <div className="h-8 w-56 animate-pulse rounded-lg bg-[#E4EEEB]" />

          <div className="mt-3 h-4 w-80 animate-pulse rounded bg-[#E4EEEB]" />

          <div className="mt-8 h-36 animate-pulse rounded-3xl bg-[#E4EEEB]" />

          <div className="mt-5 h-32 animate-pulse rounded-3xl bg-[#E4EEEB]" />

          <div className="mt-5 h-32 animate-pulse rounded-3xl bg-[#E4EEEB]" />

        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-medikey-ivory text-medikey-text">

      {/* Header */}

      <header className="border-b border-medikey-border bg-white">

        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">

          <Link
            href="/dashboard"
            className="flex items-center gap-3"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-medikey-mint text-xl text-medikey-teal">
              ♥
            </div>

            <div>
              <div className="text-xl font-black">
                Medi
                <span className="text-medikey-teal">
                  Key
                </span>
              </div>

              <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-medikey-muted">
                Medical Records
              </div>
            </div>
          </Link>

          <Link
            href="/dashboard"
            className="rounded-xl border border-medikey-border px-4 py-2 text-sm font-semibold text-medikey-muted transition hover:bg-medikey-ivory hover:text-medikey-teal"
          >
            ← Dashboard
          </Link>

        </div>

      </header>

      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 lg:py-12">

        {/* Heading */}

        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

          <div>

            <p className="text-xs font-black uppercase tracking-[0.18em] text-medikey-teal">
              Private health vault
            </p>

            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              Medical Records
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-medikey-muted">
              Securely keep prescriptions,
              reports and important medical
              documents in one place.
            </p>

          </div>

          <button
            type="button"
            onClick={() => {
              setError("");
              setMessage("");
              setShowUpload(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-medikey-teal px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-90"
          >
            <span className="text-lg">
              +
            </span>
            Add Record
          </button>

        </div>

        {/* Alerts */}

        {error && (
          <div className="mt-6 rounded-2xl border border-[#F0C9CD] bg-[#FFF5F6] p-4 text-sm font-medium text-[#9D2D39]">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-6 rounded-2xl border border-[#CBE4DC] bg-[#EFF9F5] p-4 text-sm font-medium text-medikey-teal">
            {message}
          </div>
        )}

        {/* Member selector */}

        {members.length > 1 && (
          <div className="mt-6 rounded-3xl border border-medikey-border bg-white p-5 shadow-sm">

            <label
              htmlFor="member"
              className="mb-2 block text-sm font-bold"
            >
              Viewing records for
            </label>

            <select
              id="member"
              value={
                selectedMember?.id || ""
              }
              onChange={(event) =>
                changeMember(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-medikey-border bg-white px-4 py-3 text-sm font-medium outline-none focus:border-medikey-teal focus:ring-2 focus:ring-medikey-mint"
            >
              {members.map(
                (member) => (
                  <option
                    key={member.id}
                    value={member.id}
                  >
                    {member.full_name} —{" "}
                    {member.relationship ||
                      "Family member"}
                  </option>
                )
              )}
            </select>

          </div>
        )}

        {/* Privacy banner */}

        <div className="mt-6 rounded-3xl border border-[#D6E7E2] bg-medikey-mint p-5">

          <div className="flex gap-4">

            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-lg">
              🔒
            </div>

            <div>

              <h2 className="font-black">
                Your records stay private
              </h2>

              <p className="mt-1 text-sm leading-6 text-medikey-muted">
                Medical records are not shown
                on your public MediKey QR.
                Access can be controlled separately.
              </p>

            </div>

          </div>

        </div>

        {/* Records */}

        <section className="mt-6 rounded-3xl border border-medikey-border bg-white shadow-sm">

          <div className="flex items-center justify-between border-b border-medikey-border px-6 py-5">

            <div>
              <h2 className="font-black">
                {selectedMember
                  ? `${selectedMember.full_name}'s Records`
                  : "Your Records"}
              </h2>

              <p className="mt-1 text-xs text-medikey-muted">
                {records.length}{" "}
                {records.length === 1
                  ? "record"
                  : "records"}
              </p>
            </div>

          </div>

          {records.length === 0 ? (
            <div className="px-6 py-16 text-center">

              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-medikey-mint text-2xl text-medikey-teal">
                📄
              </div>

              <h2 className="mt-5 text-lg font-black">
                No records yet
              </h2>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-medikey-muted">
                Add your first prescription,
                lab report or medical document
                to start building your private
                health vault.
              </p>

              <button
                type="button"
                onClick={() => {
                  setError("");
                  setMessage("");
                  setShowUpload(true);
                }}
                className="mt-6 rounded-xl bg-medikey-teal px-5 py-3 text-sm font-bold text-white"
              >
                Add First Record
              </button>

            </div>
          ) : (

            <div>

              {records.map(
                (record) => (
                  <div
                    key={record.id}
                    className="flex flex-col gap-4 border-b border-medikey-border p-5 last:border-0 sm:flex-row sm:items-center sm:justify-between"
                  >

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedRecord(
                          record
                        )
                      }
                      className="flex min-w-0 items-center gap-4 text-left"
                    >

                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-medikey-mint text-lg font-black text-medikey-teal">
                        {getRecordIcon(
                          record.record_type
                        )}
                      </div>

                      <div className="min-w-0">

                        <p className="truncate font-bold text-medikey-text">
                          {record.title}
                        </p>

                        <p className="mt-1 text-sm text-medikey-muted">
                          {record.record_type ||
                            "Medical record"}
                          {" • "}
                          {formatDate(
                            record.record_date
                          )}
                        </p>

                      </div>

                    </button>

                    <div className="flex gap-2 sm:shrink-0">

                      <button
                        type="button"
                        onClick={() =>
                          openRecord(
                            record
                          )
                        }
                        className="rounded-xl border border-medikey-border px-4 py-2.5 text-sm font-bold text-medikey-teal transition hover:bg-medikey-ivory"
                      >
                        View
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          deleteRecord(
                            record
                          )
                        }
                        className="rounded-xl border border-[#F0C9CD] px-4 py-2.5 text-sm font-bold text-[#9D2D39] transition hover:bg-[#FFF5F6]"
                      >
                        Delete
                      </button>

                    </div>

                  </div>
                )
              )}

            </div>

          )}

        </section>

      </div>

      {/* Upload modal */}

      {showUpload && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#19302F]/30 p-5 backdrop-blur-sm">

          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[28px] border border-medikey-border bg-white p-6 shadow-2xl sm:p-8">

            <div className="flex items-start justify-between gap-5">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.16em] text-medikey-teal">
                  New document
                </p>

                <h2 className="mt-2 text-2xl font-black">
                  Add Medical Record
                </h2>

                <p className="mt-1 text-sm text-medikey-muted">
                  Add a private document to your
                  MediKey health vault.
                </p>

              </div>

              <button
                type="button"
                onClick={closeUpload}
                disabled={uploading}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-medikey-border text-lg text-medikey-muted hover:bg-medikey-ivory"
              >
                ×
              </button>

            </div>

            <div className="mt-7 space-y-5">

              {/* Title */}

              <div>

                <label
                  htmlFor="record-title"
                  className="mb-2 block text-sm font-bold"
                >
                  Record title
                </label>

                <input
                  id="record-title"
                  value={title}
                  onChange={(event) =>
                    setTitle(
                      event.target.value
                    )
                  }
                  placeholder="e.g. Blood Test Report"
                  disabled={uploading}
                  className="w-full rounded-xl border border-medikey-border px-4 py-3.5 text-sm outline-none focus:border-medikey-teal focus:ring-2 focus:ring-medikey-mint disabled:opacity-60"
                />

              </div>

              {/* Type */}

              <div>

                <label
                  htmlFor="record-type"
                  className="mb-2 block text-sm font-bold"
                >
                  Record type
                </label>

                <select
                  id="record-type"
                  value={recordType}
                  onChange={(event) =>
                    setRecordType(
                      event.target.value
                    )
                  }
                  disabled={uploading}
                  className="w-full rounded-xl border border-medikey-border bg-white px-4 py-3.5 text-sm outline-none focus:border-medikey-teal focus:ring-2 focus:ring-medikey-mint disabled:opacity-60"
                >
                  {RECORD_TYPES.map(
                    (type) => (
                      <option
                        key={type}
                        value={type}
                      >
                        {type}
                      </option>
                    )
                  )}
                </select>

              </div>

              {/* Date */}

              <div>

                <label
                  htmlFor="record-date"
                  className="mb-2 block text-sm font-bold"
                >
                  Record date
                </label>

                <input
                  id="record-date"
                  type="date"
                  value={recordDate}
                  onChange={(event) =>
                    setRecordDate(
                      event.target.value
                    )
                  }
                  disabled={uploading}
                  className="w-full rounded-xl border border-medikey-border px-4 py-3.5 text-sm outline-none focus:border-medikey-teal focus:ring-2 focus:ring-medikey-mint disabled:opacity-60"
                />

              </div>

              {/* File */}

              <div>

                <label
                  htmlFor="medical-file"
                  className="mb-2 block text-sm font-bold"
                >
                  Medical document
                </label>

                <input
                  ref={fileInputRef}
                  id="medical-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                  onChange={
                    handleFileChange
                  }
                  disabled={uploading}
                  className="w-full rounded-xl border border-dashed border-medikey-border bg-medikey-ivory p-4 text-sm"
                />

                <p className="mt-2 text-xs text-medikey-muted">
                  PDF, JPG, PNG or WebP • Maximum
                  10 MB
                </p>

                {selectedFile && (
                  <div className="mt-3 rounded-xl bg-medikey-mint px-4 py-3 text-sm font-medium text-medikey-text">
                    ✓ {selectedFile.name}
                  </div>
                )}

              </div>

              {/* Modal error */}

              {error && (
                <div className="rounded-xl border border-[#F0C9CD] bg-[#FFF5F6] p-4 text-sm text-[#9D2D39]">
                  {error}
                </div>
              )}

              {/* Actions */}

              <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">

                <button
                  type="button"
                  onClick={closeUpload}
                  disabled={uploading}
                  className="rounded-xl border border-medikey-border px-5 py-3 text-sm font-bold text-medikey-muted disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={uploadRecord}
                  disabled={uploading}
                  className="rounded-xl bg-medikey-teal px-6 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploading
                    ? "Uploading..."
                    : "Upload Record"}
                </button>

              </div>

            </div>

          </div>

        </div>

      )}

      {/* Record details modal */}

      {selectedRecord && (

        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#19302F]/30 p-5 backdrop-blur-sm">

          <div className="w-full max-w-md rounded-[28px] border border-medikey-border bg-white p-6 shadow-2xl">

            <div className="flex items-start justify-between gap-5">

              <div>

                <p className="text-xs font-black uppercase tracking-[0.16em] text-medikey-teal">
                  Medical record
                </p>

                <h2 className="mt-2 text-xl font-black">
                  {selectedRecord.title}
                </h2>

              </div>

              <button
                type="button"
                onClick={() =>
                  setSelectedRecord(
                    null
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-medikey-border text-lg text-medikey-muted"
              >
                ×
              </button>

            </div>

            <div className="mt-6 space-y-3">

              <InfoRow
                label="Type"
                value={
                  selectedRecord.record_type ||
                  "Medical record"
                }
              />

              <InfoRow
                label="Date"
                value={formatDate(
                  selectedRecord.record_date
                )}
              />

              <InfoRow
                label="File"
                value={
                  selectedRecord.file_path
                    ? "Secure document attached"
                    : "No file attached"
                }
              />

            </div>

            <button
              type="button"
              onClick={() =>
                openRecord(
                  selectedRecord
                )
              }
              className="mt-6 w-full rounded-xl bg-medikey-teal px-5 py-3.5 text-sm font-bold text-white"
            >
              Open Secure Document
            </button>

          </div>

        </div>

      )}

    </main>
  );
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-medikey-ivory px-4 py-3">
      <span className="text-xs font-bold uppercase tracking-wide text-medikey-muted">
        {label}
      </span>

      <span className="text-right text-sm font-semibold text-medikey-text">
        {value}
      </span>
    </div>
  );
}