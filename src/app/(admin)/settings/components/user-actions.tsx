'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { updateUserRole, getManagers } from '@/app/(admin)/settings/actions';
import type { User } from '@/db/schema';
import { toast } from 'sonner';
import { Edit, Save, Power, UserRoundCheck, ClipboardList, Shield, Crown, Users, Loader2, LinkIcon } from 'lucide-react';

// Mapeo de roles para etiquetas claras y consistentes
const roleLabels: Record<string, string> = {
  super_admin: 'Súper Administrador',
  manager: 'Gerente',
  agent: 'Agente',
  processor: 'Procesador',
  commission_analyst: 'Analista de Comisiones',
  customer_service: 'Servicio al Cliente',
};

// Mapeo de roles a íconos para mejorar la claridad visual
const roleIcons: Record<string, React.ElementType> = {
  super_admin: Crown,
  manager: Shield,
  agent: UserRoundCheck,
  processor: ClipboardList,
  commission_analyst: ClipboardList,
  customer_service: Users,
};

// Componente para el botón de envío del formulario de edición
function EditSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Guardando...
        </>
      ) : (
        <>
          <Save className="mr-2 h-4 w-4" />
          Guardar Cambios
        </>
      )}
    </Button>
  );
}

export function UserActions({ user }: { user: User }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState(user.role);

  const initialState = { message: '', success: false };
  const [state, dispatch] = useFormState(updateUserRole, initialState);

  // Carga la lista de gerentes solo si el rol no es 'manager'
  useEffect(() => {
    async function fetchManagers() {
      if (selectedRole !== 'manager') {
        const fetchedManagers = await getManagers();
        setManagers(fetchedManagers);
      }
    }
    fetchManagers();
  }, [selectedRole]);

  // Maneja el feedback del servidor y cierra el modal
  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message);
        setIsEditOpen(false);
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  const RoleIcon = roleIcons[user.role] || Users;

  return (
    <div className="flex items-center space-x-2">
      {/* Diálogo de Edición de Usuario */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" aria-label="Editar usuario">
            <Edit className="h-4 w-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <div className="flex items-center space-x-2">
              <RoleIcon className="h-6 w-6 text-gray-700" />
              <DialogTitle>Editar Usuario</DialogTitle>
            </div>
            <DialogDescription>
              {`Ajusta el rol y estado de **${user.firstName} ${user.lastName}**`}
            </DialogDescription>
          </DialogHeader>
          <form action={dispatch}>
            <input type="hidden" name="userId" value={user.id} />

            <div className="grid gap-6 py-4">
              {/* Campo de Estado Activo */}
              <div className="flex items-center justify-between">
                <Label htmlFor="isActive" className="text-sm font-medium">Estado del Usuario</Label>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-muted-foreground">{user.isActive ? 'Activo' : 'Inactivo'}</span>
                  <Switch
                    id="isActive"
                    name="isActive"
                    defaultChecked={user.isActive}
                    aria-label="Alternar estado activo"
                  />
                </div>
              </div>

              {/* Campo de Rol */}
              <div className="grid w-full items-center gap-1.5">
                <Label htmlFor="role">Rol</Label>
                <Select name="role" defaultValue={user.role} onValueChange={setSelectedRole}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(roleLabels).map(roleKey => {
                      const Icon = roleIcons[roleKey];
                      return (
                        <SelectItem key={roleKey} value={roleKey}>
                          <div className="flex items-center space-x-2">
                            <Icon className="h-4 w-4" />
                            <span>{roleLabels[roleKey]}</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Campo de Gerente Asignado (condicional) */}
              {selectedRole !== 'manager' && selectedRole !== 'super_admin' && (
                <div className="grid w-full items-center gap-1.5">
                  <Label htmlFor="managerId">Gerente Asignado</Label>
                  <Select name="managerId" defaultValue={user.managerId ?? undefined}>
                    <SelectTrigger>
                      <SelectValue placeholder="Asigna un gerente" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.map(manager => (
                        <SelectItem key={manager.id} value={manager.id}>
                          {manager.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancelar</Button>
              <EditSubmitButton />
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Botón de Activación/Desactivación (directo) */}
      <form action={updateUserRole}>
        <input type="hidden" name="userId" value={user.id} />
        <input type="hidden" name="role" value={user.role} />
        {/* Usamos un input para el estado que se activará solo si está "off" */}
        {!user.isActive && <input type="hidden" name="isActive" value="on" />}
        <Button 
          variant={user.isActive ? "destructive" : "default"} 
          size="sm"
          aria-label={user.isActive ? "Desactivar usuario" : "Activar usuario"}
        >
          <Power className="h-4 w-4 mr-2" />
          {user.isActive ? 'Desactivar' : 'Activar'}
        </Button>
      </form>
    </div>
  );
}