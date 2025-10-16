'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, DollarSign, TrendingUp, ListFilter as Filter, Download, Users, Target, Award, ChartBar as BarChart3, ChartPie as PieChart } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getSalesReport, getAgents, getInsuranceCompanies } from '../actions';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart as RechartsPieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import * as XLSX from 'xlsx';

interface SalesFilters {
  startDate: string;
  endDate: string;
  agentId: string;
  insuranceCompany: string;
  status: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function SalesReportView() {
  const [filters, setFilters] = useState<SalesFilters>({
    startDate: '',
    endDate: '',
    agentId: 'all',
    insuranceCompany: 'all',
    status: 'all'
  });

  const [reportData, setReportData] = useState<any>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [companies, setCompanies] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [agentsData, companiesData] = await Promise.all([
        getAgents(),
        getInsuranceCompanies()
      ]);
      setAgents(agentsData);
      setCompanies(companiesData);
      
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      
      const initialFilters = {
        ...filters,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0]
      };
      setFilters(initialFilters);
      await loadReportData(initialFilters);
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadReportData = async (currentFilters: SalesFilters) => {
    setLoading(true);
    try {
      const data = await getSalesReport(currentFilters);
      setReportData(data);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof SalesFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
  };

  const applyFilters = () => {
    loadReportData(filters);
  };

  const setQuickDateRange = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const newFilters = {
      ...filters,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
    setFilters(newFilters);
    loadReportData(newFilters);
  };

  const exportToExcel = () => {
    if (!reportData) return;

    const wb = XLSX.utils.book_new();
    
    // Summary Sheet
    const summaryData = [
      ['Métrica', 'Valor'],
      ['Total de Pólizas', reportData.totalPolicies],
      ['Pólizas Activas', reportData.activePolicies],
      ['Prima Total', reportData.totalPremium],
      ['Prima Promedio', reportData.totalPolicies > 0 ? reportData.totalPremium / reportData.totalPolicies : 0],
      ['Tasa de Conversión', reportData.totalPolicies > 0 ? (reportData.activePolicies / reportData.totalPolicies * 100).toFixed(2) + '%' : '0%']
    ];
    
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, "Resumen");

    // Policies Sheet
    const policiesData = reportData.policies.map((policy: any) => ({
      'Cliente': policy.customerName,
      'Agente': policy.agentName,
      'Aseguradora': policy.insuranceCompany,
      'Prima Mensual': policy.monthlyPremium,
      'Estado': policy.statusLabel,
      'Fecha': formatDate(policy.createdAt)
    }));
    
    const policiesWS = XLSX.utils.json_to_sheet(policiesData);
    XLSX.utils.book_append_sheet(wb, policiesWS, "Pólizas");
    
    XLSX.writeFile(wb, `sales_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Prepare chart data
  const chartData = reportData ? {
    statusDistribution: [
      { name: 'Activas', value: reportData.activePolicies, color: '#10B981' },
      { name: 'Inactivas', value: reportData.totalPolicies - reportData.activePolicies, color: '#F59E0B' }
    ],
    agentPerformance: agents.map(agent => ({
      name: agent.name,
      policies: reportData.policies.filter((p: any) => p.agentName === agent.name).length,
      revenue: reportData.policies
        .filter((p: any) => p.agentName === agent.name)
        .reduce((sum: number, p: any) => sum + Number(p.monthlyPremium || 0), 0)
    })).slice(0, 10),
    companyDistribution: companies.map(company => ({
      name: company,
      value: reportData.policies.filter((p: any) => p.insuranceCompany === company).length
    })).filter(item => item.value > 0)
  } : null;

  return (
    <div className="space-y-8">
      {/* Enhanced Filter Panel */}
      <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Filter className="h-6 w-6 text-blue-500" />
            Panel de Filtros Avanzados
          </CardTitle>
          <CardDescription>
            Personaliza tu análisis con filtros detallados por fechas, agentes, aseguradoras y estados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-2">
              <Label htmlFor="startDate" className="text-sm font-medium">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate" className="text-sm font-medium">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent" className="text-sm font-medium">Agente</Label>
              <Select value={filters.agentId} onValueChange={(value) => handleFilterChange('agentId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los agentes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los agentes</SelectItem>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="company" className="text-sm font-medium">Aseguradora</Label>
              <Select value={filters.insuranceCompany} onValueChange={(value) => handleFilterChange('insuranceCompany', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las aseguradoras" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="Obama">Obama</SelectItem>
                  <SelectItem value="Cigna">Cigna</SelectItem>
                  <SelectItem value="Aetna">Aetna</SelectItem>
                  <SelectItem value="Pólizas de Vida">Pólizas de Vida</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company} value={company}>
                      {company}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status" className="text-sm font-medium">Estado</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="approved">Aprobada</SelectItem>
                  <SelectItem value="in_review">En Revisión</SelectItem>
                  <SelectItem value="missing_docs">Faltan Docs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={applyFilters} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                {loading ? 'Cargando...' : 'Aplicar Filtros'}
              </Button>
            </div>
          </div>
          
          {/* Quick Date Range Buttons */}
          <div className="flex flex-wrap gap-2 mt-6 pt-4 border-t">
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange(1)}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange(7)}>
              7 días
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange(30)}>
              30 días
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange(90)}>
              3 meses
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange(180)}>
              6 meses
            </Button>
            <Button variant="outline" size="sm" onClick={() => setQuickDateRange(365)}>
              1 año
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Metrics */}
      {reportData && (
        <>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <MetricCard
              title="Total de Pólizas"
              value={reportData.totalPolicies}
              icon={FileText}
              description="En el período seleccionado"
              trend={15.2}
            />
            <MetricCard
              title="Pólizas Activas"
              value={reportData.activePolicies}
              icon={TrendingUp}
              description={`${reportData.totalPolicies > 0 ? Math.round((reportData.activePolicies / reportData.totalPolicies) * 100) : 0}% del total`}
              trend={8.7}
            />
            <MetricCard
              title="Prima Total"
              value={formatCurrency(reportData.totalPremium)}
              icon={DollarSign}
              description="Suma de primas mensuales"
              trend={22.1}
            />
            <MetricCard
              title="Prima Promedio"
              value={formatCurrency(reportData.totalPolicies > 0 ? reportData.totalPremium / reportData.totalPolicies : 0)}
              icon={Target}
              description="Por póliza"
              trend={5.8}
            />
          </div>

          {/* Charts Section */}
          <div className="grid gap-8 lg:grid-cols-2">
            {/* Status Distribution Chart */}
            <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5 text-green-500" />
                  Distribución de Estados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={chartData?.statusDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {chartData?.statusDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Agent Performance Chart */}
            <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Performance por Agente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData?.agentPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip 
                      formatter={(value, name) => [
                        name === 'revenue' ? formatCurrency(Number(value)) : value,
                        name === 'revenue' ? 'Revenue' : 'Pólizas'
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="policies" fill="#3B82F6" name="Pólizas" />
                    <Bar dataKey="revenue" fill="#10B981" name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Company Distribution */}
          <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>Distribución por Aseguradora</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData?.companyDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Enhanced Table */}
          <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">Detalle Completo de Pólizas</CardTitle>
                <CardDescription>
                  Lista detallada de {reportData.policies.length} pólizas según los filtros aplicados
                </CardDescription>
              </div>
              <Button onClick={exportToExcel} variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Exportar Excel
              </Button>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b-2">
                      <TableHead className="font-bold">Cliente</TableHead>
                      <TableHead className="font-bold">Agente</TableHead>
                      <TableHead className="font-bold">Aseguradora</TableHead>
                      <TableHead className="font-bold text-right">Prima Mensual</TableHead>
                      <TableHead className="font-bold text-center">Estado</TableHead>
                      <TableHead className="font-bold">Fecha</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.policies.map((policy: any) => (
                      <TableRow key={policy.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-medium">
                          {policy.customerName}
                        </TableCell>
                        <TableCell className="text-gray-600">{policy.agentName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-medium">
                            {policy.insuranceCompany}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-right font-semibold text-green-600">
                          {formatCurrency(Number(policy.monthlyPremium || 0))}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={policy.status === 'active' ? 'default' : 'secondary'}>
                            {policy.statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(policy.createdAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function MetricCard({ title, value, icon: Icon, description, trend }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  trend: number;
}) {
  return (
    <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-6 w-6 text-blue-500" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900">{value}</div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-muted-foreground">{description}</p>
          <div className="flex items-center text-sm text-green-600">
            <TrendingUp className="h-4 w-4 mr-1" />
            +{trend}%
          </div>
        </div>
      </CardContent>
    </Card>
  );
}