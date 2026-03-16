import { NextResponse } from "next/server";
import { signIn, createSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const { user, token, error } = await signIn(email, password);
    if (error || !user || !token) {
      return NextResponse.json({ error: error || "Sign in failed" }, { status: 401 });
    }

    await createSessionCookie(token);

    return NextResponse.json({
      user: { id: user.id, email: user.email },
    });
  } catch (error) {
    console.error("[Auth Signin] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
