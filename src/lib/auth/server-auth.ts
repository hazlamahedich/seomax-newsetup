import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getServerSession } from "next-auth";

export async function getSession() {
  return await getServerSession(authOptions);
}

export async function getCurrentUser() {
  const session = await getSession();
  
  return session?.user;
}

// Simple auth check based on a session cookie
export async function requireAuth() {
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  return session;
}

// Use this in server components to protect routes
// Example: export default async function DashboardPage() {
//   await requireAuth();
//   // ... rest of the component code
// } 