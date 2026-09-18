"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<
    "error" | "success"
  >("error");

  async function handleSignup() {
    setMessage("");

    if (
      !name.trim() ||
      !email.trim() ||
      !password
    ) {
      setMessageType("error");
      setMessage(
        "Please fill in all fields."
      );
      return;
    }

    if (password.length < 6) {
      setMessageType("error");
      setMessage(
        "Password must be at least 6 characters."
      );
      return;
    }

    setLoading(true);

    try {
      const {
        data,
        error,
      } =
        await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name:
                name.trim(),
            },
          },
        });

      if (error) {
        console.error(
          "Supabase signup error:",
          error
        );

        setMessageType("error");

        if (
          error.message
            .toLowerCase()
            .includes(
              "already registered"
            )
        ) {
          setMessage(
            "An account with this email already exists. Please log in instead."
          );
        } else {
          setMessage(
            error.message
          );
        }

        return;
      }

      if (!data.user) {
        setMessageType("error");
        setMessage(
          "Account could not be created. Please try again."
        );
        return;
      }

      /*
       * Supabase behaves differently depending on
       * whether email confirmation is enabled.
       *
       * If a session exists, the user can go
       * directly to the dashboard.
       */

      if (data.session) {
        setMessageType(
          "success"
        );

        setMessage(
          "Account created successfully. Opening your dashboard..."
        );

        await new Promise(
          (resolve) =>
            setTimeout(
              resolve,
              500
            )
        );

        router.replace(
          "/dashboard"
        );

        setTimeout(() => {
          if (
            window.location.pathname !==
            "/dashboard"
          ) {
            window.location.href =
              "/dashboard";
          }
        }, 1200);

        return;
      }

      /*
       * No session normally means email confirmation
       * is enabled in Supabase.
       */

      setMessageType(
        "success"
      );

      setMessage(
        "Account created! Please check your email and confirm your account before logging in."
      );
    } catch (error) {
      console.error(
        "Unexpected signup error:",
        error
      );

      setMessageType("error");

      setMessage(
        "Something went wrong while creating your account. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (
      event.key ===
      "Enter"
    ) {
      handleSignup();
    }
  }

  return (
    <main className="min-h-screen bg-medikey-ivory flex items-center justify-center p-6">

      <div className="w-full max-w-md">

        {/* Brand */}

        <div className="text-center mb-8">

          <Link
            href="/"
            className="inline-block"
          >

            <div className="w-14 h-14 rounded-2xl bg-medikey-mint flex items-center justify-center mx-auto mb-5">

              <span className="text-2xl text-medikey-teal">
                ♥
              </span>

            </div>

          </Link>

          <h1 className="text-3xl font-bold text-medikey-text">
            Create your MediKey
          </h1>

          <p className="mt-2 text-medikey-muted">
            Start protecting yourself and your family.
          </p>

        </div>

        {/* Signup Card */}

        <div className="bg-white rounded-3xl border border-medikey-border p-8 shadow-sm">

          <div className="space-y-5">

            {/* Full Name */}

            <div>

              <label
                htmlFor="name"
                className="block text-sm font-medium text-medikey-text mb-2"
              >
                Full name
              </label>

              <input
                id="name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(e) =>
                  setName(
                    e.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder="Your full name"
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-medikey-border bg-white text-medikey-text outline-none transition focus:border-medikey-teal focus:ring-2 focus:ring-medikey-mint disabled:opacity-60"
              />

            </div>

            {/* Email */}

            <div>

              <label
                htmlFor="email"
                className="block text-sm font-medium text-medikey-text mb-2"
              >
                Email address
              </label>

              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder="you@example.com"
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-medikey-border bg-white text-medikey-text outline-none transition focus:border-medikey-teal focus:ring-2 focus:ring-medikey-mint disabled:opacity-60"
              />

            </div>

            {/* Password */}

            <div>

              <label
                htmlFor="password"
                className="block text-sm font-medium text-medikey-text mb-2"
              >
                Password
              </label>

              <input
                id="password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) =>
                  setPassword(
                    e.target.value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder="Create a password"
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-medikey-border bg-white text-medikey-text outline-none transition focus:border-medikey-teal focus:ring-2 focus:ring-medikey-mint disabled:opacity-60"
              />

              <p className="mt-2 text-xs text-medikey-muted">
                Minimum 6 characters
              </p>

            </div>

            {/* Message */}

            {message && (

              <div
                className={`rounded-xl border p-4 ${
                  messageType ===
                  "success"
                    ? "bg-[#EFF9F5] border-[#CBE4DC]"
                    : "bg-[#FFF5F6] border-[#F0C9CD]"
                }`}
              >

                <p
                  className={`text-sm ${
                    messageType ===
                    "success"
                      ? "text-[#176B67]"
                      : "text-[#9D2D39]"
                  }`}
                >
                  {message}
                </p>

              </div>

            )}

            {/* Create Account */}

            <button
              type="button"
              onClick={
                handleSignup
              }
              disabled={
                loading
              }
              className="w-full bg-medikey-teal text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >

              {loading ? (
                <span className="flex items-center justify-center gap-2">

                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />

                  Creating account...

                </span>
              ) : (
                "Create Account"
              )}

            </button>

          </div>

          {/* Login */}

          <div className="mt-7 pt-6 border-t border-medikey-border text-center">

            <p className="text-sm text-medikey-muted">

              Already have an account?{" "}

              <Link
                href="/login"
                className="font-semibold text-medikey-teal hover:opacity-80 transition"
              >
                Log in
              </Link>

            </p>

          </div>

        </div>

        {/* Back */}

        <div className="text-center mt-6">

          <Link
            href="/"
            className="text-sm text-medikey-muted hover:text-medikey-teal transition"
          >
            ← Back to MediKey
          </Link>

        </div>

      </div>

    </main>
  );
}