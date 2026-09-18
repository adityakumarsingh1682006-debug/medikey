"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/src/lib/supabase";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setSuccess(false);

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setMessage(
        "Please enter your email address and password."
      );
      return;
    }

    setLoading(true);

    try {
      console.log("MediKey: starting login...");

      const {
        data,
        error,
      } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      console.log("MediKey login response:", {
        hasUser: !!data?.user,
        hasSession: !!data?.session,
        error: error?.message || null,
      });

      if (error) {
        const errorMessage =
          error.message?.toLowerCase() || "";

        if (
          errorMessage.includes(
            "email not confirmed"
          )
        ) {
          setMessage(
            "Your email hasn't been verified yet. Please check your email and verify your account."
          );
        } else if (
          errorMessage.includes(
            "invalid login credentials"
          )
        ) {
          setMessage(
            "Email or password is incorrect. Please check your credentials."
          );
        } else {
          setMessage(
            error.message ||
              "Login failed. Please try again."
          );
        }

        return;
      }

      if (!data.session || !data.user) {
        setMessage(
          "Login did not create a session. Please try again."
        );
        return;
      }

      setSuccess(true);
      setMessage(
        "Login successful. Opening your MediKey dashboard..."
      );

      // Give Supabase a moment to persist the session.
      await new Promise((resolve) =>
        setTimeout(resolve, 300)
      );

      router.replace("/dashboard");

      // Fallback in case client-side navigation
      // doesn't happen correctly over the LAN IP.
      setTimeout(() => {
        window.location.href =
          "/dashboard";
      }, 1000);
    } catch (error) {
      console.error(
        "MediKey login error:",
        error
      );

      if (
        error instanceof Error
      ) {
        setMessage(
          error.message
        );
      } else {
        setMessage(
          "Something went wrong while logging in. Please try again."
        );
      }
    } finally {
      setLoading(false);
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
            Welcome back
          </h1>

          <p className="mt-2 text-medikey-muted">
            Sign in to your MediKey account
          </p>

        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl border border-medikey-border p-8 shadow-sm">

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

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
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value
                  )
                }
                placeholder="you@example.com"
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-medikey-border bg-white text-medikey-text outline-none transition focus:border-medikey-teal focus:ring-2 focus:ring-medikey-mint disabled:opacity-60"
              />

            </div>

            {/* Password */}
            <div>

              <div className="flex items-center justify-between mb-2">

                <label
                  htmlFor="password"
                  className="text-sm font-medium text-medikey-text"
                >
                  Password
                </label>

                <button
                  type="button"
                  onClick={() =>
                    setMessage(
                      "Password recovery can be connected next."
                    )
                  }
                  className="text-sm font-medium text-medikey-teal hover:opacity-80"
                >
                  Forgot password?
                </button>

              </div>

              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Enter your password"
                disabled={loading}
                className="w-full px-4 py-3 rounded-xl border border-medikey-border bg-white text-medikey-text outline-none transition focus:border-medikey-teal focus:ring-2 focus:ring-medikey-mint disabled:opacity-60"
              />

            </div>

            {/* Message */}
            {message && (
              <div
                className={`rounded-xl border p-4 ${
                  success
                    ? "bg-[#EFF9F5] border-[#CBE4DC]"
                    : "bg-[#FFF5F6] border-[#F0C9CD]"
                }`}
              >
                <p
                  className={`text-sm ${
                    success
                      ? "text-medikey-teal"
                      : "text-[#9D2D39]"
                  }`}
                >
                  {message}
                </p>
              </div>
            )}

            {/* Login */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-medikey-teal text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading
                ? "Signing in..."
                : "Log in"}
            </button>

          </form>

          {/* Signup */}
          <div className="mt-7 pt-6 border-t border-medikey-border text-center">

            <p className="text-sm text-medikey-muted">

              Don't have a MediKey account?{" "}

              <Link
                href="/signup"
                className="font-semibold text-medikey-teal hover:opacity-80 transition"
              >
                Create one
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