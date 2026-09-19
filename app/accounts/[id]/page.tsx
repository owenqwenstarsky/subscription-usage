import { AccountDetail } from "@/components/AccountDetail";

export default async function AccountPage(props: PageProps<"/accounts/[id]">) {
  const { id } = await props.params;
  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-zinc-100">
      <AccountDetail accountId={id} />
    </div>
  );
}
