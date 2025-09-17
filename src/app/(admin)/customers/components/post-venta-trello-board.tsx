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
import { ScrollArea } from '@/components/ui/scroll-area';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPostSaleTaskSchema, PostSaleTaskFormData } from '../schemas';
import { createPostSaleTask, updatePostSaleTask, getTeamUsers, getCustomersForSelection } from '../actions';
import { formatDate, cn } from '@/lib/utils';
import { CalendarIcon, Clock, User, AlertCircle, CheckCircle2, XCircle, Plus, MoreHorizontal, Eye, Edit } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { format } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

interface PostSaleTask {
  id: string;
  title: string;
  description?: string;
  type: 'follow_up' | 'document_request' | 'birthday_reminder' | 'renewal_reminder' | 'address_change' | 'claim_follow_up' | 'payment_reminder' | 'general' | 'aor_signature';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'on_hold';
  boardColumn: string;
  dueDate?: string;
  completedAt?: string;
  tags?: string;
  customer?: { id: string; fullName: string; };
  policy?: { id: string; marketplaceId?: string; insuranceCompany?: string; };
  assignedTo?: { id: string; name?: string; firstName?: string; lastName?: string; };
  createdBy?: { id: string; name?: string; firstName?: string; lastName?: string; };
  createdAt: string;
  updatedAt: string;
}

interface PostVentaTrelloBoardProps {
  tasksByColumn: Record<string, PostSaleTask[]>;
}

const BOARD_COLUMNS = [
  { id: 'pending', title: 'Pendiente', color: 'bg-gray-100' },
  { id: 'birthday_reminders', title: 'Cumpleaños', color: 'bg-pink-100' },
  { id: 'renewals', title: 'Renovaciones', color: 'bg-blue-100' },
  { id: 'address_changes', title: 'Cambios de Dirección', color: 'bg-yellow-100' },
  { id: 'follow_ups', title: 'Seguimientos', color: 'bg-green-100' },
  { id: 'completed', title: 'Completadas', color: 'bg-emerald-100' },
];

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

