import { Suspense } from "react";
import { Dashboard } from "@/components/Dashboard";
import { CardSkeleton } from "@/components/States";

function DashboardFallback() {
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">
      <div className="h-7 w-64 animate-pulse rounded bg-zinc-800" />
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100">
      {/* useSearchParams in Dashboard requires a Suspense boundary. */}
      <Suspense fallback={<DashboardFallback />}>
        <Dashboard />
      </Suspense>
    </div>
  );
}
