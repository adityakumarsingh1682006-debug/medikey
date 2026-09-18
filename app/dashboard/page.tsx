"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type Member = {
  id: string;
  full_name: string;
  relationship: string | null;
  date_of_birth: string | null;
  photo_url: string | null;
};

type MemberStatus = {
  emergencyComplete: boolean;
  cardExists: boolean;
  cardActive: boolean;
};

function Icon({
  name,
  size = 22,
}: {
  name:
    | "activity"
    | "bell"
    | "chevron"
    | "file"
    | "heart"
    | "logout"
    | "plus"
    | "qr"
    | "settings"
    | "shield"
    | "user"
    | "users";
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
    case "activity":
      return (
        <svg {...common}>
          <path d="M3 12h4l2-7 4 14 2-7h6" />
        </svg>
      );

    case "bell":
      return (
        <svg {...common}>
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M10 21h4" />
        </svg>
      );

    case "chevron":
      return (
        <svg {...common}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );

    case "file":
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h6" />
        </svg>
      );

    case "heart":
      return (
        <svg {...common}>
          <path d="M20.8 8.6c0 5.4-8.8 10.4-8.8 10.4S3.2 14 3.2 8.6A4.6 4.6 0 0 1 12 6a4.6 4.6 0 0 1 8.8 2.6Z" />
        </svg>
      );

    case "logout":
      return (
        <svg {...common}>
          <path d="M10 17l5-5-5-5" />
          <path d="M15 12H3" />
          <path d="M21 3v18" />
        </svg>
      );

    case "plus":
      return (
        <svg {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );

    case "qr":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="6" height="6" rx="1" />
          <rect x="14" y="4" width="6" height="6" rx="1" />
          <rect x="4" y="14" width="6" height="6" rx="1" />
          <path d="M14 14h3v3h3M14 20h3M20 14v3" />
        </svg>
      );

    case "settings":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 1.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-2.6V20a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1-1.8-1.8.1-.1A1.7 1.7 0 0 0 8 15a1.7 1.7 0 0 0-1.6-1H6v-2.6h.4A1.7 1.7 0 0 0 8 10a1.7 1.7 0 0 0-.3-1.9l-.1-.1 1.8-1.8.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h2.6V5a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1 1.8 1.8-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2V14h-.2a1.7 1.7 0 0 0-1.6 1Z" />
        </svg>
      );

    case "shield":
      return (
        <svg {...common}>
          <path d="M12 3 20 6v5c0 5.2-3.4 8.8-8 10-4.6-1.2-8-4.8-8-10V6l8-3Z" />
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

    case "users":
      return (
        <svg {...common}>
          <circle cx="9" cy="8" r="3" />
          <path d="M3 20a6 6 0 0 1 12 0" />
          <path d="M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3 6" />
        </svg>
      );

    default:
      return null;
  }
}

const navItems = [
  { label: "Home", href: "/dashboard", icon: "activity" as const },
  { label: "Family", href: "/family", icon: "users" as const },
  { label: "Medical Records", href: "/records", icon: "file" as const },
  { label: "Insurance", href: "/insurance", icon: "shield" as const },
  { label: "MediKey Card", href: "/card", icon: "qr" as const },
  { label: "Security", href: "/security", icon: "shield" as const },
  { label: "Settings", href: "/settings", icon: "settings" as const },
];

