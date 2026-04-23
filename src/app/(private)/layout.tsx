import { SidebarInset } from "@/components/ui/sidebar";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ClientLayoutWrapper } from "@/components/layout/client-layout-wrapper";

export default async function PrivateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login");
  }

  const user = {
    name: session.user.name ?? session.user.email.split("@")[0],
    email: session.user.email,
  };

  return (
    <ClientLayoutWrapper user={user}>
      <SidebarInset>{children}</SidebarInset>
    </ClientLayoutWrapper>
  );
}
