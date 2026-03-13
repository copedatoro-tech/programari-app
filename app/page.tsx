import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl md:text-5xl font-bold text-amber-900 mb-10 text-center">
        Bine ați venit!
      </h1>

      <div className="flex flex-col gap-6 w-full max-w-sm">
        <Link
          href="/programari"
          className="w-full py-5 text-xl font-semibold rounded-xl bg-amber-600 text-white shadow-lg hover:bg-amber-700 transition text-center"
        >
          Programări
        </Link>

        <Link
          href="/istoric"
          className="w-full py-5 text-xl font-semibold rounded-xl bg-orange-500 text-white shadow-lg hover:bg-orange-600 transition text-center"
        >
          Istoric
        </Link>

        <Link
          href="/contact"
          className="w-full py-5 text-xl font-semibold rounded-xl bg-rose-400 text-white shadow-lg hover:bg-rose-500 transition text-center"
        >
          Contact
        </Link>
      </div>
    </main>
  );
}
