import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/password";

const ADMIN_BOOTSTRAP_EMAIL =
  process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@playbeat.live";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase();
        const password = credentials?.password ?? "";
        if (!email || !password) return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user || !user.password) return null;

        const ok = await verifyPassword(password, user.password);
        if (!ok) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
          role: user.role,
          plan: user.plan,
          region: user.region,
        } as {
          id: string;
          email: string;
          name?: string | null;
          image?: string | null;
          role: string;
          plan: string;
          region: string;
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      // Initial sign-in: persist user fields into the token
      if (user) {
        const u = user as {
          id: string;
          email: string;
          name?: string | null;
          image?: string | null;
          role?: string;
          plan?: string;
          region?: string;
        };
        token.id = u.id;
        token.role = u.role ?? "user";
        token.plan = u.plan ?? "free";
        token.region = u.region ?? "PK";
        if (u.image) token.picture = u.image;
      }

      // Allow client-triggered plan refresh via update()
      if (trigger === "update" && session?.plan) {
        token.plan = session.plan as string;
      }

      // Always re-sync role/plan/region from DB if we have a user id (cheap, keeps admin changes live)
      if (token.id) {
        const fresh = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, plan: true, name: true, image: true, planExpires: true, region: true },
        });
        if (fresh) {
          token.role = fresh.role;
          token.plan = fresh.plan;
          token.region = fresh.region;
          token.name = fresh.name ?? token.name;
          if (fresh.image) token.picture = fresh.image;
          token.planExpires = fresh.planExpires?.toISOString() ?? null;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
        (session.user as { plan?: string }).plan = token.plan as string;
        (session.user as { region?: string }).region = token.region as string;
        (session.user as { planExpires?: string | null }).planExpires =
          (token.planExpires as string | null) ?? null;
        if (token.picture) session.user.image = token.picture as string;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Bootstrap: the configured admin email becomes an admin on first sign-up.
      if (user.email?.toLowerCase() === ADMIN_BOOTSTRAP_EMAIL.toLowerCase()) {
        await db.user.update({
          where: { id: user.id },
          data: { role: "admin", plan: "yearly", planExpires: new Date(Date.now() + 365 * 24 * 3600 * 1000) },
        });
      }
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Augment NextAuth types with our custom fields.
declare module "next-auth" {
  interface Session {
    user: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role?: string;
      plan?: string;
      region?: string;
      planExpires?: string | null;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    plan?: string;
    region?: string;
    planExpires?: string | null;
  }
}
