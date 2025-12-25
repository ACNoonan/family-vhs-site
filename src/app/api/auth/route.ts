import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, generateSessionToken, AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    if (verifyPassword(password)) {
      const token = generateSessionToken();
      const response = NextResponse.json({ success: true });
      
      // Set HTTP-only cookie for session
      response.cookies.set(AUTH_COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
      });

      return response;
    }

    return NextResponse.json(
      { success: false, error: "Invalid password" },
      { status: 401 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete(AUTH_COOKIE_NAME);
  return response;
}

