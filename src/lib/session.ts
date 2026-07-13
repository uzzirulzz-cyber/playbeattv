import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db, withRetry } from "@/lib/db";

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  plan: string;
  planExpires: Date | null;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return null;
    const user = await withRetry(() =>
      db.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          email: true,
          name: true,
          image: true,
          role: true,
          plan: true,
          planExpires: true,
        },
      })
    );
    return user;
  } catch (err) {
    console.error("getCurrentUser error:", err);
    return null;
  }
}

export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    const err = new Error("UNAUTHORIZED");
    (err as Error & { status?: number }).status = 401;
    throw err;
  }
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.role !== "admin") {
    const err = new Error("FORBIDDEN");
    (err as Error & { status?: number }).status = 403;
    throw err;
  }
  return user;
}
