// app/(admin)/dashboard/page.tsx

/*
 * =================================================================
 * OBJETIVOS DEL MÓDULO: REPORTES Y DASHBOARDS
 * =================================================================
 * * 1. Reportes y Dashboards:
 * - Crear un módulo de reportes que replique los informes de 
 * productividad de Excel. Esto implicará desarrollar una nueva 
 * sección o página (ej: /reports) con funcionalidades de 
 * filtrado avanzado (por fechas, agentes, equipos, etc.) y 
 * la capacidad de exportar los datos (ej: a CSV o PDF).
 * * 2. Vistas Jerárquicas en Dashboards:
 * - Diseñar dashboards con vistas jerárquicas: agentes ven sus 
 * datos, managers los de su equipo, y la dirección (super_admin)
 * ve el panorama completo.
 * - ESTADO ACTUAL: Esta funcionalidad ya está implementada.
 * El componente `DashboardContent` y la función `getDashboardStats`
 * trabajan juntos para filtrar los datos y renderizar el panel
 * adecuado según el rol del usuario que ha iniciado sesión.
 * * =================================================================
 */

import { Suspense } from 'react';
import { getDashboardStats } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Users, FileText, DollarSign, TrendingUp, ArrowUpRight, ArrowDownRight, PlusCircle, ArrowRight, UserCheck, Clock, FileWarning, Building } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { type TeamPerformance } from './actions'; // Importa el tipo TeamPerformance

// --- Mapeo de Estados (sin cambios) ---
const statusConfig = {
  'new_lead': { label: 'Lead Nuevo', color: 'bg-blue-500' },
  'contacting': { label: 'Contactando', color: 'bg-yellow-500' },
  'info_captured': { label: 'Info. Capturada', color: 'bg-purple-500' },
  'in_review': { label: 'En Revisión', color: 'bg-orange-500' },
  'missing_docs': { label: 'Faltan Docs', color: 'bg-red-600' },
  'sent_to_carrier': { label: 'En Aseguradora', color: 'bg-indigo-500' },
  'approved': { label: 'Aprobada', color: 'bg-green-500' },
  'rejected': { label: 'Rechazada', color: 'bg-destructive' },
  'active': { label: 'Activa', color: 'bg-emerald-500' },
  'cancelled': { label: 'Cancelada', color: 'bg-gray-500' },
};

// --- COMPONENTE PRINCIPAL DEL DASHBOARD ---
export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}

// --- CONTENIDO DEL DASHBOARD ---
async function DashboardContent() {
  const stats = await getDashboardStats();

  const roleDashboardMap = {
    super_admin: <AdminManagerDashboard stats={stats} title="Panel Global de Administrador" />,
    manager: <AdminManagerDashboard stats={stats} title="Panel de Equipo" />,
    agent: <AgentDashboard stats={stats} />,
    processor: <ProcessorDashboard stats={stats} />,
    commission_analyst: <CommissionAnalystDashboard stats={stats} />,
    customer_service: <CustomerServiceDashboard stats={stats} />,
  };

  return roleDashboardMap[stats.userRole as keyof typeof roleDashboardMap] || <DefaultDashboard stats={stats} />;
}

// --- PANELES ESPECÍFICOS PARA CADA ROL ---

