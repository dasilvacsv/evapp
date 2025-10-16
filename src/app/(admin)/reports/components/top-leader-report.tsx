'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Trophy, Crown, Award, TrendingUp, Users, Download, ChartBar as BarChart3, Target, Zap, Star, Medal } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getTopLeaderReport } from '../actions';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import * as XLSX from 'xlsx';

interface TeamStats {
  teamId: string;
  teamName: string;
  teamLeader: string;
  totalMembers: number;
  totalPolicies: number;
  totalPremium: number;
  productBreakdown: {
    Obama: number;
    Cigna: number;
    Aetna: number;
    'Pólizas de Vida': number;
    [key: string]: number;
  };
  avgConversionRate: number;
  rank: number;
  score: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function TopLeaderReport() {
  const [teamsData, setTeamsData] = useState<TeamStats[]>([]);
  const [timeRange, setTimeRange] = useState('30');
  const [sortBy, setSortBy] = useState<'policies' | 'premium'>('policies');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadTopLeaderData();
  }, [timeRange]);

  const loadTopLeaderData = async () => {
    setLoading(true);
    try {
      const data = await getTopLeaderReport(parseInt(timeRange));
      // Add ranking and scoring
      const rankedData = data
        .map((team, index) => ({
          ...team,
          rank: index + 1,
          score: team.totalPolicies * 10 + team.totalPremium * 0.01 + team.totalMembers * 5
        }))
        .sort((a, b) => b.score - a.score);
      setTeamsData(rankedData);
    } catch (error) {
      console.error('Error loading top leader data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Summary
    const summaryData = [
      ['Métrica', 'Valor'],
      ['Equipos Participantes', teamsData.length],
      ['Total Pólizas', totalPolicies],
      ['Revenue Total', totalPremium],
      ['Promedio por Equipo', teamsData.length > 0 ? Math.round(totalPolicies / teamsData.length) : 0]
    ];
    
    const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWS, "Resumen");

    // Teams Ranking
    const teamsRanking = teamsData.map(team => ({
      'Ranking': team.rank,
      'Equipo': team.teamName,
      'Team Leader': team.teamLeader,
      'Miembros': team.totalMembers,
      'Total Pólizas': team.totalPolicies,
      'Obama': team.productBreakdown.Obama,
      'Cigna': team.productBreakdown.Cigna,
      'Aetna': team.productBreakdown.Aetna,
      'Pólizas de Vida': team.productBreakdown['Pólizas de Vida'],
      'Revenue Total': team.totalPremium,
      'Score': team.score.toFixed(1)
    }));
    
    const teamsWS = XLSX.utils.json_to_sheet(teamsRanking);
    XLSX.utils.book_append_sheet(wb, teamsWS, "Ranking Equipos");
    
    XLSX.writeFile(wb, `top_leader_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const sortedTeams = [...teamsData].sort((a, b) => {
    if (sortBy === 'policies') {
      return b.totalPolicies - a.totalPolicies;
    } else {
      return b.totalPremium - a.totalPremium;
    }
  });

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 1:
        return <Award className="h-6 w-6 text-gray-400" />;
      case 2:
        return <Trophy className="h-6 w-6 text-amber-600" />;
      default:
        return <Medal className="h-6 w-6 text-gray-300" />;
    }
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white font-bold px-3 py-1">🏆 CAMPEÓN</Badge>;
      case 1:
        return <Badge className="bg-gradient-to-r from-gray-300 to-gray-500 text-white font-bold px-3 py-1">🥈 SEGUNDO</Badge>;
      case 2:
        return <Badge className="bg-gradient-to-r from-amber-500 to-amber-700 text-white font-bold px-3 py-1">🥉 TERCERO</Badge>;
      default:
        return <Badge variant="outline" className="font-semibold">#{index + 1}</Badge>;
    }
  };

  // Calculate totals
  const totalPolicies = teamsData.reduce((sum, team) => sum + team.totalPolicies, 0);
  const totalPremium = teamsData.reduce((sum, team) => sum + team.totalPremium, 0);

  // Chart data
  const chartData = teamsData.map(team => ({
    name: team.teamName.length > 12 ? team.teamName.substring(0, 12) + '...' : team.teamName,
    policies: team.totalPolicies,
    premium: team.totalPremium,
    members: team.totalMembers
  }));

  const productChartData = [
    { name: 'Obama', value: teamsData.reduce((sum, team) => sum + team.productBreakdown.Obama, 0) },
    { name: 'Cigna', value: teamsData.reduce((sum, team) => sum + team.productBreakdown.Cigna, 0) },
    { name: 'Aetna', value: teamsData.reduce((sum, team) => sum + team.productBreakdown.Aetna, 0) },
    { name: 'Pólizas de Vida', value: teamsData.reduce((sum, team) => sum + team.productBreakdown['Pólizas de Vida'], 0) }
  ].filter(item => item.value > 0);

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg">
            <Trophy className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-yellow-600 to-orange-600 bg-clip-text text-transparent">
              Reporte Top Leader
            </h2>
            <p className="text-gray-600">Competencia y ranking de equipos de alto rendimiento</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Select value={sortBy} onValueChange={(value: 'policies' | 'premium') => setSortBy(value)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="policies">Por Pólizas</SelectItem>
              <SelectItem value="premium">Por Revenue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">7 días</SelectItem>
              <SelectItem value="30">30 días</SelectItem>
              <SelectItem value="90">3 meses</SelectItem>
              <SelectItem value="180">6 meses</SelectItem>
              <SelectItem value="365">1 año</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportToExcel} className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Enhanced Metrics */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <LeaderMetricCard
          title="Equipos Compitiendo"
          value={teamsData.length}
          icon={Users}
          description="Equipos participantes"
          color="blue"
        />
        <LeaderMetricCard
          title="Total Pólizas"
          value={totalPolicies}
          icon={Target}
          description="Generadas en competencia"
          color="green"
        />
        <LeaderMetricCard
          title="Revenue Total"
          value={formatCurrency(totalPremium)}
          icon={Award}
          description="Ingresos totales"
          color="purple"
        />
        <LeaderMetricCard
          title="Promedio por Equipo"
          value={teamsData.length > 0 ? Math.round(totalPolicies / teamsData.length) : 0}
          icon={BarChart3}
          description="Pólizas por equipo"
          color="orange"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Team Performance Chart */}
        <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              Performance por Equipo
            </CardTitle>
            <CardDescription>Pólizas y revenue por equipo</CardDescription>
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
                    name === 'premium' ? formatCurrency(Number(value)) : value,
                    name === 'policies' ? 'Pólizas' : name === 'premium' ? 'Revenue' : 'Miembros'
                  ]}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="policies" fill="#3B82F6" name="Pólizas" />
                <Bar yAxisId="right" dataKey="premium" fill="#10B981" name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Product Distribution */}
        <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-500" />
              Distribución por Productos
            </CardTitle>
            <CardDescription>Pólizas por tipo de seguro</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={productChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}\n${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {productChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Podium */}
      {sortedTeams.length >= 3 && (
        <Card className="shadow-xl border-0 bg-gradient-to-r from-yellow-50 via-orange-50 to-yellow-50">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
              <Crown className="h-8 w-8 text-yellow-500" />
              PODIO DE CAMPEONES
            </CardTitle>
            <CardDescription className="text-lg">
              Los equipos que dominan la competencia en el período seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3 mb-6">
              {/* Second Place */}
              <div className="order-1 md:order-1">
                <PodiumCard team={sortedTeams[1]} position={2} />
              </div>
              {/* First Place */}
              <div className="order-2 md:order-2">
                <PodiumCard team={sortedTeams[0]} position={1} />
              </div>
              {/* Third Place */}
              <div className="order-3 md:order-3">
                <PodiumCard team={sortedTeams[2]} position={3} />
              </div>
            </div>

            {/* Performance Comparison */}
            <div className="bg-white/60 rounded-lg p-4">
              <h4 className="font-bold text-center mb-4">Comparación de Performance</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={sortedTeams.slice(0, 3).map(team => ({
                  name: team.teamName,
                  policies: team.totalPolicies,
                  premium: team.totalPremium / 1000, // Scale for visualization
                  members: team.totalMembers * 10 // Scale for visualization
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="policies" stroke="#8884d8" strokeWidth={3} name="Pólizas" />
                  <Line type="monotone" dataKey="premium" stroke="#82ca9d" strokeWidth={3} name="Revenue (K)" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Full Ranking */}
      <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-xl">Ranking Completo de Equipos</CardTitle>
          <CardDescription>
            Clasificación detallada con métricas completas y desglose por productos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2">
                  <TableHead className="font-bold">Pos.</TableHead>
                  <TableHead className="font-bold">Equipo</TableHead>
                  <TableHead className="font-bold">Team Leader</TableHead>
                  <TableHead className="font-bold text-center">Miembros</TableHead>
                  <TableHead className="font-bold text-center">Total Pólizas</TableHead>
                  <TableHead className="font-bold text-center">Obama</TableHead>
                  <TableHead className="font-bold text-center">Cigna</TableHead>
                  <TableHead className="font-bold text-center">Aetna</TableHead>
                  <TableHead className="font-bold text-center">Vida</TableHead>
                  <TableHead className="font-bold">Revenue Total</TableHead>
                  <TableHead className="font-bold text-center">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedTeams.map((team, index) => (
                  <TableRow 
                    key={team.teamId} 
                    className={`hover:bg-muted/50 transition-all duration-300 ${
                      index < 3 ? 'bg-gradient-to-r from-yellow-50/50 to-transparent shadow-sm' : ''
                    }`}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRankIcon(index)}
                        {getRankBadge(index)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-bold text-gray-900">{team.teamName}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-700">{team.teamLeader}</div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-semibold">
                        {team.totalMembers}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="text-xl font-bold text-blue-600">
                        {team.totalPolicies}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-blue-100 text-blue-800">
                        {team.productBreakdown.Obama || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-green-100 text-green-800">
                        {team.productBreakdown.Cigna || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-purple-100 text-purple-800">
                        {team.productBreakdown.Aetna || 0}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge className="bg-orange-100 text-orange-800">
                        {team.productBreakdown['Pólizas de Vida'] || 0}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-mono font-bold text-lg text-green-600">
                        {formatCurrency(team.totalPremium)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="space-y-1">
                        <div className="text-lg font-bold text-purple-600">
                          {team.score.toFixed(1)}
                        </div>
                        <Progress 
                          value={(team.score / Math.max(...teamsData.map(t => t.score))) * 100} 
                          className="h-2 w-16 mx-auto" 
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function LeaderMetricCard({ title, value, icon: Icon, description, color }: {
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
    <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
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

function PodiumCard({ team, position }: { team: TeamStats; position: number }) {
  const heights = { 1: 'h-32', 2: 'h-24', 3: 'h-20' };
  const colors = { 
    1: 'from-yellow-400 to-yellow-600', 
    2: 'from-gray-300 to-gray-500', 
    3: 'from-amber-500 to-amber-700' 
  };
  const icons = { 1: Crown, 2: Award, 3: Trophy };
  const IconComponent = icons[position as keyof typeof icons];

  return (
    <div className={`relative ${position === 1 ? 'transform scale-105' : ''}`}>
      {/* Podium Base */}
      <div className={`${heights[position as keyof typeof heights]} bg-gradient-to-t ${colors[position as keyof typeof colors]} rounded-t-lg mb-4 flex items-end justify-center pb-2`}>
        <div className="text-white font-bold text-6xl">
          {position}
        </div>
      </div>
      
      {/* Team Info */}
      <Card className={`${position === 1 ? 'ring-2 ring-yellow-400' : ''} shadow-lg`}>
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-2">
            <IconComponent className={`h-8 w-8 ${
              position === 1 ? 'text-yellow-500' : 
              position === 2 ? 'text-gray-400' : 
              'text-amber-600'
            }`} />
          </div>
          <CardTitle className="text-lg font-bold">{team.teamName}</CardTitle>
          <CardDescription className="font-medium">
            Líder: {team.teamLeader}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-center p-2 bg-blue-50 rounded">
              <div className="font-bold text-lg text-blue-600">{team.totalPolicies}</div>
              <div className="text-gray-600">Pólizas</div>
            </div>
            <div className="text-center p-2 bg-green-50 rounded">
              <div className="font-bold text-lg text-green-600">{team.totalMembers}</div>
              <div className="text-gray-600">Miembros</div>
            </div>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded">
            <div className="font-bold text-xl text-purple-600">
              {formatCurrency(team.totalPremium)}
            </div>
            <div className="text-gray-600">Revenue Total</div>
          </div>
          <div className="text-center">
            <Badge className={`${colors[position as keyof typeof colors]} text-white font-bold px-3 py-1`}>
              Score: {team.score.toFixed(1)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}