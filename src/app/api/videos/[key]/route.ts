import { NextRequest, NextResponse } from "next/server";
import { getVideoSignedUrl } from "@/lib/s3";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  // Check for auth cookie
  const authCookie = request.cookies.get(AUTH_COOKIE_NAME);
  
  if (!authCookie) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const { key } = await params;
    // Decode the key (it's base64 encoded to handle slashes in S3 keys)
    const decodedKey = Buffer.from(key, "base64").toString("utf-8");
    const signedUrl = await getVideoSignedUrl(decodedKey);
    return NextResponse.json({ url: signedUrl });
  } catch (error) {
    console.error("Error generating signed URL:", error);
    return NextResponse.json(
      { error: "Failed to generate video URL" },
      { status: 500 }
    );
  }
}

