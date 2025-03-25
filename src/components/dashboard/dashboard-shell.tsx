import React from 'react';

interface DashboardShellProps {
  children: React.ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen flex-col space-y-6">
      <main className="grid flex-1 gap-6 p-6">
        <div className="flex flex-col gap-6">
          {children}
        </div>
      </main>
    </div>
  );
} 