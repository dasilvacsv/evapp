'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpDown, ArrowUp, ArrowDown, Users, TrendingUp, Award } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getTeamPerformanceReport } from '../actions';

type SortField = 'totalPolicies' | 'activePolicies' | 'totalPremium' | 'conversionRate';
type SortOrder = 'asc' | 'desc';

interface AgentPerformance {
  id: string;
  name: string;
  totalPolicies: number;
  activePolicies: number;
  totalPremium: number;
  conversionRate: number;
  statusBreakdown: Record<string, number>;
}

export default function TeamPerformanceView() {
  const [performanceData, setPerformanceData] = useState<AgentPerformance[]>([]);
  const [sortField, setSortField] = useState<SortField>('totalPolicies');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPerformanceData();
  }, [timeRange]);

  useEffect(() => {
    if (performanceData.length > 0) {
      sortData();
    }
  }, [sortField, sortOrder, performanceData]);

  const loadPerformanceData = async () => {
    setLoading(true);
    try {
      const data = await getTeamPerformanceReport(parseInt(timeRange));
      setPerformanceData(data);
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortData = () => {
    const sortedData = [...performanceData].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (sortOrder === 'asc') {
        return aValue - bValue;
      } else {
        return bValue - aValue;
      }
    });
    
    setPerformanceData(sortedData);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-4 w-4" />;
    }
    return sortOrder === 'asc' ? 
      <ArrowUp className="h-4 w-4" /> : 
      <ArrowDown className="h-4 w-4" />;
  };

  const getPerformanceLevel = (conversionRate: number) => {
    if (conversionRate >= 80) return { label: 'Excelente', color: 'bg-green-500' };
    if (conversionRate >= 60) return { label: 'Bueno', color: 'bg-blue-500' };
    if (conversionRate >= 40) return { label: 'Regular', color: 'bg-yellow-500' };
    return { label: 'Necesita Mejora', color: 'bg-red-500' };
  };

  const totalPolicies = performanceData.reduce((sum, agent) => sum + agent.totalPolicies, 0);
  const totalActivePolicies = performanceData.reduce((sum, agent) => sum + agent.activePolicies, 0);
  const totalPremium = performanceData.reduce((sum, agent) => sum + agent.totalPremium, 0);
  const avgConversionRate = performanceData.length > 0 
    ? performanceData.reduce((sum, agent) => sum + agent.conversionRate, 0) / performanceData.length 
    : 0;

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Rendimiento del Equipo</h3>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período de tiempo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 3 meses</SelectItem>
            <SelectItem value="365">Último año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Métricas del Equipo */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pólizas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPolicies}</div>
            <p className="text-xs text-muted-foreground">
              Generadas por el equipo
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pólizas Activas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActivePolicies}</div>
            <p className="text-xs text-muted-foreground">
              {totalPolicies > 0 ? Math.round((totalActivePolicies / totalPolicies) * 100) : 0}% conversión
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prima Total</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPremium)}</div>
            <p className="text-xs text-muted-foreground">
              Ingreso mensual generado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversión Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgConversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Promedio del equipo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de Rendimiento */}
      <Card>
        <CardHeader>
          <CardTitle>Rendimiento Individual</CardTitle>
          <CardDescription>
            Métricas detalladas de cada miembro del equipo. Haz clic en las columnas para ordenar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Agente</TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('totalPolicies')}
                  >
                    Total Pólizas {getSortIcon('totalPolicies')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('activePolicies')}
                  >
                    Pólizas Activas {getSortIcon('activePolicies')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('totalPremium')}
                  >
                    Prima Total {getSortIcon('totalPremium')}
                  </Button>
                </TableHead>
                <TableHead>
                  <Button 
                    variant="ghost" 
                    className="h-auto p-0 font-semibold"
                    onClick={() => handleSort('conversionRate')}
                  >
                    Conversión {getSortIcon('conversionRate')}
                  </Button>
                </TableHead>
                <TableHead>Rendimiento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performanceData.map((agent, index) => {
                const performance = getPerformanceLevel(agent.conversionRate);
                return (
                  <TableRow key={agent.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {index < 3 && (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${
                            index === 0 ? 'bg-yellow-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            'bg-amber-600'
                          }`}>
                            {index + 1}
                          </div>
                        )}
                        <span className="font-medium">{agent.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-bold">
                      {agent.totalPolicies}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-green-100 text-green-800">
                        {agent.activePolicies}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {formatCurrency(agent.totalPremium)}
                    </TableCell>
                    <TableCell className="text-center font-semibold">
                      {agent.conversionRate.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      <Badge className={`${performance.color} text-white`}>
                        {performance.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}