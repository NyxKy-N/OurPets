# OurPets

Production-ready social platform for users to share and explore pets.

**Stack (strict):** Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Prisma + PostgreSQL (Aiven) + NextAuth (Google OAuth only) + TanStack Query + Zod + Cloudinary.

---

## Folder structure

```
prisma/
  schema.prisma
src/
  app/
    api/
      auth/[...nextauth]/route.ts
      cloudinary/signature/route.ts
      comments/[id]/route.ts
      comments/route.ts
      likes/route.ts
      pets/[id]/route.ts
      pets/route.ts
      user/route.ts
    pet/[id]/edit/page.tsx
    pet/[id]/page.tsx
    pets/new/page.tsx
    profile/page.tsx
    layout.tsx
    page.tsx
    providers.tsx
    globals.css
  components/
    layout/header.tsx
    pets/
      pet-card.tsx
      pet-card-skeleton.tsx
      pet-detail.tsx
      pet-feed.tsx
      pet-form.tsx
    profile/profile-client.tsx
    social/comments.tsx
    ui/ (shadcn-style primitives)
  lib/
    auth.ts
    auth-server.ts
    cloudinary.ts
    db.ts
    env.ts
    fetcher.ts
    http.ts
    utils.ts
    validators/
      comments.ts
      likes.ts
      pets.ts
      user.ts
  types/
    next-auth.d.ts
```

---

## Local development

1) Install dependencies
```bash
npm install
```

2) Configure env vars
```bash
cp .env.example .env
```

3) Run migrations (create DB tables)
```bash
npx prisma migrate dev
```

4) Start dev server
```bash
npm run dev
```

---

## Aiven PostgreSQL (SSL enforced)

Use the Aiven connection string and append `sslmode=require`:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?sslmode=require&schema=public"
```

Then apply schema:
```bash
npx prisma migrate dev
```

---

## Auth (Google OAuth only)

Create OAuth credentials in Google Cloud Console:

- Authorized JavaScript origins: `http://localhost:3000`
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

Set env vars:
```
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=...
```

---

## Cloudinary (signed uploads)

Create a Cloudinary API key/secret and set:

```
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
CLOUDINARY_UPLOAD_FOLDER=ourpets
```

Client uploads use `/api/cloudinary/signature` so secrets never reach the browser.

---

## Deployment (Vercel)

1) Push this repo to GitHub.
2) Import into Vercel.
3) Add environment variables from `.env.example` in Vercel Project Settings.
4) Set the production OAuth redirect URI:
   - `https://YOUR_DOMAIN.com/api/auth/callback/google`
5) Deploy.

Prisma in production:
```bash
npm run prisma:migrate
```

---

## API endpoints (App Router Route Handlers)

- `GET/POST /api/pets` (cursor-based infinite scroll; create pet)
- `GET/PATCH/DELETE /api/pets/:id` (detail; owner-only edits/deletes)
- `GET/POST /api/comments` (list by pet; add comment)
- `DELETE /api/comments/:id` (comment-owner only)
- `POST /api/likes` (toggle like; unique constraint prevents duplicates)
- `GET/PATCH /api/user` (me; update display name)

All inputs are validated with Zod and protected with server-side auth checks.
