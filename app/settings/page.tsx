"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  return (
    <main className="min-h-screen bg-medikey-ivory">
      <header className="bg-white border-b border-medikey-border">
        <div className="max-w-5xl mx-auto px-5 py-5 flex items-center justify-between">
          <Link
            href="/dashboard"
            className="font-bold text-medikey-text"
          >
            MediKey
          </Link>

          <Link
            href="/dashboard"
            className="text-sm font-semibold text-medikey-teal"
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-10">
        <div>
          <p className="text-sm font-semibold text-medikey-teal">
            ACCOUNT
          </p>

          <h1 className="mt-2 text-3xl font-bold text-medikey-text">
            Settings
          </h1>

          <p className="mt-2 text-medikey-muted">
            Manage your Medi Key account and privacy settings.
          </p>
        </div>

        <div className="mt-8 bg-white rounded-3xl border border-medikey-border overflow-hidden shadow-sm">
          <Link
            href="/profile"
            className="block p-6 border-b border-medikey-border hover:bg-medikey-ivory transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-medikey-text">
                  Profile
                </p>

                <p className="text-sm text-medikey-muted mt-1">
                  View and manage your Medi Key profile
                </p>
              </div>

              <span className="text-medikey-teal text-xl">
                →
              </span>
            </div>
          </Link>

          <Link
            href="/security"
            className="block p-6 border-b border-medikey-border hover:bg-medikey-ivory transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-medikey-text">
                  Security & Privacy
                </p>

                <p className="text-sm text-medikey-muted mt-1">
                  Manage how your medical information is protected
                </p>
              </div>

              <span className="text-medikey-teal text-xl">
                →
              </span>
            </div>
          </Link>

          <button
            onClick={logout}
            className="w-full text-left p-6 hover:bg-medikey-ivory transition"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-medikey-danger">
                  Log out
                </p>

                <p className="text-sm text-medikey-muted mt-1">
                  Sign out of your Medi Key account
                </p>
              </div>

              <span className="text-medikey-danger text-xl">
                →
              </span>
            </div>
          </button>
        </div>
      </div>
    </main>
  );
}