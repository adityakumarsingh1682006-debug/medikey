"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";

type Profile = {
  full_name: string;
  date_of_birth: string | null;
  relationship: string | null;
  photo_url: string | null;
  blood_group: string | null;
  allergies: string | null;
  critical_medications: string | null;
  medical_conditions: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
};

export default function PublicProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const token = process.env.NEXT_PUBLIC_MEDIKEY_PUBLIC_TOKEN;

      if (!token) {
        setError("MediKey configuration missing.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.rpc(
        "get_public_medikey_profile",
        { p_token: token }
      );

      if (error || !data?.length) {
        setError(error?.message || "Profile not found.");
      } else {
        setProfile(data[0]);
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        Loading your MediKey ID...
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <p>{error || "Profile unavailable."}</p>
      </main>
    );
  }

  const details = [
    ["Date of Birth", profile.date_of_birth],
    ["Blood Group", profile.blood_group],
    ["Allergies", profile.allergies],
    ["Medical Conditions", profile.medical_conditions],
    ["Critical Medications", profile.critical_medications],
  ];

  return (
    <main className="min-h-screen bg-slate-100 px-5 py-10">

      <div className="max-w-2xl mx-auto">

        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-blue-700">
            MediKey
          </h1>

          <span className="text-xs bg-green-100 text-green-700 px-3 py-2 rounded-full">
            ● Active ID
          </span>
        </header>

        <section className="bg-white rounded-3xl shadow-xl overflow-hidden">

          <div className="bg-gradient-to-r from-blue-700 to-indigo-600 p-8 text-white">

            <p className="text-sm text-blue-100">
              PERSONAL MEDICAL IDENTITY
            </p>

            <div className="flex items-center gap-5 mt-6">

              {profile.photo_url ? (
                <img
                  src={profile.photo_url}
                  alt={profile.full_name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white/30"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
                  {profile.full_name.charAt(0)}
                </div>
              )}

              <div>
                <h2 className="text-2xl font-bold">
                  {profile.full_name}
                </h2>

                <p className="text-blue-100 mt-1">
                  {profile.relationship || "MediKey Member"}
                </p>
              </div>

            </div>
          </div>

          <div className="p-7">

            <h3 className="text-lg font-bold text-slate-800 mb-5">
              Medical Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {details.map(([label, value]) => (
                <div
                  key={label}
                  className="bg-slate-50 rounded-xl p-4"
                >
                  <p className="text-sm text-slate-500">
                    {label}
                  </p>

                  <p className="font-semibold text-slate-900 mt-2">
                    {value || "Not provided"}
                  </p>
                </div>
              ))}

            </div>

            <div className="mt-8 border-t pt-6">

              <h3 className="text-lg font-bold text-slate-800 mb-4">
                Emergency Contact
              </h3>

              <p className="font-semibold text-slate-900">
                {profile.emergency_contact_name || "Not provided"}
              </p>

              <p className="text-slate-600 mt-1">
                {profile.emergency_contact_phone || "Not provided"}
              </p>

            </div>

          </div>

        </section>

        <p className="text-center text-sm text-slate-400 mt-6">
          MediKey — Your medical identity, when it matters most.
        </p>

      </div>

    </main>
  );
}