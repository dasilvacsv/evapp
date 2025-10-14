'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Calendar, FileText, DollarSign, TrendingUp, Filter, Download } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getSalesReport, getAgents, getInsuranceCompanies } from '../actions';

interface SalesFilters {
  startDate: string;
  endDate: string;
  agentId: string;
  insuranceCompany: string;
  status: string;
}

export default function SalesReportView() {
  // CAMBIO: El estado inicial ahora usa 'all' en lugar de ''
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

  return (
    <div className="space-y-6">
      {/* Panel de Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Ventas
          </CardTitle>
          <CardDescription>
            Filtra los datos por fechas, agentes, aseguradoras y más.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agent">Agente</Label>
              <Select value={filters.agentId} onValueChange={(value) => handleFilterChange('agentId', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los agentes" />
                </SelectTrigger>
                <SelectContent>
                  {/* CAMBIO: value="all" en lugar de "" */}
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
              <Label htmlFor="company">Aseguradora</Label>
              <Select value={filters.insuranceCompany} onValueChange={(value) => handleFilterChange('insuranceCompany', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas las aseguradoras" />
                </SelectTrigger>
                <SelectContent>
                   {/* CAMBIO: value="all" en lugar de "" */}
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
              <Label htmlFor="status">Estado</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  {/* CAMBIO: value="all" en lugar de "" */}
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="active">Activa</SelectItem>
                  <SelectItem value="approved">Aprobada</SelectItem>
                  <SelectItem value="in_review">En Revisión</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={applyFilters} disabled={loading} className="w-full">
                {loading ? 'Cargando...' : 'Aplicar Filtros'}
              </Button>
            </div>
          </div>
          
          <div className="flex gap-2 mt-4">
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
          </div>
        </CardContent>
      </Card>

      {/* Métricas Resumidas */}
      {reportData && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Pólizas</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totalPolicies}</div>
                <p className="text-xs text-muted-foreground">
                  En el período seleccionado
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pólizas Activas</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.activePolicies}</div>
                <p className="text-xs text-muted-foreground">
                  {reportData.totalPolicies > 0 ? Math.round((reportData.activePolicies / reportData.totalPolicies) * 100) : 0}% del total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Prima Total</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(reportData.totalPremium)}</div>
                <p className="text-xs text-muted-foreground">
                  Suma de primas mensuales
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Prima Promedio</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(reportData.totalPolicies > 0 ? reportData.totalPremium / reportData.totalPolicies : 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Por póliza
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Tabla de Pólizas */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Detalle de Pólizas</CardTitle>
                <CardDescription>
                  Lista completa de pólizas según los filtros aplicados.
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Agente</TableHead>
                    <TableHead>Aseguradora</TableHead>
                    <TableHead>Prima Mensual</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.policies.map((policy: any) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">
                        {policy.customerName}
                      </TableCell>
                      <TableCell>{policy.agentName}</TableCell>
                      <TableCell>{policy.insuranceCompany}</TableCell>
                      <TableCell className="font-mono">
                        {formatCurrency(Number(policy.monthlyPremium || 0))}
                      </TableCell>
                      <TableCell>
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
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}