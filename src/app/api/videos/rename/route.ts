import { NextResponse } from "next/server";
import { updateVideoDisplayName } from "@/lib/s3";
import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  // Check authentication
  const cookieStore = await cookies();
  const authCookie = cookieStore.get(AUTH_COOKIE_NAME);

  if (!authCookie?.value) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { videoKey, displayName } = await request.json();

    if (!videoKey || typeof displayName !== "string") {
      return NextResponse.json(
        { error: "Missing videoKey or displayName" },
        { status: 400 }
      );
    }

    await updateVideoDisplayName(videoKey, displayName.trim());

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Failed to rename video:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to rename video", details: message },
      { status: 500 }
    );
  }
}

