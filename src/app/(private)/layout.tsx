import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Header } from "@/components/header";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header user={session.user} />
      <main className="flex-1 container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
