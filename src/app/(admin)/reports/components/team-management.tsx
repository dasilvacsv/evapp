'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Users, Plus, CreditCard as Edit, Trash2, UserCheck, Download, Shield, Crown, Star, ChartBar as BarChart3, Activity } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { getTeams, createTeam, updateTeam, deleteTeam, getAvailableAgents, assignAgentsToTeam } from '../actions';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Team {
  id: string;
  name: string;
  description: string;
  teamLeaderName: string;
  teamLeaderId: string;
  isActive: boolean;
  memberCount: number;
  createdAt: Date;
  members: Array<{
    id: string;
    name: string;
    email: string;
    joinedAt: Date;
  }>;
}

interface Agent {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function TeamManagement() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    teamLeaderId: ''
  });

  useEffect(() => {
    loadTeams();
    loadAgents();
  }, []);

  const loadTeams = async () => {
    setLoading(true);
    try {
      const data = await getTeams();
      setTeams(data);
    } catch (error) {
      console.error('Error loading teams:', error);
      toast.error('Error al cargar los equipos');
    } finally {
      setLoading(false);
    }
  };

  const loadAgents = async () => {
    try {
      const data = await getAvailableAgents();
      setAgents(data);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const handleCreateTeam = async () => {
    if (!formData.name || !formData.teamLeaderId) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      await createTeam(formData);
      toast.success('Equipo creado exitosamente');
      setIsCreateDialogOpen(false);
      setFormData({ name: '', description: '', teamLeaderId: '' });
      loadTeams();
    } catch (error) {
      toast.error('Error al crear el equipo');
    }
  };

  const handleEditTeam = async () => {
    if (!selectedTeam || !formData.name || !formData.teamLeaderId) {
      toast.error('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      await updateTeam(selectedTeam.id, formData);
      toast.success('Equipo actualizado exitosamente');
      setIsEditDialogOpen(false);
      setSelectedTeam(null);
      setFormData({ name: '', description: '', teamLeaderId: '' });
      loadTeams();
    } catch (error) {
      toast.error('Error al actualizar el equipo');
    }
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este equipo?')) {
      return;
    }

    try {
      await deleteTeam(teamId);
      toast.success('Equipo eliminado exitosamente');
      loadTeams();
    } catch (error) {
      toast.error('Error al eliminar el equipo');
    }
  };

  const handleAssignAgents = async () => {
    if (!selectedTeam || selectedAgents.length === 0) {
      toast.error('Selecciona al menos un agente');
      return;
    }

    try {
      await assignAgentsToTeam(selectedTeam.id, selectedAgents);
      toast.success('Agentes asignados exitosamente');
      setIsAssignDialogOpen(false);
      setSelectedTeam(null);
      setSelectedAgents([]);
      loadTeams();
      loadAgents();
    } catch (error) {
      toast.error('Error al asignar agentes');
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Teams Summary
    const teamsData = teams.map(team => ({
      'Equipo': team.name,
      'Descripción': team.description,
      'Team Leader': team.teamLeaderName,
      'Miembros': team.memberCount,
      'Estado': team.isActive ? 'Activo' : 'Inactivo',
      'Fecha Creación': formatDate(team.createdAt)
    }));
    
    const teamsWS = XLSX.utils.json_to_sheet(teamsData);
    XLSX.utils.book_append_sheet(wb, teamsWS, "Equipos");

    // Agents Summary
    const agentsData = agents.map(agent => ({
      'Nombre': agent.name,
      'Email': agent.email,
      'Rol': agent.role
    }));
    
    const agentsWS = XLSX.utils.json_to_sheet(agentsData);
    XLSX.utils.book_append_sheet(wb, agentsWS, "Agentes Disponibles");
    
    XLSX.writeFile(wb, `team_management_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const openEditDialog = (team: Team) => {
    setSelectedTeam(team);
    setFormData({
      name: team.name,
      description: team.description || '',
      teamLeaderId: team.teamLeaderId
    });
    setIsEditDialogOpen(true);
  };

  const openAssignDialog = (team: Team) => {
    setSelectedTeam(team);
    setSelectedAgents([]);
    setIsAssignDialogOpen(true);
  };

  // Calculate team statistics
  const activeTeams = teams.filter(t => t.isActive).length;
  const totalMembers = teams.reduce((sum, team) => sum + team.memberCount, 0);

  return (
    <div className="space-y-8">
      {/* Enhanced Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
            <Users className="h-8 w-8 text-white" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Gestión de Equipos
            </h2>
            <p className="text-gray-600">Administra equipos de ventas, líderes y miembros</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button onClick={exportToExcel} variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4" />
                Crear Equipo
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl">Crear Nuevo Equipo</DialogTitle>
                <DialogDescription>
                  Configura un nuevo equipo de ventas con su respectivo líder
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="font-medium">Nombre del Equipo *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ej: Equipo Alpha"
                    className="border-gray-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description" className="font-medium">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descripción opcional del equipo y sus objetivos"
                    className="border-gray-300"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="teamLeader" className="font-medium">Team Leader *</Label>
                  <Select value={formData.teamLeaderId} onValueChange={(value) => setFormData({ ...formData, teamLeaderId: value })}>
                    <SelectTrigger className="border-gray-300">
                      <SelectValue placeholder="Selecciona un líder" />
                    </SelectTrigger>
                    <SelectContent>
                      {agents.filter(agent => agent.role === 'agent' || agent.role === 'manager').map((agent) => (
                        <SelectItem key={agent.id} value={agent.id}>
                          <div className="flex items-center gap-2">
                            {agent.role === 'manager' ? <Crown className="h-4 w-4 text-yellow-500" /> : <Shield className="h-4 w-4 text-blue-500" />}
                            {agent.name} ({agent.role})
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateTeam} className="bg-blue-600 hover:bg-blue-700">
                  Crear Equipo
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">{teams.length}</div>
                <div className="text-sm text-gray-600">Total Equipos</div>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">{activeTeams}</div>
                <div className="text-sm text-gray-600">Equipos Activos</div>
              </div>
              <Activity className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">{totalMembers}</div>
                <div className="text-sm text-gray-600">Total Miembros</div>
              </div>
              <Star className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-orange-600">
                  {totalMembers > 0 ? (totalMembers / Math.max(activeTeams, 1)).toFixed(1) : 0}
                </div>
                <div className="text-sm text-gray-600">Promedio/Equipo</div>
              </div>
              <BarChart3 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Teams Table */}
      <Card className="shadow-lg border-0 bg-white/60 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-6 w-6 text-blue-500" />
            Equipos Registrados ({teams.length})
          </CardTitle>
          <CardDescription>
            Administra todos los equipos de ventas, sus líderes y configuraciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-b-2">
                  <TableHead className="font-bold">Equipo</TableHead>
                  <TableHead className="font-bold">Team Leader</TableHead>
                  <TableHead className="font-bold text-center">Miembros</TableHead>
                  <TableHead className="font-bold text-center">Estado</TableHead>
                  <TableHead className="font-bold">Fecha Creación</TableHead>
                  <TableHead className="font-bold text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teams.map((team) => (
                  <TableRow key={team.id} className="hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-bold text-gray-900">{team.name}</div>
                        {team.description && (
                          <div className="text-sm text-gray-500 max-w-xs truncate">{team.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Crown className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">{team.teamLeaderName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="font-semibold text-blue-600 border-blue-200">
                        {team.memberCount} miembros
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={team.isActive ? 'default' : 'secondary'} className="font-semibold">
                        {team.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="text-gray-600">{formatDate(team.createdAt)}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-center">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(team)} className="hover:bg-blue-50">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => openAssignDialog(team)} className="hover:bg-green-50">
                          <UserCheck className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteTeam(team.id)} className="hover:bg-red-50">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Team Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl">Editar Equipo</DialogTitle>
            <DialogDescription>
              Actualiza la información del equipo seleccionado
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName" className="font-medium">Nombre del Equipo *</Label>
              <Input
                id="editName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="border-gray-300"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription" className="font-medium">Descripción</Label>
              <Textarea
                id="editDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="border-gray-300"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTeamLeader" className="font-medium">Team Leader *</Label>
              <Select value={formData.teamLeaderId} onValueChange={(value) => setFormData({ ...formData, teamLeaderId: value })}>
                <SelectTrigger className="border-gray-300">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agents.filter(agent => agent.role === 'agent' || agent.role === 'manager').map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      <div className="flex items-center gap-2">
                        {agent.role === 'manager' ? <Crown className="h-4 w-4 text-yellow-500" /> : <Shield className="h-4 w-4 text-blue-500" />}
                        {agent.name} ({agent.role})
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditTeam} className="bg-blue-600 hover:bg-blue-700">
              Actualizar Equipo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Agents Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Asignar Agentes al Equipo</DialogTitle>
            <DialogDescription>
              Selecciona los agentes que formarán parte de "{selectedTeam?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="font-medium text-blue-900">
                Agentes seleccionados: {selectedAgents.length}
              </div>
              <div className="text-sm text-blue-700">
                Estos agentes serán asignados al equipo y reportarán al Team Leader
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <div className="grid gap-3">
                {agents.filter(agent => agent.role === 'agent' || agent.role === 'call_center').map((agent) => (
                  <div key={agent.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                    <Checkbox
                      id={agent.id}
                      checked={selectedAgents.includes(agent.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedAgents([...selectedAgents, agent.id]);
                        } else {
                          setSelectedAgents(selectedAgents.filter(id => id !== agent.id));
                        }
                      }}
                    />
                    <Label htmlFor={agent.id} className="flex-1 cursor-pointer">
                      <div className="flex items-center gap-2">
                        {agent.role === 'agent' ? <Shield className="h-4 w-4 text-blue-500" /> : <Users className="h-4 w-4 text-green-500" />}
                        <div>
                          <div className="font-medium text-gray-900">{agent.name}</div>
                          <div className="text-sm text-gray-500">{agent.email} • {agent.role}</div>
                        </div>
                      </div>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAssignAgents} 
              disabled={selectedAgents.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <UserCheck className="h-4 w-4 mr-2" />
              Asignar {selectedAgents.length} Agente(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}