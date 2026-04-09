import { notFound, redirect } from "next/navigation";

import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth-server";
import { ProfileClient } from "@/components/profile/profile-client";

type PageProps = { params: Promise<{ id: string }> };

export default async function PublicProfilePage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const viewerId = session?.user?.id ?? null;

  if (viewerId === id) redirect("/profile");

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      image: true,
      bio: true,
      createdAt: true,
    },
  });

  if (!user) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:py-8 lg:py-10">
      <ProfileClient userId={user.id} viewerId={viewerId} initialUser={user} />
    </div>
  );
}
