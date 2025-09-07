'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import Sidebar from '@/components/sidebar';
import Header from '@/components/header';

export default function DashboardContainer({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-neutral-900">
      <Sidebar 
        isCollapsed={isCollapsed}
        setIsCollapsed={setIsCollapsed}
      />
      <div
        className={cn(
          "flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out",
          isCollapsed ? "md:ml-20" : "md:ml-64"
        )}
      >
        <Header 
          isSidebarCollapsed={isCollapsed}
          toggleSidebar={() => setIsCollapsed((prev) => !prev)}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}