import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { auth } from "next-auth";

export async function getSession() {
  return await auth();
}

export async function getCurrentUser() {
  const session = await getSession();
  
  return session?.user;
}

// Simple auth check based on a session cookie
export async function requireAuth() {
  const cookieStore = cookies();
  const sessionToken = cookieStore.get('next-auth.session-token');
  
  if (!sessionToken) {
    redirect('/login');
  }
}

// Use this in server components to protect routes
// Example: export default async function DashboardPage() {
//   await requireAuth();
//   // ... rest of the component code
// } 