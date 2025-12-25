import { NextRequest, NextResponse } from "next/server";
import { listVideos } from "@/lib/s3";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // Check for auth cookie
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
  
  if (!authCookie) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const videos = await listVideos();
    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Error listing videos:", error);
    return NextResponse.json(
      { error: "Failed to fetch videos" },
      { status: 500 }
    );
  }
}

