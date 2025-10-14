'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trophy, Crown, Award, TrendingUp, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { getTopLeaderReport } from '../actions';

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
}

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
      setTeamsData(data);
    } catch (error) {
      console.error('Error loading top leader data:', error);
    } finally {
      setLoading(false);
    }
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
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case 1:
        return <Award className="h-5 w-5 text-gray-400" />;
      case 2:
        return <Trophy className="h-5 w-5 text-amber-600" />;
      default:
        return <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold">{index + 1}</div>;
    }
  };

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <Badge className="bg-yellow-500 text-white">🥇 Líder</Badge>;
      case 1:
        return <Badge className="bg-gray-400 text-white">🥈 Segundo</Badge>;
      case 2:
        return <Badge className="bg-amber-600 text-white">🥉 Tercero</Badge>;
      default:
        return <Badge variant="outline">#{index + 1}</Badge>;
    }
  };

  const totalPolicies = teamsData.reduce((sum, team) => sum + team.totalPolicies, 0);
  const totalPremium = teamsData.reduce((sum, team) => sum + team.totalPremium, 0);

  return (
    <div className="space-y-6">
      {/* Controles */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Trophy className="h-6 w-6 text-primary" />
          <h3 className="text-lg font-semibold">Reporte Top Leader</h3>
        </div>
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(value: 'policies' | 'premium') => setSortBy(value)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="policies">Por Pólizas</SelectItem>
              <SelectItem value="premium">Por Prima Total</SelectItem>
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
              <SelectItem value="365">1 año</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Métricas Generales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Equipos Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamsData.length}</div>
            <p className="text-xs text-muted-foreground">
              Equipos participando
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pólizas</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPolicies}</div>
            <p className="text-xs text-muted-foreground">
              Todos los equipos
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prima Total</CardTitle>
            <Award className="h-4 w-4 text-muted-foreference" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalPremium)}</div>
            <p className="text-xs text-muted-foreground">
              Ingreso generado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Equipo</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teamsData.length > 0 ? Math.round(totalPolicies / teamsData.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Pólizas por equipo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Podio de Top 3 */}
      {sortedTeams.length >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              Podio de Líderes
            </CardTitle>
            <CardDescription>
              Los 3 equipos con mejor rendimiento en el período seleccionado.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              {sortedTeams.slice(0, 3).map((team, index) => (
                <Card key={team.teamId} className={`${index === 0 ? 'ring-2 ring-yellow-500' : ''}`}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      {getRankIcon(index)}
                      {getRankBadge(index)}
                    </div>
                    <CardTitle className="text-lg">{team.teamName}</CardTitle>
                    <CardDescription>Líder: {team.teamLeader}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Pólizas:</span>
                        <span className="font-bold">{team.totalPolicies}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Prima Total:</span>
                        <span className="font-bold">{formatCurrency(team.totalPremium)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Miembros:</span>
                        <span className="font-bold">{team.totalMembers}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Ranking Completo */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking Completo de Equipos</CardTitle>
          <CardDescription>
            Rendimiento detallado de todos los equipos con desglose por productos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Posición</TableHead>
                <TableHead>Equipo</TableHead>
                <TableHead>Líder</TableHead>
                <TableHead>Miembros</TableHead>
                <TableHead>Total Pólizas</TableHead>
                <TableHead>Obama</TableHead>
                <TableHead>Cigna</TableHead>
                <TableHead>Aetna</TableHead>
                <TableHead>Pólizas de Vida</TableHead>
                <TableHead>Prima Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTeams.map((team, index) => (
                <TableRow key={team.teamId} className={index < 3 ? 'bg-muted/50' : ''}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getRankIcon(index)}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{team.teamName}</TableCell>
                  <TableCell>{team.teamLeader}</TableCell>
                  <TableCell className="text-center">{team.totalMembers}</TableCell>
                  <TableCell className="text-center font-bold">{team.totalPolicies}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{team.productBreakdown.Obama || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{team.productBreakdown.Cigna || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{team.productBreakdown.Aetna || 0}</Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{team.productBreakdown['Pólizas de Vida'] || 0}</Badge>
                  </TableCell>
                  <TableCell className="font-mono font-bold">
                    {formatCurrency(team.totalPremium)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}