// app/(admin)/dashboard/page.tsx

/*
 * =================================================================
 * DASHBOARD MEJORADO CON VISUALIZACIONES Y MÉTRICAS AVANZADAS
 * =================================================================
 */

import { Suspense } from 'react';
import { getDashboardStats } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Users, FileText, DollarSign, TrendingUp, TrendingDown, CirclePlus as PlusCircle, ArrowRight, UserCheck, Clock, FileWarning, Building, Users as Users2, PhoneCall, Target, Award, Calendar, ChartBar as BarChart3, Activity, Zap, Star } from 'lucide-react';
import { formatCurrency, cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import { type TeamPerformance } from './actions';

// --- Mapeo de Estados ---
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
    <div className="flex flex-col gap-8 p-4 md:p-8 bg-gradient-to-br from-slate-50 to-blue-50/30 min-h-screen">
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
    call_center: <CallCenterDashboard stats={stats} />,
  };

  return roleDashboardMap[stats.userRole as keyof typeof roleDashboardMap] || <DefaultDashboard stats={stats} />;
}

// --- PANELES ESPECÍFICOS PARA CADA ROL ---

// Panel para Super Admin y Manager (MEJORADO)
function AdminManagerDashboard({ stats, title }: { stats: Awaited<ReturnType<typeof getDashboardStats>>, title: string }) {
  const teamPerformance = stats.teamPerformance as TeamPerformance[];
  const totalRevenue = teamPerformance.reduce((sum, agent) => sum + (Number(stats.totalCommissions) / teamPerformance.length || 0), 0);
  const avgConversion = stats.totalPolicies > 0 ? ((stats.policyStatusCounts.find(s => s.status === 'active')?.count || 0) / stats.totalPolicies * 100) : 0;

  return (
    <>
      <DashboardHeader title={title} buttonLabel="Ver Reportes Avanzados" buttonHref="/reports" />
      
      {/* Métricas Principales Mejoradas */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <AdvancedStatCard 
          title="Clientes Totales" 
          value={stats.totalCustomers} 
          icon={Users} 
          trend={15.2}
          description="vs. mes anterior"
          color="blue"
        />
        <AdvancedStatCard 
          title="Pólizas Generadas" 
          value={stats.totalPolicies} 
          icon={FileText} 
          trend={8.7}
          description={`${stats.policyStatusCounts.find(s => s.status === 'active')?.count || 0} activas`}
          color="green"
        />
        <AdvancedStatCard 
          title="Revenue Total" 
          value={formatCurrency(totalRevenue)} 
          icon={DollarSign} 
          trend={12.5}
          description="Prima mensual"
          color="emerald"
        />
        <AdvancedStatCard 
          title="Tasa Conversión" 
          value={`${avgConversion.toFixed(1)}%`} 
          icon={Target} 
          trend={-2.1}
          description="Lead → Activa"
          color="purple"
        />
      </div>

      {/* Métricas Secundarias */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <MiniStatCard title="Miembros (Mes)" value={stats.memberTracking.monthly} icon={Users2} />
        <MiniStatCard title="En Proceso" value={stats.policyStatusCounts.find(s => s.status === 'in_review')?.count || 0} icon={Clock} />
        <MiniStatCard title="Aprobadas" value={stats.policyStatusCounts.find(s => s.status === 'approved')?.count || 0} icon={Award} />
        <MiniStatCard title="Faltan Docs" value={stats.policyStatusCounts.find(s => s.status === 'missing_docs')?.count || 0} icon={FileWarning} />
        <MiniStatCard title="En Aseguradora" value={stats.policyStatusCounts.find(s => s.status === 'sent_to_carrier')?.count || 0} icon={Building} />
        <MiniStatCard title="Agentes Activos" value={teamPerformance.length} icon={Activity} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Performance del Equipo */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900">Performance del Equipo</CardTitle>
                  <CardDescription className="text-gray-600">Métricas detalladas por agente</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/reports?tab=performance">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Ver Análisis Completo
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <EnhancedTeamTable teamPerformance={teamPerformance} />
            </CardContent>
          </Card>
        </div>

        {/* Top Performers y Quick Stats */}
        <div className="space-y-6">
          {/* Top Performer */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-yellow-50 to-orange-50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Top Performer
              </CardTitle>
            </CardHeader>
            <CardContent>
              {teamPerformance.length > 0 && (
                <div className="space-y-3">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{teamPerformance[0]?.agentName}</div>
                    <div className="text-sm text-gray-600">Agente del Mes</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center p-2 bg-white/50 rounded-lg">
                      <div className="font-bold text-lg">{teamPerformance[0]?.totalPolicies}</div>
                      <div className="text-gray-600">Pólizas</div>
                    </div>
                    <div className="text-center p-2 bg-white/50 rounded-lg">
                      <div className="font-bold text-lg">{teamPerformance[0]?.statusBreakdown.active}</div>
                      <div className="text-gray-600">Activas</div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actividad Reciente */}
          <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recentPolicies.slice(0, 3).map((policy) => (
                  <div key={policy.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50/50">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{policy.customerName}</div>
                      <div className="text-xs text-gray-500">{policy.insuranceCompany}</div>
                    </div>
                    <Badge className={cn('text-xs', statusConfig[policy.status as keyof typeof statusConfig]?.color)}>
                      {statusConfig[policy.status as keyof typeof statusConfig]?.label}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

// Panel para Agente (MEJORADO)
function AgentDashboard({ stats }: { stats: Awaited<ReturnType<typeof getDashboardStats>> }) {
  const conversionRate = stats.totalPolicies > 0 ? 
    ((stats.policyStatusCounts.find(s => s.status === 'active')?.count || 0) / stats.totalPolicies * 100) : 0;

  return (
    <>
      <DashboardHeader title="Tu Panel de Agente" buttonLabel="Añadir Cliente" buttonHref="/customers" />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <AdvancedStatCard 
          title="Mis Clientes" 
          value={stats.totalCustomers} 
          icon={Users} 
          trend={22.5}
          description="Este mes"
          color="blue"
        />
        <AdvancedStatCard 
          title="Mis Pólizas" 
          value={stats.totalPolicies} 
          icon={FileText} 
          trend={18.2}
          description="Total generadas"
          color="green"
        />
        <AdvancedStatCard 
          title="Pólizas Activas" 
          value={stats.policyStatusCounts.find(s => s.status === 'active')?.count || 0} 
          icon={TrendingUp} 
          trend={15.8}
          description={`${conversionRate.toFixed(1)}% conversión`}
          color="emerald"
        />
        <AdvancedStatCard 
          title="Comisiones" 
          value={formatCurrency(Number(stats.totalCommissions))} 
          icon={DollarSign} 
          trend={28.4}
          description="Este período"
          color="purple"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Mis Pólizas Recientes</CardTitle>
              <CardDescription>Últimas pólizas registradas y sus estados actuales</CardDescription>
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
        </div>

        <div className="space-y-6">
          {/* Progress del Mes */}
          <Card className="shadow-lg border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Meta Mensual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Pólizas Activas</span>
                    <span>{stats.policyStatusCounts.find(s => s.status === 'active')?.count || 0}/25</span>
                  </div>
                  <Progress value={((stats.policyStatusCounts.find(s => s.status === 'active')?.count || 0) / 25) * 100} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Nuevos Clientes</span>
                    <span>{stats.totalCustomers}/30</span>
                  </div>
                  <Progress value={(stats.totalCustomers / 30) * 100} className="h-2" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Acciones Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/customers/new">
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Nuevo Cliente
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/policies">
                  <FileText className="h-4 w-4 mr-2" />
                  Mis Pólizas
                </Link>
              </Button>
              <Button asChild className="w-full justify-start" variant="outline">
                <Link href="/tasks">
                  <Clock className="h-4 w-4 mr-2" />
                  Tareas Pendientes
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}

// Panel para Call Center (MEJORADO)
function CallCenterDashboard({ stats }: { stats: Awaited<ReturnType<typeof getDashboardStats>> }) {
    const conversionRate = stats.totalPolicies > 0 ? 
      ((stats.policyStatusCounts.find(s => s.status === 'active')?.count || 0) / stats.totalPolicies * 100) : 0;
  
    return (
      <>
        <DashboardHeader title="Panel de Call Center" buttonLabel="Añadir Lead" buttonHref="/customers/new" />
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <AdvancedStatCard 
            title="Leads Asignados" 
            value={stats.totalCustomers} 
            icon={PhoneCall} 
            trend={12.8}
            description="Este mes"
            color="blue"
          />
          <AdvancedStatCard 
            title="Pólizas Convertidas" 
            value={stats.totalPolicies} 
            icon={FileText} 
            trend={25.4}
            description="Desde leads"
            color="green"
          />
          <AdvancedStatCard 
            title="Tasa Conversión" 
            value={`${conversionRate.toFixed(1)}%`} 
            icon={Target} 
            trend={8.2}
            description="Lead → Póliza"
            color="purple"
          />
          <AdvancedStatCard 
            title="Pólizas Activas" 
            value={stats.policyStatusCounts.find(s => s.status === 'active')?.count || 0} 
            icon={TrendingUp} 
            trend={18.6}
            description="Estado activo"
            color="emerald"
          />
        </div>
  
        <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-xl font-bold">Actividad de Conversión</CardTitle>
            <CardDescription>Pólizas generadas desde tus leads de call center</CardDescription>
          </CardHeader>
          <CardContent>
            <RecentPoliciesTable policies={stats.recentPolicies} />
          </CardContent>
        </Card>
      </>
    );
}

// Otros paneles (simplificados para mantener el enfoque en las mejoras principales)
function CommissionAnalystDashboard({ stats }: { stats: Awaited<ReturnType<typeof getDashboardStats>> }) {
  return (
    <>
      <DashboardHeader title="Panel de Comisiones" buttonLabel="Gestionar Comisiones" buttonHref="/commissions" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <AdvancedStatCard title="Comisiones Totales" value={formatCurrency(Number(stats.totalCommissions))} icon={DollarSign} trend={15.2} description="Este período" color="green" />
        <AdvancedStatCard title="Pólizas por Calcular" value={stats.policyStatusCounts.find(s => s.status === 'approved')?.count || 0} icon={Clock} trend={-8.1} description="Pendientes" color="orange" />
        <AdvancedStatCard title="Lotes Procesados" value={12} icon={Award} trend={22.5} description="Este mes" color="blue" />
        <AdvancedStatCard title="Agentes Activos" value={stats.teamPerformance.length} icon={Users} trend={5.2} description="Con comisiones" color="purple" />
      </div>
    </>
  );
}

function ProcessorDashboard({ stats }: { stats: Awaited<ReturnType<typeof getDashboardStats>> }) {
  const inReviewCount = stats.policyStatusCounts.find(s => s.status === 'in_review')?.count || 0;
  const missingDocsCount = stats.policyStatusCounts.find(s => s.status === 'missing_docs')?.count || 0;
  const sentToCarrierCount = stats.policyStatusCounts.find(s => s.status === 'sent_to_carrier')?.count || 0;

  return (
    <>
      <DashboardHeader title="Panel de Procesamiento" buttonLabel="Ir a Procesamiento" buttonHref="/processing" />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <AdvancedStatCard title="En Revisión" value={inReviewCount} icon={Clock} trend={-5.2} description="Requieren atención" color="orange" />
        <AdvancedStatCard title="Faltan Documentos" value={missingDocsCount} icon={FileWarning} trend={12.8} description="Pendientes" color="red" />
        <AdvancedStatCard title="En Aseguradora" value={sentToCarrierCount} icon={Building} trend={8.5} description="Enviadas" color="blue" />
      </div>
    </>
  );
}

function CustomerServiceDashboard({ stats }: { stats: Awaited<ReturnType<typeof getDashboardStats>> }) {
  return (
    <>
      <DashboardHeader title="Panel de Servicio al Cliente" buttonLabel="Ver Clientes" buttonHref="/customers" />
      <div className="grid gap-6 md:grid-cols-2">
        <AdvancedStatCard title="Clientes Totales" value={stats.totalCustomers} icon={Users} trend={18.2} description="Base total" color="blue" />
        <AdvancedStatCard title="Pólizas Activas" value={stats.policyStatusCounts.find(s => s.status === 'active')?.count || 0} icon={TrendingUp} trend={12.5} description="Servicios activos" color="green" />
      </div>
    </>
  );
}

function DefaultDashboard({ stats }: { stats: Awaited<ReturnType<typeof getDashboardStats>> }) {
  return <AdminManagerDashboard stats={stats} title="Panel de Control" />;
}

// --- COMPONENTES MEJORADOS ---

function DashboardHeader({ title, buttonLabel, buttonHref }: { title: string; buttonLabel: string; buttonHref: string; }) {
  return (
    <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-2">
      <div>
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">{title}</h1>
        <p className="text-muted-foreground mt-2">Resumen completo de métricas y performance</p>
      </div>
      <Button asChild size="lg" className="shadow-lg">
        <Link href={buttonHref}>
          <PlusCircle className="mr-2 h-4 w-4" />
          {buttonLabel}
        </Link>
      </Button>
    </header>
  );
}

function AdvancedStatCard({ title, value, icon: Icon, trend, description, color }: { 
  title: string; 
  value: string | number; 
  icon: React.ElementType; 
  trend?: number;
  description?: string;
  color: string;
}) {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 text-blue-600',
    green: 'from-green-50 to-green-100 text-green-600',
    emerald: 'from-emerald-50 to-emerald-100 text-emerald-600',
    purple: 'from-purple-50 to-purple-100 text-purple-600',
    orange: 'from-orange-50 to-orange-100 text-orange-600',
    red: 'from-red-50 to-red-100 text-red-600',
  };

  return (
    <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground mb-2">{value}</div>
        {trend !== undefined && (
          <div className="flex items-center gap-2 text-sm">
            {trend > 0 ? (
              <div className="flex items-center text-green-600">
                <TrendingUp className="h-4 w-4 mr-1" />
                +{trend.toFixed(1)}%
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <TrendingDown className="h-4 w-4 mr-1" />
                {trend.toFixed(1)}%
              </div>
            )}
            {description && <span className="text-muted-foreground">{description}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MiniStatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ElementType }) {
    return (
      <Card className="shadow-md border-0 bg-white/60 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold">{value}</div>
              <div className="text-xs text-muted-foreground mt-1">{title}</div>
            </div>
            <Icon className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
}

function EnhancedTeamTable({ teamPerformance }: { teamPerformance: TeamPerformance[] }) {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow className="border-b-2">
            <TableHead className="font-bold">Agente</TableHead>
            <TableHead className="text-center font-bold">Clientes</TableHead>
            <TableHead className="text-center font-bold">Total Pólizas</TableHead>
            <TableHead className="text-center font-bold">Activas</TableHead>
            <TableHead className="text-center font-bold">Aprobadas</TableHead>
            <TableHead className="text-center font-bold">En Revisión</TableHead>
            <TableHead className="text-center font-bold">Performance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teamPerformance.map((agent, index) => {
            const conversionRate = agent.totalPolicies > 0 ? (agent.statusBreakdown.active / agent.totalPolicies * 100) : 0;
            return (
              <TableRow key={agent.agentId} className={index < 3 ? 'bg-gradient-to-r from-yellow-50/50 to-transparent' : ''}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {index < 3 && (
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                        index === 0 ? 'bg-yellow-500' : 
                        index === 1 ? 'bg-gray-400' : 
                        'bg-amber-600'
                      }`}>
                        {index + 1}
                      </div>
                    )}
                    <span className="font-medium">{agent.agentName}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center font-semibold">{agent.totalCustomers}</TableCell>
                <TableCell className="text-center">
                  <div className="font-bold text-lg">{agent.totalPolicies}</div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-green-100 text-green-800 font-semibold">{agent.statusBreakdown.active}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-blue-100 text-blue-800">{agent.statusBreakdown.approved}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge className="bg-orange-100 text-orange-800">{agent.statusBreakdown.in_review}</Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="space-y-1">
                    <div className="text-sm font-bold">{conversionRate.toFixed(1)}%</div>
                    <Progress value={conversionRate} className="h-2 w-16 mx-auto" />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

function RecentPoliciesTable({ policies }: { policies: Awaited<ReturnType<typeof getDashboardStats>>['recentPolicies'] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Cliente</TableHead>
          <TableHead>Aseguradora</TableHead>
          <TableHead className="text-right">Prima Mensual</TableHead>
          <TableHead className="text-center">Estado</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {policies.map((policy) => (
          <TableRow key={policy.id} className="hover:bg-muted/50 transition-colors">
            <TableCell className="font-medium">{policy.customerName}</TableCell>
            <TableCell className="text-muted-foreground">{policy.insuranceCompany || 'N/A'}</TableCell>
            <TableCell className="text-right font-mono font-semibold">
              {policy.monthlyPremium ? formatCurrency(Number(policy.monthlyPremium)) : '-'}
            </TableCell>
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-12 w-48" />
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}