// Panel para Super Admin y Manager
function AdminManagerDashboard({ stats, title }: { stats: Awaited<ReturnType<typeof getDashboardStats>>, title: string }) {
  const teamPerformance = stats.teamPerformance as TeamPerformance[]; // Asegura el tipo aquí

  return (
    <>
      <DashboardHeader title={title} buttonLabel="Gestionar Equipo" buttonHref="/team" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Clientes del Equipo" value={stats.totalCustomers} icon={Users} />
        <StatCard title="Pólizas del Equipo" value={stats.totalPolicies} icon={FileText} />
        {stats.userRole === 'super_admin' && <StatCard title="Comisiones Totales" value={formatCurrency(Number(stats.totalCommissions))} icon={DollarSign} />}
        <StatCard title="Pólizas Activas" value={stats.policyStatusCounts.find(s => s.status === 'active')?.count || 0} icon={TrendingUp} />
      </div>
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Rendimiento del Equipo</CardTitle>
          <CardDescription>Métricas clave de los agentes bajo tu supervisión.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre del Agente</TableHead>
                <TableHead>Pólizas Creadas</TableHead>
                <TableHead>Pólizas Activas</TableHead>
                <TableHead>Clientes Creados</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamPerformance.map(agent => (
                <TableRow key={agent.agentId}>
                  <TableCell className="font-medium">{agent.agentName}</TableCell>
                  <TableCell>{agent.totalPolicies}</TableCell>
                  <TableCell>{agent.activePolicies}</TableCell>
                  <TableCell>{agent.totalCustomers}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

// Panel para Agente
function AgentDashboard({ stats }: { stats: Awaited<ReturnType<typeof getDashboardStats>> }) {
  return (
    <>
      <DashboardHeader title="Tu Panel de Agente" buttonLabel="Añadir Cliente" buttonHref="/customers" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Mis Clientes" value={stats.totalCustomers} icon={Users} />
        <StatCard title="Mis Pólizas" value={stats.totalPolicies} icon={FileText} />
        <StatCard title="Pólizas Activas" value={stats.policyStatusCounts.find(s => s.status === 'active')?.count || 0} icon={TrendingUp} />
      </div>
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Mis Pólizas Recientes</CardTitle>
          <CardDescription>Tus últimas pólizas registradas y sus estados.</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentPoliciesTable policies={stats.recentPolicies} />
        </CardContent>
        <CardFooter className="justify-end">
          <Button asChild variant="ghost" size="sm">
            <Link href="/policies">Ver todas mis pólizas <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </CardFooter>
      </Card>
    </>
  );
}

// Panel para Analista de Comisiones
function CommissionAnalystDashboard({ stats }: { stats: Awaited<ReturnType<typeof getDashboardStats>> }) {
  return (
    <>
      <DashboardHeader title="Panel de Comisiones" buttonLabel="Gestionar Comisiones" buttonHref="/commissions" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="Comisiones Totales" value={formatCurrency(Number(stats.totalCommissions))} icon={DollarSign} />
        <StatCard title="Pólizas Aprobadas" value={stats.policyStatusCounts.find(s => s.status === 'approved')?.count || 0} icon={UserCheck} />
        <StatCard title="Lotes Pendientes" value={3} icon={Clock} />
      </div>
      <Card><CardHeader><CardTitle>Lotes de Comisiones Recientes</CardTitle></CardHeader></Card>
    </>
  );
}

// Panel para Procesador
function ProcessorDashboard({ stats }: { stats: Awaited<ReturnType<typeof getDashboardStats>> }) {
  const inReviewCount = stats.policyStatusCounts.find(s => s.status === 'in_review')?.count || 0;
  const missingDocsCount = stats.policyStatusCounts.find(s => s.status === 'missing_docs')?.count || 0;
  const sentToCarrierCount = stats.policyStatusCounts.find(s => s.status === 'sent_to_carrier')?.count || 0;

  return (
    <>
      <DashboardHeader title="Panel de Procesamiento" buttonLabel="Ir a Procesamiento" buttonHref="/processing" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <StatCard title="En Revisión" value={inReviewCount} icon={Clock} />
        <StatCard title="Faltan Documentos" value={missingDocsCount} icon={FileWarning} />
        <StatCard title="En Aseguradora" value={sentToCarrierCount} icon={Building} />
      </div>
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Cola de Procesamiento</CardTitle>
          <CardDescription>Pólizas que requieren tu atención.</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentPoliciesTable policies={stats.recentPolicies.filter(p => ['in_review', 'missing_docs'].includes(p.status))} />
        </CardContent>
      </Card>
    </>
  );
}

// Panel para Servicio al Cliente
function CustomerServiceDashboard({ stats }: { stats: Awaited<ReturnType<typeof getDashboardStats>> }) {
  return (
    <>
      <DashboardHeader title="Panel de Servicio al Cliente" buttonLabel="Ver Clientes" buttonHref="/customers" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
        <StatCard title="Clientes Totales" value={stats.totalCustomers} icon={Users} />
        <StatCard title="Pólizas Activas" value={stats.policyStatusCounts.find(s => s.status === 'active')?.count || 0} icon={TrendingUp} />
      </div>
      <Card className="card-shadow">
        <CardHeader><CardTitle>Clientes Recientes</CardTitle></CardHeader>
        <CardContent><RecentPoliciesTable policies={stats.recentPolicies} /></CardContent>
      </Card>
    </>
  );
}

// Panel por defecto
function DefaultDashboard({ stats }: { stats: Awaited<ReturnType<typeof getDashboardStats>> }) {
  return <AdminManagerDashboard stats={stats} title="Panel de Control" />;
}

// Componentes reutilizables
function DashboardHeader({ title, buttonLabel, buttonHref }: { title: string; buttonLabel: string; buttonHref: string; }) {
  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{title}</h1>
        <p className="text-muted-foreground mt-1">Resumen de la actividad reciente.</p>
      </div>
      <Button asChild>
        <Link href={buttonHref}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Link>
      </Button>
    </header>
  );
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType; }) {
  return (
    <Card className="card-shadow transition-transform hover:-translate-y-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
      </CardHeader>
      <CardContent><div className="text-2xl font-bold text-foreground">{value}</div></CardContent>
    </Card>
  );
}

function RecentPoliciesTable({ policies }: { policies: Awaited<ReturnType<typeof getDashboardStats>>['recentPolicies'] }) {
  return (
    <Table>
      <TableHeader><TableRow><TableHead>Cliente</TableHead><TableHead>Aseguradora</TableHead><TableHead className="text-right">Prima Mensual</TableHead><TableHead className="text-center">Estado</TableHead></TableRow></TableHeader>
      <TableBody>
        {policies.map((policy) => (
          <TableRow key={policy.id}>
            <TableCell className="font-medium">{policy.customerName}</TableCell>
            <TableCell className="text-muted-foreground">{policy.insuranceCompany || 'N/A'}</TableCell>
            <TableCell className="text-right font-mono">{policy.monthlyPremium ? formatCurrency(Number(policy.monthlyPremium)) : '-'}</TableCell>
            <TableCell className="text-center"><Badge variant="outline" className="font-semibold">{statusConfig[policy.status as keyof typeof statusConfig]?.label || 'Desconocido'}</Badge></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-80" />
        </div>
        <Skeleton className="h-10 w-40" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
        <Skeleton className="h-28" />
      </div>
      <Skeleton className="h-96" />
    </>
  );
}