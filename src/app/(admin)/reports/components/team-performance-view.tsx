'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { ArrowUpDown, ArrowUp, ArrowDown, Users, TrendingUp, Award, Download, ChartBar as BarChart3, Target, Zap, Activity } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getTeamPerformanceReport } from '../actions';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import * as XLSX from 'xlsx';

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
  rank: number;
  score: number;
}

export default function TeamPerformanceView() {
  const [performanceData, setPerformanceData] = useState<AgentPerformance[]>([]);
  const [sortField, setSortField] = useState<SortField>('totalPolicies');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [timeRange, setTimeRange] = useState('30');
  const [loading, setLoading] = useState(false);

  const loadPerformanceData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getTeamPerformanceReport(parseInt(timeRange));
      // Add ranking and scoring
      const rankedData = data
        .map((agent, index) => ({
          ...agent,
          rank: index + 1,
          score: agent.totalPolicies * 10 + agent.activePolicies * 15 + agent.conversionRate
        }))
        .sort((a, b) => b.score - a.score);
      setPerformanceData(rankedData);
    } catch (error) {
      console.error('Error loading performance data:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange]);

  useEffect(() => {
    loadPerformanceData();
  }, [loadPerformanceData]);

  const sortedData = [...performanceData].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    
    if (sortOrder === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });

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
    if (conversionRate >= 80) return { label: 'Excelente', color: 'bg-green-500', textColor: 'text-green-700' };
    if (conversionRate >= 60) return { label: 'Bueno', color: 'bg-blue-500', textColor: 'text-blue-700' };
    if (conversionRate >= 40) return { label: 'Regular', color: 'bg-yellow-500', textColor: 'text-yellow-700' };
    return { label: 'Necesita Mejora', color: 'bg-red-500', textColor: 'text-red-700' };
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Performance Summary
    const summaryData = [
      ['Métrica', 'Valor'],
      ['Total Agentes', performanceData.length],
      ['Total Pólizas', totalPolicies],
      ['Pólizas Activas', totalActivePolicies],
      ['Revenue Total', totalPremium],
      ['Conversión Promedio', avgConversionRate.toFixed(1) + '%']
    ];
    
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, "Resumen");

    // Agent Performance
    const agentData = performanceData.map(agent => ({
      'Ranking': agent.rank,
      'Agente': agent.name,
      'Total Pólizas': agent.totalPolicies,
      'Pólizas Activas': agent.activePolicies,
      'Revenue Total': agent.totalPremium,
      'Tasa Conversión': agent.conversionRate.toFixed(1) + '%',
      'Score': agent.score.toFixed(1)
    }));
    
    const agentWS = XLSX.utils.json_to_sheet(agentData);
    XLSX.utils.book_append_sheet(wb, agentWS, "Performance Agentes");
    
    XLSX.writeFile(wb, `team_performance_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Calculate team totals
  const totalPolicies = performanceData.reduce((sum, agent) => sum + agent.totalPolicies, 0);
  const totalActivePolicies = performanceData.reduce((sum, agent) => sum + agent.activePolicies, 0);
  const totalPremium = performanceData.reduce((sum, agent) => sum + agent.totalPremium, 0);
  const avgConversionRate = performanceData.length > 0 
    ? performanceData.reduce((sum, agent) => sum + agent.conversionRate, 0) / performanceData.length 
    : 0;

  // Chart data
  const chartData = performanceData.map(agent => ({
    name: agent.name.length > 10 ? agent.name.substring(0, 10) + '...' : agent.name,
    policies: agent.totalPolicies,
    active: agent.activePolicies,
    premium: agent.totalPremium,
    conversion: agent.conversionRate
  }));

  const radarData = performanceData.slice(0, 5).map(agent => ({
    agent: agent.name.split(' ')[0],
    policies: (agent.totalPolicies / Math.max(...performanceData.map(a => a.totalPolicies))) * 100,
    conversion: agent.conversionRate,
    revenue: (agent.totalPremium / Math.max(...performanceData.map(a => a.totalPremium))) * 100
  }));

  return (
    <div className="space-y-8">
      {/* Enhanced Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Performance del Equipo</h2>
          <p className="text-gray-600">Análisis detallado del rendimiento individual y colectivo</p>
        </div>
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Período de tiempo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 3 meses</SelectItem>
              <SelectItem value="180">Últimos 6 meses</SelectItem>
              <SelectItem value="365">Último año</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToExcel} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Enhanced Team Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <TeamMetricCard
          title="Agentes Activos"
          value={performanceData.length}
          icon={Users}
          description="En el período"
          color="blue"
        />
        <TeamMetricCard
          title="Total Pólizas"
          value={totalPolicies}
          icon={Target}
          description="Generadas por el equipo"
          color="green"
        />
        <TeamMetricCard
          title="Revenue Total"
          value={formatCurrency(totalPremium)}
          icon={Award}
          description="Ingresos generados"
          color="purple"
        />
        <TeamMetricCard
          title="Conversión Promedio"
          value={`${avgConversionRate.toFixed(1)}%`}
          icon={TrendingUp}
          description="Del equipo completo"
          color="orange"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Performance Comparison Chart */}
        <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Comparación de Performance
            </CardTitle>
            <CardDescription>Pólizas y conversión por agente</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value, name) => [
                    typeof value === 'number' && name === 'premium' ? formatCurrency(value) : value,
                    name === 'policies' ? 'Pólizas' : 
                    name === 'active' ? 'Activas' :
                    name === 'premium' ? 'Revenue' : 'Conversión'
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="policies" fill="#3B82F6" name="Pólizas" />
                <Bar yAxisId="left" dataKey="active" fill="#10B981" name="Activas" />
                <Line yAxisId="right" dataKey="conversion" stroke="#F59E0B" strokeWidth={3} name="Conversión %" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Radar Chart */}
        <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              Análisis Multi-dimensional
            </CardTitle>
            <CardDescription>Top 5 agentes en diferentes métricas</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="agent" />
                <PolarRadiusAxis />
                <Radar name="Pólizas" dataKey="policies" stroke="#8884d8" fill="#8884d8" fillOpacity={0.6} />
                <Radar name="Conversión" dataKey="conversion" stroke="#82ca9d" fill="#82ca9d" fillOpacity={0.6} />
                <Radar name="Revenue" dataKey="revenue" stroke="#ffc658" fill="#ffc658" fillOpacity={0.6} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers Spotlight */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-yellow-50 to-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Award className="h-6 w-6 text-yellow-500" />
            Top Performers del Período
          </CardTitle>
          <CardDescription>Los 3 mejores agentes basado en score integral</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {performanceData.slice(0, 3).map((agent, index) => (
              <div key={agent.id} className={`p-4 rounded-lg border-2 ${
                index === 0 ? 'border-yellow-400 bg-yellow-50' :
                index === 1 ? 'border-gray-400 bg-gray-50' :
                'border-amber-400 bg-amber-50'
              }`}>
                <div className="text-center">
                  <div className={`w-12 h-12 mx-auto mb-2 rounded-full flex items-center justify-center text-white font-bold text-xl ${
                    index === 0 ? 'bg-yellow-500' :
                    index === 1 ? 'bg-gray-400' :
                    'bg-amber-600'
                  }`}>
                    {index + 1}
                  </div>
                  <h3 className="font-bold text-lg text-gray-900">{agent.name}</h3>
                  <div className="text-sm text-gray-600 mb-3">Score: {agent.score.toFixed(1)}</div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Pólizas:</span>
                      <span className="font-bold">{agent.totalPolicies}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Activas:</span>
                      <span className="font-bold text-green-600">{agent.activePolicies}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Revenue:</span>
                      <span className="font-bold">{formatCurrency(agent.totalPremium)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Conversión:</span>
                      <span className="font-bold">{agent.conversionRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Performance Table */}
      <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl">Ranking Completo de Performance</CardTitle>
          <CardDescription>
            Tabla detallada con todas las métricas de performance. Haz clic en las columnas para ordenar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2">
                  <TableHead className="font-bold">Ranking</TableHead>
                  <TableHead className="font-bold">Agente</TableHead>
                  <TableHead className="font-bold">
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-bold hover:bg-transparent"
                      onClick={() => handleSort('totalPolicies')}
                    >
                      Total Pólizas {getSortIcon('totalPolicies')}
                    </Button>
                  </TableHead>
                  <TableHead className="font-bold">
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-bold hover:bg-transparent"
                      onClick={() => handleSort('activePolicies')}
                    >
                      Activas {getSortIcon('activePolicies')}
                    </Button>
                  </TableHead>
                  <TableHead className="font-bold">
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-bold hover:bg-transparent"
                      onClick={() => handleSort('totalPremium')}
                    >
                      Revenue {getSortIcon('totalPremium')}
                    </Button>
                  </TableHead>
                  <TableHead className="font-bold">
                    <Button 
                      variant="ghost" 
                      className="h-auto p-0 font-bold hover:bg-transparent"
                      onClick={() => handleSort('conversionRate')}
                    >
                      Conversión {getSortIcon('conversionRate')}
                    </Button>
                  </TableHead>
                  <TableHead className="font-bold text-center">Performance</TableHead>
                  <TableHead className="font-bold text-center">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((agent, index) => {
                  const performance = getPerformanceLevel(agent.conversionRate);
                  return (
                    <TableRow key={agent.id} className={`hover:bg-muted/50 transition-colors ${index < 3 ? 'bg-gradient-to-r from-yellow-50/30 to-transparent' : ''}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500' : 
                            index === 1 ? 'bg-gray-400' : 
                            index === 2 ? 'bg-amber-600' : 'bg-gray-300'
                          }`}>
                            {index + 1}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{agent.name}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="font-bold text-xl">{agent.totalPolicies}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-100 text-green-800 font-bold text-base px-3 py-1">
                          {agent.activePolicies}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono font-bold text-lg">
                        {formatCurrency(agent.totalPremium)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-2">
                          <div className="text-lg font-bold">{agent.conversionRate.toFixed(1)}%</div>
                          <Progress value={agent.conversionRate} className="h-3 w-20 mx-auto" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`${performance.color} text-white font-semibold px-3 py-1`}>
                          {performance.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="text-lg font-bold text-purple-600">
                          {agent.score.toFixed(1)}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TeamMetricCard({ title, value, icon: Icon, description, color }: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description: string;
  color: string;
}) {
  const colorClasses = {
    blue: 'from-blue-50 to-blue-100 text-blue-600',
    green: 'from-green-50 to-green-100 text-green-600',
    purple: 'from-purple-50 to-purple-100 text-purple-600',
    orange: 'from-orange-50 to-orange-100 text-orange-600',
  };

  return (
    <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={`flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </CardContent>
    </Card>
  );
}