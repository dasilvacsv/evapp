// app/(admin)/reports/page.tsx

import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartBar as BarChart3, Users, Trophy, TrendingUp, ListFilter as Filter, ChartPie as PieChart, ChartLine as LineChart, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import SalesReportView from './components/sales-report-view';
import TeamPerformanceView from './components/team-performance-view';
import TopLeaderReport from './components/top-leader-report';
import TeamManagement from './components/team-management';
import AdvancedAnalytics from './components/advanced-analytics';

export default function ReportsPage() {
  return (
    <div className="space-y-8 p-6 bg-gradient-to-br from-slate-50 to-blue-50/30 min-h-screen">
      <div className="flex items-center space-x-3">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
          <BarChart3 className="h-8 w-8 text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Centro de Análisis y Reportes
          </h1>
          <p className="text-muted-foreground text-lg mt-1">
            Panel completo de análisis avanzado, métricas de rendimiento y visualización de datos
          </p>
        </div>
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList className="grid grid-cols-5 w-full max-w-4xl bg-white/60 backdrop-blur-sm border-0 shadow-lg p-1">
          <TabsTrigger value="sales" className="flex items-center gap-2 data-[state=active]:bg-blue-500 data-[state=active]:text-white">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">Ventas</span>
          </TabsTrigger>
          <TabsTrigger value="performance" className="flex items-center gap-2 data-[state=active]:bg-green-500 data-[state=active]:text-white">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">Rendimiento</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2 data-[state=active]:bg-purple-500 data-[state=active]:text-white">
            <PieChart className="h-4 w-4" />
            <span className="hidden sm:inline">Analytics</span>
          </TabsTrigger>
          <TabsTrigger value="top-leader" className="flex items-center gap-2 data-[state=active]:bg-yellow-500 data-[state=active]:text-white">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Top Leader</span>
          </TabsTrigger>
          <TabsTrigger value="teams" className="flex items-center gap-2 data-[state=active]:bg-indigo-500 data-[state=active]:text-white">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Equipos</span>
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={<ReportsSkeleton />}>
          <TabsContent value="sales" className="space-y-6">
            <SalesReportView />
          </TabsContent>

          <TabsContent value="performance" className="space-y-6">
            <TeamPerformanceView />
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <AdvancedAnalytics />
          </TabsContent>

          <TabsContent value="top-leader" className="space-y-6">
            <TopLeaderReport />
          </TabsContent>

          <TabsContent value="teams" className="space-y-6">
            <TeamManagement />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}

function ReportsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}