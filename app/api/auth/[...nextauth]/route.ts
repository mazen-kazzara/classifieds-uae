import NextAuth, { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import FacebookProvider from "next-auth/providers/facebook";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { verifyTOTP } from "@/lib/totp";

const ADMIN_ROLES = ["ADMIN", "CONTENT_ADMIN", "SUPERVISOR"] as const;

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    // ── Google OAuth ──
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [GoogleProvider({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
    // ── Facebook OAuth ──
    ...(process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET
      ? [FacebookProvider({
          clientId: process.env.FACEBOOK_CLIENT_ID,
          clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
        })]
      : []),
    // ── Admin: email + password (+ optional 2FA code) ──
    CredentialsProvider({
      id: "admin-credentials",
      name: "Admin",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "2FA Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.password) return null;
        if (!(ADMIN_ROLES as readonly string[]).includes(user.role)) return null;
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        // 2FA enforcement
        if (user.twoFactorEnabled) {
          const otp = credentials.otp?.trim();
          if (!otp) throw new Error("2FA_REQUIRED");
          if (!user.twoFactorSecret || !verifyTOTP(otp, user.twoFactorSecret)) throw new Error("INVALID_2FA");
        }
        // Start activity timer
        await prisma.user.update({ where: { id: user.id }, data: { lastActivityAt: new Date() } }).catch(() => {});
        return { id: user.id, email: user.email, phone: user.phone, role: user.role };
      },
    }),
    // ── User: phone + password ──
    CredentialsProvider({
      id: "phone-password",
      name: "Phone Password",
      credentials: {
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.password) return null;
        const phone = credentials.phone.replace(/[\s+\-()]/g, "");
        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user || !user.password || !user.phoneVerified) return null;
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        return { id: user.id, phone: user.phone, email: user.email, role: user.role ?? "USER" };
      },
    }),
    // ── User: phone + OTP ──
    CredentialsProvider({
      id: "phone-otp",
      name: "Phone OTP",
      credentials: {
        phone: { label: "Phone", type: "text" },
        otpToken: { label: "OTP Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.otpToken) return null;
        if (credentials.otpToken !== "verified") return null;
        const phone = credentials.phone.replace(/[\s+\-()]/g, "");
        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user) return null;
        return { id: user.id, phone: user.phone, email: user.email, role: user.role ?? "USER" };
      },
    }),
    // ── User: email + password ──
    CredentialsProvider({
      id: "email-password",
      name: "Email Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.password || !user.emailVerified) return null;
        const valid = await bcrypt.compare(credentials.password, user.password);
        if (!valid) return null;
        return { id: user.id, email: user.email, phone: user.phone, role: user.role ?? "USER" };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24h hard max (idle timeout enforced separately by requireAdmin)
    updateAge: 5 * 60,    // refresh token every 5 min of activity
  },
  pages: { signIn: "/admin/login" },
  callbacks: {
    async signIn({ user, account }) {
      // Handle Google/Facebook OAuth — upsert user in DB
      if (account?.provider === "google" || account?.provider === "facebook") {
        const email = user.email?.toLowerCase();
        if (!email) return false;
        try {
          await prisma.user.upsert({
            where: { email },
            update: { name: user.name || undefined, emailVerified: true },
            create: {
              email,
              name: user.name || null,
              emailVerified: true,
              phoneVerified: false,
              provider: account.provider,
            },
          });
        } catch (e) {
          console.error("OAuth upsert error:", e);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role ?? "USER";
        token.phone = (user as any).phone ?? null;
      }
      // For OAuth users, fetch from DB
      if (account?.provider === "google" || account?.provider === "facebook") {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { email: token.email?.toLowerCase() ?? "" },
            select: { id: true, phone: true, role: true, phoneVerified: true, emailVerified: true },
          });
          if (dbUser) {
            token.sub = dbUser.id;
            token.role = dbUser.role ?? "USER";
            token.phone = dbUser.phone ?? null;
            token.phoneVerified = dbUser.phoneVerified ?? false;
          }
        } catch {}
      }
      // Refresh phoneVerified from DB
      if (token.phone) {
        try {
          const u = await prisma.user.findUnique({ where: { phone: token.phone as string }, select: { phoneVerified: true } });
          token.phoneVerified = u?.phoneVerified ?? false;
        } catch {}
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = (token as any).id ?? token.sub;
        (session.user as any).role = token.role ?? "USER";
        (session.user as any).phone = token.phone ?? null;
        (session.user as any).phoneVerified = token.phoneVerified ?? false;
      }
      return session;
    },
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