export default function DashboardPage() {
  const [userName, setUserName] = useState("there");
  const [members, setMembers] = useState<Member[]>([]);
  const [statuses, setStatuses] = useState<Record<string, MemberStatus>>({});
  const [loading, setLoading] = useState(true);
  const [notificationOpen, setNotificationOpen] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    const metadataName =
      user.user_metadata?.full_name ||
      user.email?.split("@")[0] ||
      "there";

    setUserName(metadataName);

    let { data: memberRows } = await supabase
      .from("family_members")
      .select(
        "id, full_name, relationship, date_of_birth, photo_url"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    /*
     * Safety fallback:
     * If the account somehow has no member yet, create the
     * initial family + Self member + emergency profile.
     */
    if (!memberRows || memberRows.length === 0) {
      const { data: family } = await supabase
        .from("families")
        .insert({
          name: `${metadataName}'s Family`,
          owner_id: user.id,
        })
        .select("id")
        .single();

      if (family?.id) {
        const { data: newMember } = await supabase
          .from("family_members")
          .insert({
            family_id: family.id,
            user_id: user.id,
            full_name: metadataName,
            relationship: "Self",
          })
          .select(
            "id, full_name, relationship, date_of_birth, photo_url"
          )
          .single();

        if (newMember) {
          await supabase
            .from("emergency_profiles")
            .insert({
              member_id: newMember.id,
            });

          memberRows = [newMember];
        }
      }
    }

    const loadedMembers = memberRows || [];
    setMembers(loadedMembers);

    /*
     * IMPORTANT FIX:
     * Explicitly check emergency_profiles AND medikey_cards
     * for every family member.
     */
    const nextStatuses: Record<string, MemberStatus> = {};

    for (const member of loadedMembers) {
      const { data: emergencyProfile } = await supabase
        .from("emergency_profiles")
        .select(
          "blood_group, allergies, critical_medications, medical_conditions, emergency_contact_name, emergency_contact_phone"
        )
        .eq("member_id", member.id)
        .limit(1);

      const profile = emergencyProfile?.[0];

      const emergencyComplete = Boolean(
        profile &&
          (
            profile.blood_group ||
            profile.allergies ||
            profile.critical_medications ||
            profile.medical_conditions ||
            profile.emergency_contact_name ||
            profile.emergency_contact_phone
          )
      );

      const { data: cardRows } = await supabase
        .from("medikey_cards")
        .select("id, is_active")
        .eq("member_id", member.id)
        .limit(1);

      const card = cardRows?.[0];

      nextStatuses[member.id] = {
        emergencyComplete,
        cardExists: Boolean(card),
        cardActive: Boolean(card?.is_active),
      };
    }

    setStatuses(nextStatuses);
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const selfMember =
    members.find(
      (member) =>
        member.relationship?.toLowerCase() === "self"
    ) || members[0];

  const selfStatus = selfMember
    ? statuses[selfMember.id]
    : undefined;

  return (
    <main className="min-h-screen bg-[#F7FAF8] text-[#19302F]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-[290px] bg-white border-r border-[#DFE9E6] flex-col z-30">
        <div className="px-7 pt-8">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#E6F3EF] text-[#176B67] flex items-center justify-center">
              <Icon name="heart" size={25} />
            </div>

            <div>
              <div className="font-bold text-[20px]">
                MediKey
              </div>
              <div className="text-sm text-[#667A78]">
                Family health
              </div>
            </div>
          </Link>
        </div>

        <nav className="mt-12 px-5 space-y-2">
          {navItems.map((item) => {
            const active = item.href === "/dashboard";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-4 px-5 py-4 rounded-2xl transition ${
                  active
                    ? "bg-[#E6F3EF] text-[#176B67]"
                    : "text-[#667A78] hover:bg-[#F7FAF8] hover:text-[#176B67]"
                }`}
              >
                <Icon name={item.icon} size={21} />
                <span className="font-medium">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={handleLogout}
          className="mt-auto mb-8 mx-5 flex items-center gap-4 px-5 py-4 rounded-2xl text-[#667A78] hover:bg-[#F7FAF8] hover:text-[#C93C4B] transition"
        >
          <Icon name="logout" size={21} />
          <span className="font-medium">Log out</span>
        </button>
      </aside>

      {/* Main */}
      <div className="lg:ml-[290px] min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-[#F7FAF8]/95 backdrop-blur border-b border-[#DFE9E6]">
          <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-5 flex items-center justify-between">
            <div>
              <p className="text-sm text-[#667A78]">
                Welcome back
              </p>

              <h1 className="text-[27px] sm:text-[32px] font-bold tracking-tight">
                Good evening, {userName} 👋
              </h1>
            </div>

            <div className="relative">
              <button
                onClick={() =>
                  setNotificationOpen(!notificationOpen)
                }
                className="w-12 h-12 rounded-2xl bg-white border border-[#DFE9E6] flex items-center justify-center text-[#19302F] hover:border-[#7BAE9D] transition"
              >
                <Icon name="bell" size={21} />
              </button>

              {notificationOpen && (
                <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl border border-[#DFE9E6] shadow-xl p-5">
                  <p className="font-semibold">
                    Notifications
                  </p>

                  <p className="text-sm text-[#667A78] mt-2">
                    You're all caught up.
                  </p>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-8 pb-28 lg:pb-12">
          {loading ? (
            <div className="space-y-6 animate-pulse">
              <div className="h-8 w-48 bg-[#E6F3EF] rounded-lg" />
              <div className="h-5 w-72 bg-[#E6F3EF] rounded-lg" />

              <div className="grid lg:grid-cols-2 gap-6">
                <div className="h-72 bg-white rounded-3xl border border-[#DFE9E6]" />
                <div className="h-72 bg-white rounded-3xl border border-[#DFE9E6]" />
              </div>
            </div>
          ) : (
            <>
              {/* Family heading */}
              <section>
                <div className="flex items-end justify-between">
                  <div>
                    <h2 className="text-[24px] font-bold">
                      Your family
                    </h2>

                    <p className="mt-1 text-[#667A78]">
                      Manage health profiles from one place.
                    </p>
                  </div>

                  <Link
                    href="/family"
                    className="hidden sm:flex items-center gap-1 text-[#176B67] font-medium"
                  >
                    View family
                    <Icon name="chevron" size={17} />
                  </Link>
                </div>

                <div className="mt-6 grid lg:grid-cols-2 gap-6">
                  {/* Self card */}
                  {selfMember && (
                    <Link
                      href={`/profile?member=${selfMember.id}`}
                      className="group bg-white rounded-[28px] border border-[#DFE9E6] p-7 hover:border-[#7BAE9D] hover:shadow-sm transition"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          {selfMember.photo_url ? (
                            <img
                              src={selfMember.photo_url}
                              alt={selfMember.full_name}
                              className="w-16 h-16 rounded-2xl object-cover border border-[#DFE9E6]"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-2xl bg-[#E6F3EF] text-[#176B67] flex items-center justify-center">
                              <Icon name="user" size={28} />
                            </div>
                          )}

                          <div>
                            <h3 className="font-bold text-lg">
                              {selfMember.full_name}
                            </h3>

                            <p className="text-[#667A78]">
                              {selfMember.relationship || "Self"}
                            </p>
                          </div>
                        </div>

                        <Icon
                          name="chevron"
                          size={21}
                        />
                      </div>

                      <div className="mt-9 grid grid-cols-2 gap-6">
                        <div>
                          <p className="text-sm text-[#667A78]">
                            Emergency profile
                          </p>

                          {selfStatus?.emergencyComplete ? (
                            <div className="mt-1 flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-[#176B67]" />
                              <p className="font-semibold text-[#176B67]">
                                Complete
                              </p>
                            </div>
                          ) : (
                            <p className="mt-1 font-semibold">
                              Needs setup
                            </p>
                          )}
                        </div>

                        <div>
                          <p className="text-sm text-[#667A78]">
                            MediKey Card
                          </p>

                          {selfStatus?.cardExists ? (
                            <div className="mt-1 flex items-center gap-2">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  selfStatus.cardActive
                                    ? "bg-[#176B67]"
                                    : "bg-[#C98A28]"
                                }`}
                              />

                              <p
                                className={`font-semibold ${
                                  selfStatus.cardActive
                                    ? "text-[#176B67]"
                                    : "text-[#C98A28]"
                                }`}
                              >
                                {selfStatus.cardActive
                                  ? "Active"
                                  : "Inactive"}
                              </p>
                            </div>
                          ) : (
                            <p className="mt-1 font-semibold">
                              Not created
                            </p>
                          )}
                        </div>
                      </div>
                    </Link>
                  )}

                  {/* Add member */}
                  <Link
                    href="/family/add"
                    className="bg-white rounded-[28px] border border-dashed border-[#C9DAD6] p-7 flex flex-col justify-between min-h-[270px] hover:border-[#176B67] hover:bg-[#FBFDFC] transition"
                  >
                    <div>
                      <div className="w-11 h-11 rounded-xl bg-[#E6F3EF] text-[#176B67] flex items-center justify-center">
                        <Icon name="plus" size={23} />
                      </div>

                      <h3 className="mt-8 text-xl font-bold">
                        Add a family member
                      </h3>

                      <p className="mt-3 max-w-md text-[#667A78] leading-6">
                        Add parents, children, partners or loved
                        ones to manage their MediKey profiles.
                      </p>
                    </div>

                    <div className="mt-7 flex items-center gap-2 text-[#176B67] font-semibold">
                      Add member
                      <Icon name="chevron" size={17} />
                    </div>
                  </Link>
                </div>
              </section>

              {/* Quick actions */}
              <section className="mt-12">
                <h2 className="text-[23px] font-bold">
                  Quick actions
                </h2>

                <div className="mt-6 grid grid-cols-2 xl:grid-cols-5 gap-4 sm:gap-5">
                  <Link
                    href="/card"
                    className="bg-white rounded-2xl border border-[#DFE9E6] p-6 hover:border-[#7BAE9D] hover:shadow-sm transition"
                  >
                    <div className="text-[#176B67]">
                      <Icon name="qr" size={25} />
                    </div>

                    <p className="mt-5 font-bold">
                      MediKey Card
                    </p>

                    <p className="mt-1 text-sm text-[#667A78]">
                      View your QR
                    </p>
                  </Link>

                  <Link
                    href="/records"
                    className="bg-white rounded-2xl border border-[#DFE9E6] p-6 hover:border-[#7BAE9D] hover:shadow-sm transition"
                  >
                    <div className="text-[#176B67]">
                      <Icon name="file" size={25} />
                    </div>

                    <p className="mt-5 font-bold">
                      Records
                    </p>

                    <p className="mt-1 text-sm text-[#667A78]">
                      Medical documents
                    </p>
                  </Link>

                  <Link
                    href="/family"
                    className="bg-white rounded-2xl border border-[#DFE9E6] p-6 hover:border-[#7BAE9D] hover:shadow-sm transition"
                  >
                    <div className="text-[#176B67]">
                      <Icon name="users" size={25} />
                    </div>

                    <p className="mt-5 font-bold">
                      Family
                    </p>

                    <p className="mt-1 text-sm text-[#667A78]">
                      Manage members
                    </p>
                  </Link>

                  <Link
                    href="/insurance"
                    className="bg-white rounded-2xl border border-[#DFE9E6] p-6 hover:border-[#7BAE9D] hover:shadow-sm transition"
                  >
                    <div className="text-[#176B67]">
                      <Icon name="shield" size={25} />
                    </div>

                    <p className="mt-5 font-bold">
                      Insurance
                    </p>

                    <p className="mt-1 text-sm text-[#667A78]">
                      Policy details
                    </p>
                  </Link>

                  <Link
                    href="/security"
                    className="bg-white rounded-2xl border border-[#DFE9E6] p-6 hover:border-[#7BAE9D] hover:shadow-sm transition"
                  >
                    <div className="text-[#176B67]">
                      <Icon name="shield" size={25} />
                    </div>

                    <p className="mt-5 font-bold">
                      Security
                    </p>

                    <p className="mt-1 text-sm text-[#667A78]">
                      Access history
                    </p>
                  </Link>
                </div>
              </section>

              {/* Emergency profile setup */}
              {!selfStatus?.emergencyComplete && (
                <section className="mt-8">
                  <Link
                    href={`/emergency-profile?member=${selfMember?.id || ""}`}
                    className="block bg-white rounded-3xl border border-[#DFE9E6] p-6 sm:p-7 hover:border-[#7BAE9D] transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#E6F3EF] text-[#176B67] flex items-center justify-center shrink-0">
                          <Icon name="heart" size={24} />
                        </div>

                        <div>
                          <h3 className="font-bold text-lg">
                            Complete your emergency profile
                          </h3>

                          <p className="mt-1 text-sm text-[#667A78] max-w-xl">
                            Add your blood group, allergies,
                            critical medications and emergency
                            contact so essential information is
                            available when you need it.
                          </p>
                        </div>
                      </div>

                      <span className="text-[#176B67] font-semibold whitespace-nowrap">
                        Complete profile →
                      </span>
                    </div>
                  </Link>
                </section>
              )}

              {/* Security notice */}
              <section className="mt-8">
                <div className="bg-[#E6F3EF] rounded-3xl p-6 sm:p-7 flex items-start gap-4">
                  <div className="w-11 h-11 rounded-xl bg-white text-[#176B67] flex items-center justify-center shrink-0">
                    <Icon name="shield" size={22} />
                  </div>

                  <div>
                    <h3 className="font-bold">
                      Your health information stays private
                    </h3>

                    <p className="mt-1 text-sm text-[#667A78] leading-6 max-w-3xl">
                      Your MediKey QR shares only essential emergency
                      information. Private medical records are not
                      exposed through the public QR.
                    </p>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </div>

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#DFE9E6] px-2 py-2">
        <div className="grid grid-cols-6">
          <Link
            href="/dashboard"
            className="flex flex-col items-center gap-1 py-2 text-[#176B67]"
          >
            <Icon name="activity" size={20} />
            <span className="text-[11px] font-medium">
              Home
            </span>
          </Link>

          <Link
            href="/family"
            className="flex flex-col items-center gap-1 py-2 text-[#667A78]"
          >
            <Icon name="users" size={20} />
            <span className="text-[11px] font-medium">
              Family
            </span>
          </Link>

          <Link
            href="/records"
            className="flex flex-col items-center gap-1 py-2 text-[#667A78]"
          >
            <Icon name="file" size={20} />
            <span className="text-[11px] font-medium">
              Records
            </span>
          </Link>

          <Link
            href="/insurance"
            className="flex flex-col items-center gap-1 py-2 text-[#667A78]"
          >
            <Icon name="shield" size={20} />
            <span className="text-[11px] font-medium">
              Insurance
            </span>
          </Link>

          <Link
            href="/card"
            className="flex flex-col items-center gap-1 py-2 text-[#667A78]"
          >
            <Icon name="qr" size={20} />
            <span className="text-[11px] font-medium">
              Card
            </span>
          </Link>

          <Link
            href="/settings"
            className="flex flex-col items-center gap-1 py-2 text-[#667A78]"
          >
            <Icon name="settings" size={20} />
            <span className="text-[11px] font-medium">
              Settings
            </span>
          </Link>
        </div>
      </nav>
    </main>
  );
}