import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import type { DefaultSession, NextAuthConfig } from "next-auth";
import { z } from "zod";
import { signIn } from "@/lib/auth/auth-service";

// Extend the built-in session types
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const authOptions: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const parsedCredentials = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);
          
        if (!parsedCredentials.success) {
          return null;
        }
        
        const { email, password } = parsedCredentials.data;
        
        // Use the auth service to sign in with Supabase
        const result = await signIn(email, password);
        
        if (!result.success || !result.data) {
          return null;
        }
        
        return {
          id: result.data.userId,
          email: result.data.email,
          name: result.data.name || null,
        };
      }
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/login',
  },
  callbacks: {
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.sub as string;
      }
      return session;
    },
  },
}

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST }; 