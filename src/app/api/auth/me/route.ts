import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null }, { status: 401 });
    }
    return NextResponse.json({ user: { id: user.id, email: user.email } });
  } catch (error) {
    console.error("[Auth Me] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
