// app/(admin)/team/page.tsx

import { getTeamMembers, getTeamPerformance } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
import { Users, TrendingUp, UserCheck, Crown, FileText } from 'lucide-react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';

export default async function TeamPage() {
  const [teamMembers, performance] = await Promise.all([
    getTeamMembers(),
    getTeamPerformance(),
  ]);

  // Objeto de mapeo para traducir los roles a español
  const roleTranslations: Record<string, string> = {
    'super_admin': 'Súper Administrador',
    'manager': 'Gerente',
    'agent': 'Agente',
    'processor': 'Procesador',
    'commission_analyst': 'Analista de Comisiones',
    'customer_service': 'Servicio al Cliente',
  };

  const getRoleColor = (role: string) => {
    const colors = {
      'super_admin': 'bg-purple-100 text-purple-800',
      'manager': 'bg-blue-100 text-blue-800',
      'agent': 'bg-green-100 text-green-800',
      'processor': 'bg-orange-100 text-orange-800',
      'commission_analyst': 'bg-indigo-100 text-indigo-800',
      'customer_service': 'bg-pink-100 text-pink-800',
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin':
        return Crown;
      case 'manager':
        return Users;
      case 'agent':
        return UserCheck;
      default:
        return FileText;
    }
  };

  // Combina los datos de miembros y rendimiento
  const teamData = teamMembers.map(member => {
    const memberPerformance = performance.find(p => p.agentId === member.id) || {
      totalCustomers: 0,
      totalPolicies: 0,
      activePolicies: 0,
      totalPremium: 0,
    };
    return {
      ...member,
      stats: memberPerformance,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Gestión del Equipo</h2>
        <p className="text-muted-foreground">
          Administra a los miembros de tu equipo y rastrea su rendimiento.
        </p>
      </div>

      {/* Tarjeta de la Tabla del Equipo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Miembros del Equipo ({teamData.length})
          </CardTitle>
          <CardDescription>
            Todos los miembros del equipo, sus roles y métricas de rendimiento.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teamData.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No se encontraron miembros del equipo.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Miembro</TableHead>
                    <TableHead className="w-[150px]">Supervisor</TableHead>
                    <TableHead>Métricas de Rendimiento</TableHead>
                    <TableHead className="w-[150px]">Unido</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamData.map((member) => {
                    const RoleIcon = getRoleIcon(member.role);
                    return (
                      <TableRow key={member.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center space-x-4">
                            <Avatar>
                              <AvatarFallback>
                                {`${member.firstName[0]}${member.lastName[0]}`.toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="font-semibold">
                                  {member.firstName} {member.lastName}
                                </h3>
                                <Badge className={getRoleColor(member.role)}>
                                  <RoleIcon className="mr-1 h-3 w-3" />
                                  {roleTranslations[member.role] || member.role.replace('_', ' ')}
                                </Badge>
                                {!member.isActive && (
                                  <Badge variant="secondary">Inactivo</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {member.managerName || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">{member.stats.totalCustomers}</span> Clientes
                            </span>
                            <span className="text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">{member.stats.totalPolicies}</span> Pólizas
                            </span>
                            <span className="text-sm text-muted-foreground">
                              <span className="font-semibold text-foreground">{member.stats.activePolicies}</span> Activas
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {formatDate(member.createdAt)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}