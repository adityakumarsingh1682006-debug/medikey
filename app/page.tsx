import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-medikey-ivory flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-medikey-mint flex items-center justify-center mx-auto mb-5">
            <span className="text-3xl text-medikey-teal">♥</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-medikey-text">
            MediKey
          </h1>

          <p className="mt-3 text-medikey-muted text-base leading-relaxed">
            When you can't speak,
            <br />
            MediKey speaks for you.
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl border border-medikey-border p-8 shadow-sm">
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-medikey-text">
              Your emergency health identity
            </h2>

            <p className="mt-2 text-sm leading-6 text-medikey-muted">
              Keep critical health information accessible when it matters
              most — for you and your family.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-8">
            
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-medikey-mint">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
                <span className="text-lg">🩺</span>
              </div>

              <div>
                <p className="font-semibold text-medikey-text">
                  Emergency information
                </p>

                <p className="text-sm text-medikey-muted">
                  Critical health details at a glance
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-medikey-ivory border border-medikey-border">
              <div className="w-10 h-10 rounded-xl bg-medikey-mint flex items-center justify-center">
                <span className="text-lg">👨‍👩‍👧</span>
              </div>

              <div>
                <p className="font-semibold text-medikey-text">
                  Protect your family
                </p>

                <p className="text-sm text-medikey-muted">
                  One place for every family member
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-medikey-ivory border border-medikey-border">
              <div className="w-10 h-10 rounded-xl bg-medikey-mint flex items-center justify-center">
                <span className="text-lg">🔐</span>
              </div>

              <div>
                <p className="font-semibold text-medikey-text">
                  Privacy first
                </p>

                <p className="text-sm text-medikey-muted">
                  Sensitive records stay protected
                </p>
              </div>
            </div>

          </div>

          {/* Get Started */}
          <Link
            href="/signup"
            className="block w-full text-center bg-medikey-teal text-white py-3.5 rounded-xl font-semibold hover:opacity-90 transition"
          >
            Get Started
          </Link>

          <p className="text-center text-xs text-medikey-muted mt-4">
            Free to create your MediKey
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-medikey-muted mt-6">
          Your health. Your identity. Your MediKey.
        </p>

      </div>
    </main>
  );
}