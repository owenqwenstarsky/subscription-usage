export default function AccountLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-24 rounded bg-zinc-800" />
        <div className="h-7 w-1/2 rounded bg-zinc-800" />
        <div className="h-64 rounded-xl bg-zinc-900" />
      </div>
    </div>
  );
}
