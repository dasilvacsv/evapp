'use client';

import { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate, cn } from '@/lib/utils';
import Link from 'next/link';
import { policyStatusEnum } from '@/db/schema';
import { CalendarPlus, ShieldAlert, FileSignature } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { resendAOR, updatePolicyStatus } from '../actions'; // <-- AÑADE LA NUEVA ACCIÓN
import dynamic from 'next/dynamic';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

// Carga dinámica de los componentes del formulario
const CreateAppointmentForm = dynamic(() => import('./create-appointment-form').then(mod => mod.CreateAppointmentForm), {
    ssr: false,
    loading: () => <p className="text-center p-4">Cargando formulario...</p>
});
const CreateClaimForm = dynamic(() => import('./create-claim-form').then(mod => mod.CreateClaimForm), {
    ssr: false,
    loading: () => <p className="text-center p-4">Cargando formulario...</p>
});

// Define un tipo más específico para la póliza para mayor seguridad
interface Policy {
    id: string;
    customerId: string;
    customer: { fullName: string };
    insuranceCompany: string | null;
    marketplaceId?: string | null;
    monthlyPremium?: string | null;
    createdAt: Date;
    aorLink?: string | null;
    status: typeof policyStatusEnum.enumValues[number];
}

interface PostVentaModuleProps {
    policiesByStatus: Record<string, Policy[]>;
}

