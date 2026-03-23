import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-zinc-900 p-4">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-emerald-600">404</h1>
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
          Page Not Found
        </h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          The page you are looking for might have been removed, had its name changed,
          or is temporarily unavailable.
        </p>
        <Link
          href="/"
          className="inline-block px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-all"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
