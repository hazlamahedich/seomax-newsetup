import { NextAuthOptions } from "next-auth";
import { User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";
import { signIn } from "@/lib/auth/auth-service";
import NextAuth from "next-auth";

// Extend the built-in session types
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & User;
  }
}

// Define authentication options
export const authOptions: NextAuthOptions = {
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
    error: '/api/auth/error',
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    }
  },
  // Explicitly provide required values to prevent NextAuth from using dynamic APIs
  secret: process.env.NEXTAUTH_SECRET,
};

// Use standard export instead of dynamic exports
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST } 