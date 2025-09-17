'use client';

import { useState, useTransition, useEffect } from 'react';
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
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createPostSaleTaskSchema, PostSaleTaskFormData } from '../schemas';
import { createPostSaleTask, updatePostSaleTask, getTeamUsers, getCustomersForSelection } from '../actions';
import { formatDate, cn } from '@/lib/utils';
import { CalendarIcon, User, Plus, MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import type { PostSaleTask as PostSaleTaskType } from '@/db/schema'; // Importa el tipo desde tu schema

// Interfaz actualizada para coincidir con tu schema.ts
interface PostSaleTask extends PostSaleTaskType {
    customer?: { id: string; fullName: string; };
    policy?: { id: string; marketplaceId?: string; insuranceCompany?: string; };
    assignedTo?: { id: string; name?: string; firstName?: string; lastName?: string; };
    createdBy?: { id: string; name?: string; firstName?: string; lastName?: string; };
}

interface PostVentaTrelloBoardProps {
    tasksByColumn: Record<string, PostSaleTask[]>;
}

// COLUMNAS ADAPTADAS A TU ESQUEMA (basadas en el status)
const BOARD_COLUMNS = [
    { id: 'pending', title: 'Pendiente', color: 'bg-gray-100' },
    { id: 'in_progress', title: 'En Progreso', color: 'bg-blue-100' },
    { id: 'on_hold', title: 'En Espera', color: 'bg-yellow-100' },
    { id: 'completed', title: 'Completadas', color: 'bg-emerald-100' },
    { id: 'cancelled', title: 'Canceladas', color: 'bg-red-100' }, // Se puede añadir si es necesario
];

const TASK_TYPE_LABELS: Record<PostSaleTaskType['type'], string> = {
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

const PRIORITY_COLORS: Record<PostSaleTaskType['priority'], string> = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
};

export default function PostVentaTrelloBoard({ tasksByColumn }: PostVentaTrelloBoardProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [teamUsers, setTeamUsers] = useState<Array<{id: string; name?: string; firstName?: string; lastName?: string; role: string;}>>([]);
    const [customers, setCustomers] = useState<Array<{id: string; fullName: string;}>>([]);
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
            boardColumn: 'pending', // Por defecto en 'Pendiente'
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
                // Aseguramos que el status inicial coincida con la columna
                const taskData = { ...data, status: data.boardColumn };
                const result = await createPostSaleTask(taskData);
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
    
    // --- FUNCIÓN handleDragEnd COMPLETAMENTE CORREGIDA Y ADAPTADA ---
    const handleDragEnd = (result: any) => {
        if (!result.destination) return;

        const { source, destination, draggableId } = result;

        if (source.droppableId === destination.droppableId && source.index === destination.index) {
            return;
        }
        
        const originalTasks = { ...tasks };

        const sourceColumnTasks = Array.from(tasks[source.droppableId] || []);
        const destColumnTasks = (source.droppableId === destination.droppableId)
            ? sourceColumnTasks
            : Array.from(tasks[destination.droppableId] || []);

        const [movedTask] = sourceColumnTasks.splice(source.index, 1);
        destColumnTasks.splice(destination.index, 0, movedTask);

        const newTasksState = {
            ...tasks,
            [source.droppableId]: sourceColumnTasks,
            [destination.droppableId]: destColumnTasks,
        };

        setTasks(newTasksState);

        startTransition(async () => {
            try {
                const result = await updatePostSaleTask(draggableId, {
                    // Actualiza tanto la columna como el estado
                    boardColumn: destination.droppableId,
                    status: destination.droppableId as PostSaleTaskType['status'],
                });

                if (result.success) {
                    toast.success("Tarea movida con éxito");
                    router.refresh(); // Sincroniza el estado final con el servidor
                } else {
                    toast.error(result.message);
                    setTasks(originalTasks); // Revertir en caso de error
                }
            } catch (error) {
                toast.error("Error al mover la tarea");
                setTasks(originalTasks);
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
                        <CardTitle className="text-xl">Tablero de Tareas Post-Venta</CardTitle>
                        <CardDescription>Gestiona las tareas de seguimiento de tus clientes y pólizas.</CardDescription>
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
                                <DialogTitle>Crear Nueva Tarea</DialogTitle>
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
                                                    className={`p-3 min-h-[500px] bg-gray-50/50 rounded-b-lg space-y-3 transition-colors ${
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
                                                                            <div className="text-xs text-muted-foreground pt-1">
                                                                                👤 {task.customer.fullName}
                                                                            </div>
                                                                        )}
                                                                        
                                                                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
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
                                                                                    <span>{formatDate(task.dueDate.toString())}</span>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </Draggable>
                                                    ))}
                                                    {provided.placeholder}
                                                    
                                                    {columnTasks.length === 0 && !snapshot.isDraggingOver && (
                                                        <div className="text-center text-muted-foreground text-sm py-8">
                                                            No hay tareas aquí
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