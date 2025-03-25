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
        try {
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
        } catch (error) {
          console.error("Error in authorize callback:", error);
          return null;
        }
      }
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 24 * 60 * 60, // 24 hours
  },
  pages: {
    signIn: '/login',
    signOut: '/',
    error: '/api/auth/error',
  },
  callbacks: {
    async session({ session, token }) {
      try {
        if (session.user && token.sub) {
          session.user.id = token.sub;
        }
        return session;
      } catch (error) {
        console.error("Error in session callback:", error);
        return session;
      }
    },
    async jwt({ token, user }) {
      try {
        if (user) {
          token.id = user.id;
        }
        return token;
      } catch (error) {
        console.error("Error in JWT callback:", error);
        return token;
      }
    }
  },
  // Explicitly provide required values to prevent NextAuth from using dynamic APIs
  secret: process.env.NEXTAUTH_SECRET,
  // Add debug mode in development
  debug: process.env.NODE_ENV === 'development',
};

// Use standard export instead of custom handler
const handler = NextAuth(authOptions);

// Add some diagnostic logging to help identify auth issues
console.log("[NextAuth] Auth API handler initialized, API route configured");

export { handler as GET, handler as POST } 