export default function PostVentaModule({ policiesByStatus }: PostVentaModuleProps) {
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    // Estado local para manejar las pólizas y permitir actualizaciones optimistas
    const [policies, setPolicies] = useState(policiesByStatus);

    useEffect(() => {
        setPolicies(policiesByStatus);
    }, [policiesByStatus]);


    const handleCloseAppointmentModal = () => {
        setIsAppointmentModalOpen(false);
        toast.success("Cita agendada con éxito.");
        router.refresh();
    };

    const handleCloseClaimModal = () => {
        setIsClaimModalOpen(false);
        toast.success("Reclamo registrado con éxito.");
        router.refresh();
    };

    const handleResendAOR = async (customerId: string, policyId: string) => {
        if (!window.confirm('¿Estás seguro de que quieres reenviar el AOR? Se generará un nuevo documento.')) {
            return;
        }

        startTransition(async () => {
            try {
                const result = await resendAOR(customerId, policyId);
                if (result.success) {
                    toast.success("AOR reenviado con éxito. El cliente recibirá un nuevo email.");
                    router.refresh();
                } else {
                    toast.error(result.message || "Error al reenviar el AOR");
                }
            } catch (error) {
                toast.error("Error inesperado al reenviar el AOR");
                console.error(error);
            }
        });
    };

    // --- NUEVA FUNCIÓN PARA MANEJAR EL DRAG-AND-DROP ---
    const handleDragEnd = (result: any) => {
    const { source, destination, draggableId } = result;

    if (!destination || (source.droppableId === destination.droppableId && source.index === destination.index)) {
        return;
    }

    // --- LÓGICA MEJORADA PARA EVITAR ERRORES ---

    // 1. Guardar una copia intacta del estado original para poder revertir
    const originalPolicies = JSON.parse(JSON.stringify(policies)); 

    // 2. Crear copias de las columnas de origen y destino para manipularlas de forma segura
    const sourceColumn = Array.from(policies[source.droppableId] || []);
    const destColumn = source.droppableId === destination.droppableId 
        ? sourceColumn 
        : Array.from(policies[destination.droppableId] || []);

    // 3. Mover la póliza entre las copias de las columnas
    const [movedPolicy] = sourceColumn.splice(source.index, 1);
    destColumn.splice(destination.index, 0, movedPolicy);

    // 4. Construir el nuevo estado para la actualización visual optimista
    const newPoliciesState = {
        ...policies,
        [source.droppableId]: sourceColumn,
        [destination.droppableId]: destColumn,
    };
    
    setPolicies(newPoliciesState); // Actualización optimista

    startTransition(async () => {
        try {
            const res = await updatePolicyStatus(draggableId, destination.droppableId);
            
            // Si el servidor devuelve un error, lo lanzamos para que lo capture el catch
            if (!res.success) {
                throw new Error(res.message);
            }
            
            toast.success(`Póliza movida a "${getStatusLabel(destination.droppableId)}"`);
            // router.refresh() es opcional aquí, ya que la UI ya está sincronizada
        
        } catch (error: any) {
            // Si algo falla, mostramos el error y revertimos al estado original
            toast.error(`Error al mover la póliza: ${error.message}`);
            setPolicies(originalPolicies); 
        }
    });
};

    const boardColumns: (typeof policyStatusEnum.enumValues[number])[] = [
        'new_lead', 'contacting', 'info_captured', 'in_review', 'missing_docs', 'sent_to_carrier', 'approved', 'active', 'cancelled'
    ];

    const getStatusColor = (status: string) => { /* ... (sin cambios) ... */
        const colors = { 'new_lead': 'bg-blue-100 text-blue-800', 'contacting': 'bg-yellow-100 text-yellow-800', 'info_captured': 'bg-purple-100 text-purple-800', 'in_review': 'bg-orange-100 text-orange-800', 'missing_docs': 'bg-red-100 text-red-800', 'sent_to_carrier': 'bg-indigo-100 text-indigo-800', 'approved': 'bg-green-100 text-green-800', 'active': 'bg-emerald-100 text-emerald-800', 'cancelled': 'bg-gray-100 text-gray-800' };
        return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
    };
    const getStatusLabel = (status: string) => { /* ... (sin cambios) ... */
        const labels = { 'new_lead': 'Nuevo Lead', 'contacting': 'Contactando', 'info_captured': 'Info Capturada', 'in_review': 'En Revisión', 'missing_docs': 'Docs Faltantes', 'sent_to_carrier': 'Enviado a Carrier', 'approved': 'Aprobado', 'active': 'Activo', 'cancelled': 'Cancelado' };
        return labels[status as keyof typeof labels] || status;
    };

    return (
        <div className="flex flex-col gap-6 mt-4">
            <Card>
                <CardHeader>
                    <CardTitle>Acciones de Post-Venta</CardTitle>
                    <CardDescription>Gestiona citas, registra reclamos y arrastra las pólizas para cambiar su estado.</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col sm:flex-row gap-4">
                    <Button variant="outline" onClick={() => setIsAppointmentModalOpen(true)}>
                        <CalendarPlus className="mr-2 h-4 w-4" /> Agendar Nueva Cita
                    </Button>
                    <Button variant="outline" onClick={() => setIsClaimModalOpen(true)}>
                        <ShieldAlert className="mr-2 h-4 w-4" /> Registrar Nuevo Reclamo
                    </Button>
                </CardContent>
            </Card>

            <DragDropContext onDragEnd={handleDragEnd}>
                <div className="w-full overflow-x-auto pb-4">
                    <div className="flex gap-6" style={{ minWidth: 'max-content' }}>
                        {boardColumns.map(status => {
                            const policiesInColumn = policies[status] || [];
                            return (
                                <Droppable key={status} droppableId={status}>
                                    {(provided, snapshot) => (
                                        <div 
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className="flex-shrink-0 w-80"
                                        >
                                            <div className="flex items-center justify-between p-3 rounded-t-lg bg-muted">
                                                <h3 className="font-semibold text-sm">{getStatusLabel(status)}</h3>
                                                <Badge variant="secondary">{policiesInColumn.length}</Badge>
                                            </div>
                                            <div className={cn(
                                                "p-3 space-y-4 bg-muted/30 rounded-b-lg min-h-[200px] transition-colors",
                                                snapshot.isDraggingOver ? "bg-primary/10" : ""
                                            )}>
                                                {policiesInColumn.map((policy, index) => (
                                                    <Draggable key={policy.id} draggableId={policy.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.draggableProps}
                                                                {...provided.dragHandleProps}
                                                                className={cn(snapshot.isDragging && "shadow-xl")}
                                                            >
                                                                <Card className="bg-card hover:shadow-md transition-shadow">
                                                                    <CardHeader className="p-4">
                                                                        <div className="flex items-start justify-between">
                                                                            <div className="flex-1">
                                                                                <Link
                                                                                    href={`/customers/${policy.customerId}`}
                                                                                    className="font-semibold text-primary hover:underline block"
                                                                                >
                                                                                    {policy.customer.fullName}
                                                                                </Link>
                                                                                <CardDescription className="text-xs mt-1">
                                                                                    {policy.insuranceCompany}
                                                                                </CardDescription>
                                                                            </div>
                                                                            <Badge
                                                                                variant="outline"
                                                                                className={`text-xs ${getStatusColor(status)}`}
                                                                            >
                                                                                {getStatusLabel(status)}
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="space-y-1 text-xs text-muted-foreground mt-2">
                                                                            {policy.marketplaceId && <p>ID: {policy.marketplaceId}</p>}
                                                                            {policy.monthlyPremium && <p>Prima: ${policy.monthlyPremium}/mes</p>}
                                                                        </div>
                                                                    </CardHeader>
                                                                    <CardFooter className="p-4 pt-0 space-y-2">
                                                                        {/* ... Contenido del footer sin cambios ... */}
                                                                    </CardFooter>
                                                                </Card>
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                                {policiesInColumn.length === 0 && (
                                                    <p className="text-sm text-muted-foreground pt-4 text-center">
                                                        No hay pólizas en este estado.
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </Droppable>
                            )
                        })}
                    </div>
                </div>
            </DragDropContext>

            {/* ... (MODALES SIN CAMBIOS) ... */}
            <Dialog open={isAppointmentModalOpen} onOpenChange={setIsAppointmentModalOpen}>{/* ... */}</Dialog>
            <Dialog open={isClaimModalOpen} onOpenChange={setIsClaimModalOpen}>{/* ... */}</Dialog>
        </div>
    );
}