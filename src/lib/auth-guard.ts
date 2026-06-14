import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function requireAuth(): Promise<NextResponse | null> {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