export default function PostVentaTrelloBoard({ tasksByColumn }: PostVentaTrelloBoardProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [teamUsers, setTeamUsers] = useState<Array<{id: string; name?: string; firstName?: string; lastName?: string; role: string;}>>([]);
  const [customers, setCustomers] = useState<Array<{id: string; fullName: string; policies: Array<{id: string; planName?: string; insuranceCompany?: string; marketplaceId?: string;}>}>>([]);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [tasks, setTasks] = useState<Record<string, PostSaleTask[]>>(tasksByColumn);

  const form = useForm<PostSaleTaskFormData>({
    resolver: zodResolver(createPostSaleTaskSchema),
    defaultValues: {
      title: '',
      description: '',
      type: 'general',
      priority: 'medium',
      boardColumn: 'pending',
    },
  });

  useEffect(() => {
    Promise.all([
      getTeamUsers(),
      getCustomersForSelection()
    ]).then(([users, customerData]) => {
      setTeamUsers(users);
      setCustomers(customerData);
    });
  }, []);

  useEffect(() => {
    setTasks(tasksByColumn);
  }, [tasksByColumn]);

  const handleCreateTask = async (data: PostSaleTaskFormData) => {
    startTransition(async () => {
      try {
        const result = await createPostSaleTask(data);
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

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { source, destination, draggableId } = result;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    // Actualizar el estado local inmediatamente
    const newTasks = { ...tasks };
    const sourceColumn = newTasks[source.droppableId];
    const destColumn = newTasks[destination.droppableId];

    const [movedTask] = sourceColumn.splice(source.index, 1);
    movedTask.boardColumn = destination.droppableId;
    destColumn.splice(destination.index, 0, movedTask);

    setTasks(newTasks);

    // Actualizar en el servidor
    startTransition(async () => {
      try {
        const result = await updatePostSaleTask(draggableId, { 
          boardColumn: destination.droppableId,
          status: destination.droppableId === 'completed' ? 'completed' : 'in_progress'
        });
        if (result.success) {
          toast.success("Tarea movida con éxito");
          router.refresh();
        } else {
          toast.error(result.message);
          // Revertir en caso de error
          setTasks(tasksByColumn);
        }
      } catch (error) {
        toast.error("Error al mover la tarea");
        setTasks(tasksByColumn);
      }
    });
  };

  const getUserName = (user?: { name?: string; firstName?: string; lastName?: string; }) => {
    return user?.name || (user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : 'Usuario');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl">Tablero de Post-Venta (Trello Style)</CardTitle>
            <CardDescription>Gestiona las tareas de seguimiento y servicio post-venta</CardDescription>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Tarea
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Crear Nueva Tarea de Post-Venta</DialogTitle>
                <DialogDescription>
                  Crea una tarea para gestionar el seguimiento de pólizas y clientes.
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
                          <Input placeholder="Ej: Seguimiento renovación - Juan Pérez" {...field} />
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
                    name="customerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente (Opcional)</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona un cliente" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {customers.map((customer) => (
                              <SelectItem key={customer.id} value={customer.id}>
                                {customer.fullName}
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
                    name="boardColumn"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Columna del Tablero</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona la columna" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {BOARD_COLUMNS.map((column) => (
                              <SelectItem key={column.id} value={column.id}>
                                {column.title}
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

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Etiquetas (separadas por comas)</FormLabel>
                        <FormControl>
                          <Input placeholder="urgente, seguimiento, renovacion" {...field} />
                        </FormControl>
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
        
        <CardContent className="p-0">
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 p-6 overflow-x-auto min-h-[600px]">
              {BOARD_COLUMNS.map((column) => {
                const columnTasks = tasks[column.id] || [];
                return (
                  <div key={column.id} className="flex-shrink-0 w-80">
                    <div className={`p-3 rounded-t-lg ${column.color} border-b-2 border-gray-200`}>
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">{column.title}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {columnTasks.length}
                        </Badge>
                      </div>
                    </div>
                    
                    <Droppable droppableId={column.id}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className={`p-3 min-h-[500px] bg-gray-50/50 rounded-b-lg space-y-3 ${
                            snapshot.isDraggingOver ? 'bg-blue-50' : ''
                          }`}
                        >
                          {columnTasks.map((task, index) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`bg-white rounded-lg shadow-sm border p-3 hover:shadow-md transition-shadow ${
                                    snapshot.isDragging ? 'rotate-3 shadow-lg' : ''
                                  }`}
                                >
                                  <div className="space-y-2">
                                    <div className="flex items-start justify-between">
                                      <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
                                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                        <MoreHorizontal className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    
                                    {task.description && (
                                      <p className="text-xs text-muted-foreground line-clamp-2">
                                        {task.description}
                                      </p>
                                    )}
                                    
                                    <div className="flex items-center gap-1 flex-wrap">
                                      <Badge 
                                        variant="secondary" 
                                        className={`text-xs ${PRIORITY_COLORS[task.priority]}`}
                                      >
                                        {task.priority.toUpperCase()}
                                      </Badge>
                                      <Badge variant="outline" className="text-xs">
                                        {TASK_TYPE_LABELS[task.type]}
                                      </Badge>
                                    </div>
                                    
                                    {task.customer && (
                                      <div className="text-xs text-muted-foreground">
                                        👤 {task.customer.fullName}
                                      </div>
                                    )}
                                    
                                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                                      {task.assignedTo && (
                                        <div className="flex items-center gap-1">
                                          <User className="h-3 w-3" />
                                          <span className="truncate">
                                            {getUserName(task.assignedTo)}
                                          </span>
                                        </div>
                                      )}
                                      {task.dueDate && (
                                        <div className="flex items-center gap-1">
                                          <CalendarIcon className="h-3 w-3" />
                                          <span>{formatDate(task.dueDate)}</span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {task.tags && (
                                      <div className="flex flex-wrap gap-1">
                                        {task.tags.split(',').map((tag, i) => (
                                          <span
                                            key={i}
                                            className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded"
                                          >
                                            {tag.trim()}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          
                          {columnTasks.length === 0 && (
                            <div className="text-center text-muted-foreground text-sm py-8">
                              No hay tareas en esta columna
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>
        </CardContent>
      </Card>
    </div>
  );
}