'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart
} from 'recharts';
import { TrendingUp, TrendingDown, Download, Calendar, ListFilter as Filter, ChartPie as PieChartIcon, ChartBar as BarChart3, Activity, Target, Zap } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getAdvancedAnalytics, exportAnalyticsData } from '../actions';
import * as XLSX from 'xlsx';

interface AnalyticsData {
  monthlyTrends: Array<{
    month: string;
    policies: number;
    revenue: number;
    customers: number;
    conversionRate: number;
  }>;
  productPerformance: Array<{
    name: string;
    value: number;
    revenue: number;
    avgPremium: number;
  }>;
  conversionFunnel: Array<{
    stage: string;
    value: number;
    percentage: number;
  }>;
  agentComparison: Array<{
    agent: string;
    policies: number;
    revenue: number;
    conversionRate: number;
  }>;
  timeAnalysis: Array<{
    period: string;
    leads: number;
    conversions: number;
    revenue: number;
  }>;
  kpis: {
    totalRevenue: number;
    revenueGrowth: number;
    avgDealSize: number;
    dealSizeGrowth: number;
    conversionRate: number;
    conversionGrowth: number;
    customerLifetimeValue: number;
    churnRate: number;
  };
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function AdvancedAnalytics() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState('12');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadAnalyticsData();
  }, [timeRange]);

  const loadAnalyticsData = async () => {
    setLoading(true);
    try {
      const data = await getAdvancedAnalytics(parseInt(timeRange));
      setAnalyticsData(data);
    } catch (error) {
      console.error('Error loading analytics data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportToExcel = async () => {
    try {
      const exportData = await exportAnalyticsData(parseInt(timeRange));
      
      const wb = XLSX.utils.book_new();
      
      // Monthly Trends Sheet
      const monthlyTrendsWS = XLSX.utils.json_to_sheet(exportData.monthlyTrends);
      XLSX.utils.book_append_sheet(wb, monthlyTrendsWS, "Tendencias Mensuales");
      
      // Product Performance Sheet
      const productPerformanceWS = XLSX.utils.json_to_sheet(exportData.productPerformance);
      XLSX.utils.book_append_sheet(wb, productPerformanceWS, "Rendimiento Productos");
      
      // Agent Comparison Sheet
      const agentComparisonWS = XLSX.utils.json_to_sheet(exportData.agentComparison);
      XLSX.utils.book_append_sheet(wb, agentComparisonWS, "Comparación Agentes");
      
      // KPIs Sheet
      const kpisWS = XLSX.utils.json_to_sheet([exportData.kpis]);
      XLSX.utils.book_append_sheet(wb, kpisWS, "KPIs Principales");
      
      XLSX.writeFile(wb, `analytics_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
      console.error('Error exporting data:', error);
    }
  };

  if (!analyticsData) {
    return <div>Cargando analytics...</div>;
  }

  const { kpis } = analyticsData;

  return (
    <div className="space-y-8">
      {/* Header con controles */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Analytics Avanzados</h2>
          <p className="text-gray-600">Análisis profundo de datos y métricas de negocio</p>
        </div>
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
              <SelectItem value="24">24 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportToExcel} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* KPIs Dashboard */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Revenue Total"
          value={formatCurrency(kpis.totalRevenue)}
          change={kpis.revenueGrowth}
          icon={TrendingUp}
          color="green"
        />
        <KPICard
          title="Deal Size Promedio"
          value={formatCurrency(kpis.avgDealSize)}
          change={kpis.dealSizeGrowth}
          icon={Target}
          color="blue"
        />
        <KPICard
          title="Tasa Conversión"
          value={`${kpis.conversionRate.toFixed(1)}%`}
          change={kpis.conversionGrowth}
          icon={Zap}
          color="purple"
        />
        <KPICard
          title="Customer LTV"
          value={formatCurrency(kpis.customerLifetimeValue)}
          change={-kpis.churnRate}
          icon={Activity}
          color="orange"
        />
      </div>

      {/* Charts Grid */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Monthly Trends */}
        <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Tendencias Mensuales
            </CardTitle>
            <CardDescription>Revenue y pólizas por mes</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={analyticsData.monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? formatCurrency(Number(value)) : value,
                    name === 'revenue' ? 'Revenue' : name === 'policies' ? 'Pólizas' : 'Clientes'
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="policies" fill="#3B82F6" name="Pólizas" />
                <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10B981" strokeWidth={3} name="Revenue" />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Product Performance */}
        <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-green-500" />
              Performance por Producto
            </CardTitle>
            <CardDescription>Distribución de pólizas por aseguradora</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={analyticsData.productPerformance}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {analyticsData.productPerformance.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Pólizas']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Conversion Funnel */}
        <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-purple-500" />
              Embudo de Conversión
            </CardTitle>
            <CardDescription>Flujo del proceso de ventas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analyticsData.conversionFunnel.map((stage, index) => (
                <div key={stage.stage} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">{stage.stage}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{stage.value}</span>
                      <Badge variant="outline">{stage.percentage.toFixed(1)}%</Badge>
                    </div>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${stage.percentage}%`,
                        backgroundColor: COLORS[index % COLORS.length]
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Agent Performance Comparison */}
        <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              Comparación de Agentes
            </CardTitle>
            <CardDescription>Revenue y performance por agente</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analyticsData.agentComparison}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="agent" angle={-45} textAnchor="end" height={80} />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    name === 'revenue' ? formatCurrency(Number(value)) : value,
                    name === 'revenue' ? 'Revenue' : name === 'policies' ? 'Pólizas' : 'Conv. Rate'
                  ]}
                />
                <Legend />
                <Bar dataKey="policies" fill="#8884d8" name="Pólizas" />
                <Bar dataKey="revenue" fill="#82ca9d" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Time Analysis */}
      <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-500" />
            Análisis Temporal
          </CardTitle>
          <CardDescription>Performance a lo largo del tiempo</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={analyticsData.timeAnalysis}>
              <defs>
                <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="colorConversions" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="period" />
              <YAxis />
              <CartesianGrid strokeDasharray="3 3" />
              <Tooltip />
              <Legend />
              <Area type="monotone" dataKey="leads" stackId="1" stroke="#3B82F6" fillOpacity={1} fill="url(#colorLeads)" name="Leads" />
              <Area type="monotone" dataKey="conversions" stackId="2" stroke="#10B981" fillOpacity={1} fill="url(#colorConversions)" name="Conversiones" />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Product Revenue Breakdown */}
      <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle>Desglose de Revenue por Producto</CardTitle>
          <CardDescription>Contribución de revenue por cada aseguradora</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {analyticsData.productPerformance.map((product, index) => (
              <div key={product.name} className="p-4 rounded-lg border bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold text-gray-900">
                    {formatCurrency(product.revenue)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {product.value} pólizas
                  </div>
                  <div className="text-sm text-gray-600">
                    Promedio: {formatCurrency(product.avgPremium)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPICard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: string; 
  change: number; 
  icon: React.ElementType; 
  color: string; 
}) {
  const colorClasses = {
    green: 'from-green-50 to-green-100 text-green-600',
    blue: 'from-blue-50 to-blue-100 text-blue-600',
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
        <div className="text-2xl font-bold text-foreground mb-2">{value}</div>
        <div className="flex items-center gap-1 text-sm">
          {change > 0 ? (
            <div className="flex items-center text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              +{change.toFixed(1)}%
            </div>
          ) : (
            <div className="flex items-center text-red-600">
              <TrendingDown className="h-4 w-4 mr-1" />
              {change.toFixed(1)}%
            </div>
          )}
          <span className="text-muted-foreground">vs. período anterior</span>
        </div>
      </CardContent>
    </Card>
  );
}