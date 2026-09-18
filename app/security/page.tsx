import Link from "next/link";

export default function SecurityPage() {
  return (
    <main className="min-h-screen bg-medikey-ivory">

      <header className="bg-white border-b border-medikey-border">
        <div className="max-w-5xl mx-auto px-5 py-5 flex justify-between">
          <Link href="/dashboard" className="font-bold text-medikey-text">
            MediKey
          </Link>

          <Link href="/dashboard" className="text-sm font-semibold text-medikey-teal">
            ← Dashboard
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 py-10">

        <h1 className="text-3xl font-bold text-medikey-text">
          Security
        </h1>

        <p className="mt-2 text-sm text-medikey-muted">
          Understand how MediKey protects your health information.
        </p>

        <div className="mt-8 grid md:grid-cols-2 gap-5">

          <SecurityCard
            title="Emergency information"
            text="Only critical emergency information is designed to be visible through your MediKey emergency flow."
          />

          <SecurityCard
            title="Medical records"
            text="Full medical records are kept separate from the public emergency view."
          />

          <SecurityCard
            title="Controlled access"
            text="Healthcare professional access can be controlled and audited."
          />

          <SecurityCard
            title="Prototype mode"
            text="This hackathon prototype uses synthetic data. Do not upload real medical documents."
          />

        </div>
      </div>
    </main>
  );
}

function SecurityCard({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="bg-white rounded-3xl border border-medikey-border p-6">
      <div className="w-11 h-11 rounded-xl bg-medikey-mint flex items-center justify-center text-medikey-teal">
        ✓
      </div>

      <h2 className="mt-5 font-bold text-medikey-text">
        {title}
      </h2>

      <p className="mt-2 text-sm text-medikey-muted leading-6">
        {text}
      </p>
    </div>
  );
}