import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth-server";
import { ProfileClient } from "@/components/profile/profile-client";

export default async function ProfilePage() {
  const session = await getSession();
  if (!session?.user?.id) redirect("/");

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8 lg:py-10">
      <ProfileClient userId={session.user.id} />
    </div>
  );
}
