// app/(admin)/reports/page.tsx

import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart3, Users, Trophy, TrendingUp, Filter } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import SalesReportView from './components/sales-report-view';
import TeamPerformanceView from './components/team-performance-view';
import TopLeaderReport from './components/top-leader-report';
import TeamManagement from './components/team-management';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <BarChart3 className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reportes y Estadísticas</h1>
          <p className="text-muted-foreground">
            Panel completo de análisis de ventas y rendimiento del equipo.
          </p>
        </div>
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="sales" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Ventas
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Rendimiento
          </TabsTrigger>
          <TabsTrigger value="top-leader" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            Top Leader
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Equipos
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={<ReportsSkeleton />}>
          <TabsContent value="sales" className="space-y-4">
            <SalesReportView />
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <TeamPerformanceView />
          </TabsContent>

          <TabsContent value="top-leader" className="space-y-4">
            <TopLeaderReport />
          </TabsContent>

          <TabsContent value="teams" className="space-y-4">
            <TeamManagement />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}