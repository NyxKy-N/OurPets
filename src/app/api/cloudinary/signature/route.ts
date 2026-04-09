import { NextResponse } from "next/server";

import { createCloudinaryUploadSignature } from "@/lib/cloudinary";
import { env } from "@/lib/env";
import { handleRouteError } from "@/lib/http";
import { requireUser } from "@/lib/auth-server";

export async function POST() {
  try {
    // Signed uploads only; require auth.
    await requireUser();

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = env.CLOUDINARY_UPLOAD_FOLDER;

    const payload = createCloudinaryUploadSignature({ timestamp, folder });
    return NextResponse.json({ ok: true, data: payload });
  } catch (err) {
    return handleRouteError(err);
  }
}

