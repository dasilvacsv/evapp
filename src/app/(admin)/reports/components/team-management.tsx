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
import { Users, Plus, CreditCard as Edit, Trash2, UserCheck } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { getTeams, createTeam, updateTeam, deleteTeam, getAvailableAgents, assignAgentsToTeam } from '../actions';
import { toast } from 'sonner';

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">Gestión de Equipos</h3>
          <p className="text-sm text-muted-foreground">
            Crea y administra equipos de ventas con sus respectivos líderes.
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Crear Equipo
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Equipo</DialogTitle>
              <DialogDescription>
                Define los detalles del nuevo equipo de ventas.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre del Equipo</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ej: Equipo Alpha"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción opcional del equipo"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamLeader">Team Leader</Label>
                <Select value={formData.teamLeaderId} onValueChange={(value) => setFormData({ ...formData, teamLeaderId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un líder" />
                  </SelectTrigger>
                  <SelectContent>
                    {agents.filter(agent => agent.role === 'agent' || agent.role === 'manager').map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.name} ({agent.role})
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
              <Button onClick={handleCreateTeam}>
                Crear Equipo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Teams Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Equipos Existentes ({teams.length})
          </CardTitle>
          <CardDescription>
            Administra todos los equipos de ventas y sus miembros.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Equipo</TableHead>
                <TableHead>Team Leader</TableHead>
                <TableHead>Miembros</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Creado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teams.map((team) => (
                <TableRow key={team.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{team.name}</div>
                      {team.description && (
                        <div className="text-sm text-muted-foreground">{team.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>{team.teamLeaderName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{team.memberCount} miembros</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={team.isActive ? 'default' : 'secondary'}>
                      {team.isActive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>{formatDate(team.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(team)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openAssignDialog(team)}>
                        <UserCheck className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteTeam(team.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Team Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Equipo</DialogTitle>
            <DialogDescription>
              Actualiza la información del equipo seleccionado.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="editName">Nombre del Equipo</Label>
              <Input
                id="editName"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editDescription">Descripción</Label>
              <Input
                id="editDescription"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="editTeamLeader">Team Leader</Label>
              <Select value={formData.teamLeaderId} onValueChange={(value) => setFormData({ ...formData, teamLeaderId: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agents.filter(agent => agent.role === 'agent' || agent.role === 'manager').map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.name} ({agent.role})
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
            <Button onClick={handleEditTeam}>
              Actualizar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Agents Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Asignar Agentes al Equipo</DialogTitle>
            <DialogDescription>
              Selecciona los agentes que formarán parte de "{selectedTeam?.name}".
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="max-h-96 overflow-y-auto">
              <div className="grid gap-3">
                {agents.filter(agent => agent.role === 'agent' || agent.role === 'call_center').map((agent) => (
                  <div key={agent.id} className="flex items-center space-x-2">
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
                      <div>
                        <div className="font-medium">{agent.name}</div>
                        <div className="text-sm text-muted-foreground">{agent.email} • {agent.role}</div>
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
            <Button onClick={handleAssignAgents} disabled={selectedAgents.length === 0}>
              Asignar {selectedAgents.length} Agente(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}