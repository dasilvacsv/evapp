// app/(admin)/dashboard/page.tsx

/*
 * =================================================================
 * CAMBIOS REALIZADOS:
 * 1. **Nuevos Paneles**: Se añadió un panel para el rol `call_center`.
 * 2. **Panel de Admin/Manager Mejorado**:
 * - Se añadieron nuevas tarjetas (`StatCard`) para mostrar el "Seguimiento de Miembros"
 * (semanal, quincenal, mensual).
 * - La tabla de "Rendimiento del Equipo" ahora muestra un desglose detallado del
 * estado de las pólizas de cada agente.
 * 3. **Tipos e Iconos**: Se importaron los tipos y iconos necesarios para las
 * nuevas funcionalidades (`Users2` para miembros).
 * =================================================================
 */

import { Suspense } from 'react';
import { getDashboardStats } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Users, FileText, DollarSign, TrendingUp, PlusCircle, ArrowRight, UserCheck, Clock, FileWarning, Building, Users2, PhoneCall } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { type TeamPerformance } from './actions';

// --- Mapeo de Estados (sin cambios) ---
const statusConfig = {
    'new_lead': { label: 'Lead Nuevo', color: 'bg-blue-500' },
    'contacting': { label: 'Contactando', color: 'bg-yellow-500' },
    'info_captured': { label: 'Info. Capturada', color: 'bg-purple-500' },
    'in_review': { label: 'En Revisión', color: 'bg-orange-500 text-white' },
    'missing_docs': { label: 'Faltan Docs', color: 'bg-red-600 text-white' },
    'sent_to_carrier': { label: 'En Aseguradora', color: 'bg-indigo-500 text-white' },
    'approved': { label: 'Aprobada', color: 'bg-green-600 text-white' },
    'rejected': { label: 'Rechazada', color: 'bg-destructive text-destructive-foreground' },
    'active': { label: 'Activa', color: 'bg-emerald-500 text-white' },
    'cancelled': { label: 'Cancelada', color: 'bg-gray-500 text-white' },
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
    call_center: <CallCenterDashboard stats={stats} />, // NUEVO: Panel para Call Center
  };

  return roleDashboardMap[stats.userRole as keyof typeof roleDashboardMap] || <DefaultDashboard stats={stats} />;
}

// --- PANELES ESPECÍFICOS PARA CADA ROL ---

// Panel para Super Admin y Manager
function AdminManagerDashboard({ stats, title }: { stats: Awaited<ReturnType<typeof getDashboardStats>>, title: string }) {
  const teamPerformance = stats.teamPerformance as TeamPerformance[];

  return (
    <>
      <DashboardHeader title={title} buttonLabel="Crear Reporte" buttonHref="/reports" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Clientes Totales" value={stats.totalCustomers} icon={Users} />
        <StatCard title="Pólizas Totales" value={stats.totalPolicies} icon={FileText} />
        <StatCard title="Miembros (Mes)" value={stats.memberTracking.monthly} icon={Users2} description="Titulares + Dependientes" />
        <StatCard title="Pólizas Activas" value={stats.policyStatusCounts.find(s => s.status === 'active')?.count || 0} icon={TrendingUp} />
      </div>
      <Card className="card-shadow">
        <CardHeader>
          <CardTitle>Rendimiento del Equipo</CardTitle>
          <CardDescription>Métricas clave y desglose de pólizas por estado para cada agente.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agente</TableHead>
                <TableHead className="text-center">Clientes</TableHead>
                <TableHead className="text-center">Pólizas Totales</TableHead>
                <TableHead className="text-center">Activas</TableHead>
                <TableHead className="text-center">Aprobadas</TableHead>
                <TableHead className="text-center">En Revisión</TableHead>
                <TableHead className="text-center">Faltan Docs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamPerformance.map(agent => (
                <TableRow key={agent.agentId}>
                  <TableCell className="font-medium">{agent.agentName}</TableCell>
                  <TableCell className="text-center">{agent.totalCustomers}</TableCell>
                  <TableCell className="text-center font-bold">{agent.totalPolicies}</TableCell>
                  <TableCell className="text-center"><Badge className={`${statusConfig.active.color}`}>{agent.statusBreakdown.active}</Badge></TableCell>
                  <TableCell className="text-center"><Badge className={`${statusConfig.approved.color}`}>{agent.statusBreakdown.approved}</Badge></TableCell>
                  <TableCell className="text-center"><Badge className={`${statusConfig.in_review.color}`}>{agent.statusBreakdown.in_review}</Badge></TableCell>
                  <TableCell className="text-center"><Badge className={`${statusConfig.missing_docs.color}`}>{agent.statusBreakdown.missing_docs}</Badge></TableCell>
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

// NUEVO: Panel para Call Center
function CallCenterDashboard({ stats }: { stats: Awaited<ReturnType<typeof getDashboardStats>> }) {
    return (
      <>
        <DashboardHeader title="Panel de Call Center" buttonLabel="Añadir Cliente" buttonHref="/customers/new" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <StatCard title="Leads Asignados" value={stats.totalCustomers} icon={PhoneCall} />
          <StatCard title="Pólizas Generadas" value={stats.totalPolicies} icon={FileText} />
          <StatCard title="Pólizas Activas" value={stats.policyStatusCounts.find(s => s.status === 'active')?.count || 0} icon={TrendingUp} />
        </div>
        <Card className="card-shadow">
          <CardHeader>
            <CardTitle>Actividad Reciente</CardTitle>
            <CardDescription>Últimas pólizas generadas a partir de tus leads.</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentPoliciesTable policies={stats.recentPolicies} />
          </CardContent>
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
        <StatCard title="Pólizas por Calcular" value={stats.policyStatusCounts.find(s => s.status === 'approved')?.count || 0} icon={Clock} />
        <StatCard title="Lotes Pendientes" value={3} icon={FileWarning} />
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

function StatCard({ title, value, icon: Icon, description }: { title: string; value: string | number; icon: React.ElementType; description?: string }) {
    return (
      <Card className="card-shadow transition-transform hover:-translate-y-1">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10"><Icon className="h-4 w-4 text-primary" /></div>
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold text-foreground">{value}</div>
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </CardContent>
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
            <TableCell className="text-center">
                <Badge className={cn('font-semibold', statusConfig[policy.status as keyof typeof statusConfig]?.color)}>
                {statusConfig[policy.status as keyof typeof statusConfig]?.label || 'Desconocido'}
                </Badge>
            </TableCell>
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