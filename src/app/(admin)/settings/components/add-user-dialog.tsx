'use client';

import { useState, useEffect } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createUser, getManagers } from '../actions';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// Definición de tipos para la respuesta de la acción del formulario
interface FormState {
  success: boolean | null;
  message: string | null;
  errors: {
    firstName?: string[];
    lastName?: string[];
    email?: string[];
    password?: string[];
    role?: string[];
    managerId?: string[];
  } | null;
}

// Componente para el botón de envío
function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="gap-2">
      {pending ? (
        <>
          <Loader2 className="animate-spin h-4 w-4" />
          Creando...
        </>
      ) : (
        'Crear Usuario'
      )}
    </Button>
  );
}

export function AddUserDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [managers, setManagers] = useState<{ id: string; name: string }[]>([]);
  const [selectedRole, setSelectedRole] = useState('');

  // Estado inicial del formulario con un tipo más claro
  const initialState: FormState = { success: null, message: null, errors: null };
  const [state, dispatch] = useFormState<FormState, FormData>(createUser, initialState);

  // Cargar la lista de managers al montar el componente
  useEffect(() => {
    async function fetchManagers() {
      const fetchedManagers = await getManagers();
      setManagers(fetchedManagers);
    }
    fetchManagers();
  }, []);

  // Manejar el resultado de la acción del formulario y mostrar notificaciones
  useEffect(() => {
    if (state.success === true) {
      toast.success(state.message || 'Usuario creado exitosamente.');
      setIsOpen(false);
    } else if (state.success === false) {
      toast.error(state.message || 'Hubo un error al crear el usuario.');
    }
  }, [state]);

  // Manejar errores de campo específicos
  const fieldErrors = state.errors || {};

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Añadir Usuario
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Añadir Nuevo Usuario</DialogTitle>
          <DialogDescription>
            Completa los siguientes campos para crear una nueva cuenta de usuario.
          </DialogDescription>
        </DialogHeader>
        <form action={dispatch}>
          <div className="grid gap-4 py-4">
            {/* Campo de Nombre */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="firstName" className="text-right">Nombre</Label>
              <div className="col-span-3">
                <Input
                  id="firstName"
                  name="firstName"
                  className={fieldErrors.firstName ? 'border-destructive' : ''}
                  required
                />
                {fieldErrors.firstName && (
                  <p className="text-sm text-destructive mt-1">{fieldErrors.firstName[0]}</p>
                )}
              </div>
            </div>

            {/* Campo de Apellido */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="lastName" className="text-right">Apellido</Label>
              <div className="col-span-3">
                <Input
                  id="lastName"
                  name="lastName"
                  className={fieldErrors.lastName ? 'border-destructive' : ''}
                  required
                />
                {fieldErrors.lastName && (
                  <p className="text-sm text-destructive mt-1">{fieldErrors.lastName[0]}</p>
                )}
              </div>
            </div>

            {/* Campo de Email */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <div className="col-span-3">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  className={fieldErrors.email ? 'border-destructive' : ''}
                  required
                />
                {fieldErrors.email && (
                  <p className="text-sm text-destructive mt-1">{fieldErrors.email[0]}</p>
                )}
              </div>
            </div>

            {/* Campo de Contraseña */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">Contraseña</Label>
              <div className="col-span-3">
                <Input
                  id="password"
                  name="password"
                  type="password"
                  className={fieldErrors.password ? 'border-destructive' : ''}
                  required
                />
                {fieldErrors.password && (
                  <p className="text-sm text-destructive mt-1">{fieldErrors.password[0]}</p>
                )}
              </div>
            </div>

            {/* Campo de Rol - actualizado con los roles del schema */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">Rol</Label>
              <div className="col-span-3">
                <Select name="role" onValueChange={setSelectedRole} required>
                  <SelectTrigger className={fieldErrors.role ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">Gerente</SelectItem>
                    <SelectItem value="agent">Agente</SelectItem>
                    <SelectItem value="processor">Procesador</SelectItem>
                    <SelectItem value="commission_analyst">Analista de Comisiones</SelectItem>
                    <SelectItem value="customer_service">Servicio al Cliente</SelectItem>
                  </SelectContent>
                </Select>
                {fieldErrors.role && (
                  <p className="text-sm text-destructive mt-1">{fieldErrors.role[0]}</p>
                )}
              </div>
            </div>

            {/* Selector de Gerente (visible solo para roles que no son 'manager') */}
            {selectedRole && selectedRole !== 'manager' && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="managerId" className="text-right">Gerente</Label>
                <div className="col-span-3">
                  <Select name="managerId" required={selectedRole !== 'manager'}>
                    <SelectTrigger className={fieldErrors.managerId ? 'border-destructive' : ''}>
                      <SelectValue placeholder="Asigna un gerente" />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.length > 0 ? (
                        managers.map(manager => (
                          <SelectItem key={manager.id} value={manager.id}>
                            {manager.name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem disabled value="no-managers">No hay gerentes disponibles</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  {fieldErrors.managerId && (
                    <p className="text-sm text-destructive mt-1">{fieldErrors.managerId[0]}</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <SubmitButton />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}