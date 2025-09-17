'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTaskSchema, TaskFormData } from '../schemas';
import { createCustomerTask, updateCustomerTask, getTeamUsers } from '../actions';
import { formatDate, cn } from '@/lib/utils';
import { CalendarIcon, Clock, User, AlertCircle, CheckCircle2, XCircle, Plus, MessageSquare, Calendar as CalendarDateIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { format } from 'date-fns';

interface CustomerTask {
  id: string;
  title: string;
  description?: string;
  type: 'follow_up' | 'document_request' | 'birthday_reminder' | 'renewal_reminder' | 'address_change' | 'claim_follow_up' | 'payment_reminder' | 'general' | 'aor_signature';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  dueDate?: string;
  completedAt?: string;
  notes?: string;
  assignedTo?: { id: string; name?: string; firstName?: string; lastName?: string; };
  createdBy?: { id: string; name?: string; firstName?: string; lastName?: string; };
  createdAt: string;
  updatedAt: string;
  comments?: Array<{
    id: string;
    content: string;
    createdAt: string;
    createdBy: { id: string; name?: string; firstName?: string; lastName?: string; };
  }>;
}

interface CustomerTasksModuleProps {
  customerId: string;
  policyId?: string;
  tasks: CustomerTask[];
}

const TASK_TYPE_LABELS = {
  follow_up: 'Seguimiento',
  document_request: 'Solicitud de Documento',
  birthday_reminder: 'Recordatorio de Cumpleaños',
  renewal_reminder: 'Recordatorio de Renovación',
  address_change: 'Cambio de Dirección',
  claim_follow_up: 'Seguimiento de Reclamo',
  payment_reminder: 'Recordatorio de Pago',
  general: 'General',
  aor_signature: 'Firma de AOR',
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-blue-100 text-blue-800',
  high: 'bg-orange-100 text-orange-800',
  urgent: 'bg-red-100 text-red-800',
};

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
  on_hold: 'bg-purple-100 text-purple-800',
};

const STATUS_ICONS = {
  pending: Clock,
  in_progress: AlertCircle,
  completed: CheckCircle2,
  cancelled: XCircle,
  on_hold: Clock,
};

export default function CustomerTasksModule({ customerId, policyId, tasks }: CustomerTasksModuleProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<CustomerTask | null>(null);
  const [teamUsers, setTeamUsers] = useState<Array<{id: string; name?: string | null; firstName?: string; lastName?: string; role: string;}>>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<TaskFormData>({
    resolver: zodResolver(createTaskSchema),
    defaultValues: {
      customerId,
      policyId,
      title: '',
      description: '',
      type: 'general',
      priority: 'medium',
    },
  });

  useEffect(() => {
    getTeamUsers().then(setTeamUsers);
  }, []);

  const handleCreateTask = async (data: TaskFormData) => {
    startTransition(async () => {
      try {
        const result = await createCustomerTask(data);
        if (result.success) {
          toast.success("Tarea creada con éxito");
          setIsCreateModalOpen(false);
          form.reset();
          router.refresh();
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error("Error inesperado al crear la tarea");
      }
    });
  };

  const handleUpdateTaskStatus = async (taskId: string, status: string) => {
    startTransition(async () => {
      try {
        const result = await updateCustomerTask(taskId, { status });
        if (result.success) {
          toast.success("Tarea actualizada con éxito");
          router.refresh();
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error("Error inesperado al actualizar la tarea");
      }
    });
  };

  const getUserName = (user?: { name?: string; firstName?: string; lastName?: string; }) => {
    return user?.name || (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Usuario');
  };

  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.status]) acc[task.status] = [];
    acc[task.status].push(task);
    return acc;
  }, {} as Record<string, CustomerTask[]>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg">Tareas del Cliente</CardTitle>
            <CardDescription>Gestiona y da seguimiento a las tareas específicas de este cliente</CardDescription>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Nueva Tarea
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Crear Nueva Tarea</DialogTitle>
                <DialogDescription>
                  Crea una tarea específica para este cliente y asígnala a un miembro del equipo.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateTask)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Solicitar documento de identidad" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descripción detallada de la tarea..." 
                            {...field} 
                            rows={3}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Tarea</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona el tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {Object.entries(TASK_TYPE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>{label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Prioridad</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecciona la prioridad" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="low">Baja</SelectItem>
                              <SelectItem value="medium">Media</SelectItem>
                              <SelectItem value="high">Alta</SelectItem>
                              <SelectItem value="urgent">Urgente</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="assignedToId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asignar a</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un usuario" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {teamUsers.map((user) => (
                              <SelectItem key={user.id} value={user.id}>
                                {getUserName(user)} ({user.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Fecha de Vencimiento</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Seleccionar fecha</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending ? 'Creando...' : 'Crear Tarea'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarDateIcon className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <p>No hay tareas para este cliente.</p>
              <p className="text-sm">Crea una nueva tarea para comenzar.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedTasks).map(([status, statusTasks]) => {
                const StatusIcon = STATUS_ICONS[status as keyof typeof STATUS_ICONS];
                return (
                  <div key={status}>
                    <div className="flex items-center gap-2 mb-3">
                      <StatusIcon className="h-4 w-4" />
                      <h3 className="font-semibold capitalize">{status.replace('_', ' ')}</h3>
                      <Badge variant="secondary" className="ml-auto">
                        {statusTasks.length}
                      </Badge>
                    </div>
                    <div className="grid gap-3">
                      {statusTasks.map((task) => (
                        <Card key={task.id} className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h4 className="font-medium">{task.title}</h4>
                                <Badge 
                                  variant="secondary" 
                                  className={PRIORITY_COLORS[task.priority]}
                                >
                                  {task.priority.toUpperCase()}
                                </Badge>
                                <Badge variant="outline">
                                  {TASK_TYPE_LABELS[task.type]}
                                </Badge>
                              </div>
                              
                              {task.description && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {task.description}
                                </p>
                              )}
                              
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                {task.assignedTo && (
                                  <div className="flex items-center gap-1">
                                    <User className="h-3 w-3" />
                                    {getUserName(task.assignedTo)}
                                  </div>
                                )}
                                {task.dueDate && (
                                  <div className="flex items-center gap-1">
                                    <CalendarIcon className="h-3 w-3" />
                                    {formatDate(task.dueDate)}
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatDate(task.createdAt)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              {task.status !== 'completed' && task.status !== 'cancelled' && (
                                <Select
                                  onValueChange={(value) => handleUpdateTaskStatus(task.id, value)}
                                  defaultValue={task.status}
                                >
                                  <SelectTrigger className="w-32 h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="pending">Pendiente</SelectItem>
                                    <SelectItem value="in_progress">En Progreso</SelectItem>
                                    <SelectItem value="on_hold">En Espera</SelectItem>
                                    <SelectItem value="completed">Completada</SelectItem>
                                    <SelectItem value="cancelled">Cancelada</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}