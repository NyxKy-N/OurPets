"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Camera, Sparkles } from "lucide-react";

import { useI18n } from "@/app/providers";
import { apiFetch } from "@/lib/fetcher";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PetCard, type PetFeedItem } from "@/components/pets/pet-card";
import { PetCardSkeleton } from "@/components/pets/pet-card-skeleton";
import { Reveal } from "@/components/ui/reveal";

type UserMe = {
  id: string;
  name: string | null;
  email?: string | null;
  image: string | null;
  bio?: string | null;
  createdAt: string | Date;
};
type PetsPage = { items: PetFeedItem[]; nextCursor: string | null };
type CloudinarySignature = {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
};
type CloudinaryUploadResponse = {
  secure_url: string;
  public_id: string;
  error?: { message?: string };
};

function errorMessage(err: unknown, fallback: string) {
  if (err instanceof Error) return err.message;
  return fallback;
}

async function getUploadSignature() {
  return apiFetch<CloudinarySignature>("/api/cloudinary/signature", { method: "POST" });
}

async function uploadAvatar(file: File, sig: CloudinarySignature) {
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`, {
    method: "POST",
    body: form,
  });
  const json = (await res.json().catch(() => null)) as CloudinaryUploadResponse | null;
  if (!res.ok) throw new Error(json?.error?.message ?? "Cloudinary upload failed");
  if (!json?.secure_url) throw new Error("Invalid Cloudinary response");
  return json.secure_url;
}

export function ProfileClient({
  userId,
  viewerId,
  initialUser,
}: {
  userId: string;
  viewerId?: string | null;
  initialUser?: UserMe;
}) {
  const router = useRouter();
  const qc = useQueryClient();
  const { messages } = useI18n();
  const isOwner = !initialUser || viewerId === userId;

  const me = useQuery({
    queryKey: ["me"],
    queryFn: () => apiFetch<UserMe>("/api/user"),
    enabled: isOwner,
  });
  const profile = isOwner ? (me.data ?? initialUser) : initialUser;

  const [name, setName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [image, setImage] = React.useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = React.useState(false);
  React.useEffect(() => {
    setName(profile?.name ?? "");
    setBio(profile?.bio ?? "");
    setImage(profile?.image ?? null);
  }, [profile?.bio, profile?.image, profile?.name]);

  const saveProfile = useMutation({
    mutationFn: () =>
      apiFetch<UserMe>("/api/user", {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim() || undefined,
          image: image ?? undefined,
        }),
      }),
    onSuccess: async (data) => {
      toast.success(messages.profile.profileUpdated);
      await qc.invalidateQueries({ queryKey: ["me"] });
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      setName(data.name ?? "");
      setBio(data.bio ?? "");
      setImage(data.image ?? null);
      router.refresh();
    },
    onError: (err: unknown) => toast.error(errorMessage(err, messages.profile.failedToUpdate)),
  });

  async function handleAvatarChange(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const sig = await getUploadSignature();
      const url = await uploadAvatar(file, sig);
      setImage(url);
      toast.success(messages.profile.changeAvatar);
    } catch (err: unknown) {
      toast.error(errorMessage(err, messages.profile.failedToUpdate));
    } finally {
      setUploadingAvatar(false);
    }
  }

  const pets = useInfiniteQuery({
    queryKey: ["pets", { ownerId: userId }],
    queryFn: ({ pageParam }) => {
      const sp = new URLSearchParams();
      sp.set("limit", "12");
      sp.set("ownerId", userId);
      if (pageParam) sp.set("cursor", String(pageParam));
      return apiFetch<PetsPage>(`/api/pets?${sp.toString()}`);
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  const petItems = pets.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <div className="space-y-6">
      <Reveal>
        <Card className="rounded-[34px] p-5 sm:p-7">
          <div className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
            {isOwner ? messages.profile.title : messages.header.profile}
          </div>
          <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">
            {isOwner ? messages.profile.title : profile?.name ?? messages.common.user}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
            {isOwner ? messages.profile.description : profile?.bio || messages.profile.publicDescription}
          </p>

          <div className="mt-6 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="glass-panel rounded-[28px] p-5 sm:p-6">
              <div className="flex flex-col items-center text-center">
                <div className="relative">
                  <Avatar className="h-28 w-28 rounded-[30px] border border-border/70">
                    <AvatarImage src={image ?? undefined} />
                    <AvatarFallback className="text-3xl">
                      {name?.slice(0, 1)?.toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  {isOwner ? (
                    <label className="absolute -bottom-2 -right-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-border/70 bg-background/85 shadow-[0_12px_32px_hsl(var(--foreground)/0.12)] transition-transform duration-300 ease-out hover:scale-[1.03]">
                      <Camera className="h-4 w-4" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleAvatarChange(e.target.files)}
                        disabled={uploadingAvatar}
                      />
                    </label>
                  ) : null}
                </div>
                <div className="mt-4 text-sm font-medium">{messages.profile.avatar}</div>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">{messages.profile.avatarHint}</p>
                {isOwner ? (
                  <div className="mt-4 text-xs text-muted-foreground">
                    {uploadingAvatar ? messages.common.loading : messages.profile.changeAvatar}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-3">
              <div className="glass-panel rounded-[26px] p-4 sm:p-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{messages.profile.displayName}</label>
                  {isOwner ? (
                    <>
                      <Input value={name} onChange={(e) => setName(e.target.value)} />
                      <div className="text-xs text-muted-foreground">
                        {messages.profile.signedInAs}: {me.data?.email ?? "…"}
                      </div>
                    </>
                  ) : (
                    <div className="rounded-[18px] border border-border/60 bg-background/55 px-4 py-3 text-sm">
                      {profile?.name ?? messages.common.user}
                    </div>
                  )}
                </div>
              </div>

              <div className="glass-panel rounded-[26px] p-4 sm:p-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">{messages.profile.bio}</label>
                  {isOwner ? (
                    <>
                      <Textarea
                        rows={4}
                        maxLength={160}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        placeholder={messages.profile.bioPlaceholder}
                      />
                      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{messages.profile.bioPlaceholder}</span>
                        <span>{bio.length}/160</span>
                      </div>
                    </>
                  ) : (
                    <div className="min-h-24 whitespace-pre-wrap rounded-[18px] border border-border/60 bg-background/55 px-4 py-3 text-sm leading-7">
                      {profile?.bio || messages.profile.emptyBio}
                    </div>
                  )}
                </div>
              </div>

              {isOwner ? (
                <div className="flex justify-end">
                  <Button
                    onClick={() => saveProfile.mutate()}
                    disabled={
                      saveProfile.isPending ||
                      uploadingAvatar ||
                      !name.trim() ||
                      (name.trim() === (me.data?.name ?? "") &&
                        bio.trim() === (me.data?.bio ?? "") &&
                        (image ?? null) === (me.data?.image ?? null))
                    }
                    className="w-full sm:w-auto"
                  >
                    {messages.common.save}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        </Card>
      </Reveal>

      <Reveal delay={90}>
        <section className="space-y-4">
          <div className="glass-panel rounded-[30px] p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="text-xs font-medium tracking-[0.22em] text-muted-foreground uppercase">
                  {isOwner ? messages.profile.yourPets : messages.profile.sharedPets}
                </div>
                <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em]">
                  {isOwner ? messages.profile.yourPets : messages.profile.sharedPets}
                </h2>
              </div>
              {isOwner ? (
                <Button asChild variant="outline">
                  <Link href="/pets/new" prefetch={false}>
                    {messages.header.addPet}
                  </Link>
                </Button>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4">
            {pets.isLoading ? (
              <>
                <PetCardSkeleton />
                <PetCardSkeleton />
              </>
            ) : petItems.length === 0 ? (
              <div className="glass-panel relative overflow-hidden rounded-[28px] p-10 text-center text-sm text-muted-foreground">
                <div className="absolute left-8 top-8 h-16 w-16 rounded-full bg-primary/10 blur-2xl" />
                <div className="absolute bottom-6 right-8 h-20 w-20 rounded-full bg-amber-400/10 blur-2xl" />
                <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-border/60 bg-background/75">
                  <Sparkles className="h-7 w-7 text-primary" />
                </div>
                <div className="mt-4 text-lg font-semibold tracking-[-0.03em]">{messages.profile.empty}</div>
                <p className="mx-auto mt-2 max-w-md leading-6">
                  {isOwner ? messages.home.ctaDescription : messages.profile.emptyPublic}
                </p>
              </div>
            ) : (
              petItems.map((p, index) => (
                <Reveal key={p.id} delay={Math.min(index * 70, 280)}>
                  <PetCard pet={p} />
                </Reveal>
              ))
            )}
          </div>

          {pets.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => pets.fetchNextPage()}
                disabled={pets.isFetchingNextPage}
              >
                {pets.isFetchingNextPage ? messages.common.loading : messages.comments.loadMore}
              </Button>
            </div>
          ) : null}
        </section>
      </Reveal>
    </div>
  );
}
