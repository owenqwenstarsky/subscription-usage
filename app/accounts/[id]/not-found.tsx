import Link from "next/link";

export default function AccountNotFound() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-8 text-center">
        <div className="text-lg font-medium text-zinc-200">Account not found</div>
        <p className="mx-auto mt-2 max-w-md text-sm text-zinc-400">
          It may have been deleted on the proxy. Go back and refresh the list.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white"
        >
          Back to all accounts
        </Link>
      </div>
    </div>
  );
}
