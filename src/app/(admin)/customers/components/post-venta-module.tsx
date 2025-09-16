'use client';

import { useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { policyStatusEnum } from '@/db/schema';
import { CalendarPlus, ShieldAlert, FileSignature } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { resendAOR } from '../actions';
import dynamic from 'next/dynamic';

// Carga dinámica de los componentes del formulario
const CreateAppointmentForm = dynamic(() => import('./create-appointment-form').then(mod => mod.CreateAppointmentForm), {
  ssr: false,
  loading: () => <p className="text-center p-4">Cargando formulario...</p>
});
const CreateClaimForm = dynamic(() => import('./create-claim-form').then(mod => mod.CreateClaimForm), {
  ssr: false,
  loading: () => <p className="text-center p-4">Cargando formulario...</p>
});

interface PostVentaModuleProps {
  policiesByStatus: any; // Usa un tipo más específico si lo tienes
}

export default function PostVentaModule({ policiesByStatus }: PostVentaModuleProps) {
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleCloseAppointmentModal = () => {
    setIsAppointmentModalOpen(false);
    startTransition(() => {
      router.refresh();
      toast.success("Cita agendada con éxito.");
    });
  };

  const handleCloseClaimModal = () => {
    setIsClaimModalOpen(false);
    startTransition(() => {
      router.refresh();
      toast.success("Reclamo registrado con éxito.");
    });
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

  const boardColumns: (typeof policyStatusEnum.enumValues[number])[] = [
    'new_lead',
    'contacting', 
    'info_captured',
    'in_review',
    'missing_docs',
    'sent_to_carrier',
    'approved',
    'active',
    'cancelled'
  ];

  const getStatusColor = (status: string) => {
    const colors = {
      'new_lead': 'bg-blue-100 text-blue-800',
      'contacting': 'bg-yellow-100 text-yellow-800',
      'info_captured': 'bg-purple-100 text-purple-800',
      'in_review': 'bg-orange-100 text-orange-800',
      'missing_docs': 'bg-red-100 text-red-800',
      'sent_to_carrier': 'bg-indigo-100 text-indigo-800',
      'approved': 'bg-green-100 text-green-800',
      'active': 'bg-emerald-100 text-emerald-800',
      'cancelled': 'bg-gray-100 text-gray-800',
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels = {
      'new_lead': 'Nuevo Lead',
      'contacting': 'Contactando',
      'info_captured': 'Info Capturada',
      'in_review': 'En Revisión',
      'missing_docs': 'Docs Faltantes',
      'sent_to_carrier': 'Enviado a Carrier',
      'approved': 'Aprobado',
      'active': 'Activo',
      'cancelled': 'Cancelado',
    };
    return labels[status as keyof typeof labels] || status;
  };
    
  return (
    <div className="flex flex-col gap-6 mt-4">
      <Card>
        <CardHeader>
          <CardTitle>Acciones de Post-Venta</CardTitle>
          <CardDescription>Gestiona citas con clientes, registra reclamos y maneja documentos AOR.</CardDescription>
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

      <div className="w-full overflow-x-auto pb-4">
        <div className="flex gap-6" style={{ minWidth: 'max-content' }}>
          {boardColumns.map(status => {
            const policiesInColumn = policiesByStatus[status] || [];
            return (
              <div key={status} className="flex-shrink-0 w-80">
                <div className="flex items-center justify-between p-3 rounded-t-lg bg-muted">
                  <h3 className="font-semibold text-sm">{getStatusLabel(status)}</h3>
                  <Badge variant="secondary">{policiesInColumn.length}</Badge>
                </div>
                <div className="p-3 space-y-4 bg-muted/30 rounded-b-lg min-h-[200px]">
                  {policiesInColumn.length > 0 ? (
                    policiesInColumn.map(policy => (
                      <Card key={policy.id} className="bg-card hover:shadow-md transition-shadow">
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
                          
                          {/* Información adicional */}
                          <div className="space-y-1 text-xs text-muted-foreground mt-2">
                            {policy.marketplaceId && (
                              <p>ID: {policy.marketplaceId}</p>
                            )}
                            {policy.monthlyPremium && (
                              <p>Prima: ${policy.monthlyPremium}/mes</p>
                            )}
                          </div>
                        </CardHeader>
                        
                        <CardFooter className="p-4 pt-0 space-y-2">
                          <div className="w-full">
                            <p className="text-xs text-muted-foreground">
                              Creado: {formatDate(policy.createdAt)}
                            </p>
                            
                            {/* Botones de acción según el estado */}
                            <div className="flex flex-col gap-2 mt-3">
                              {(status === 'new_lead' || status === 'missing_docs') && (
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="w-full text-xs h-7"
                                  onClick={() => handleResendAOR(policy.customerId, policy.id)}
                                  disabled={isPending}
                                >
                                  <FileSignature className="mr-1 h-3 w-3" />
                                  {status === 'new_lead' ? 'Enviar AOR' : 'Reenviar AOR'}
                                </Button>
                              )}
                              
                              {policy.aorLink && (
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="w-full text-xs h-7"
                                  asChild
                                >
                                  <a href={policy.aorLink} target="_blank" rel="noopener noreferrer">
                                    Ver AOR
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardFooter>
                      </Card>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground pt-4 text-center">
                      No hay pólizas en este estado.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* MODAL PARA AGENDAR CITA */}
      <Dialog open={isAppointmentModalOpen} onOpenChange={setIsAppointmentModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agendar Nueva Cita</DialogTitle>
            <DialogDescription>
              Completa los datos para agendar una nueva cita con el cliente.
            </DialogDescription>
          </DialogHeader>
          <CreateAppointmentForm onClose={handleCloseAppointmentModal} />
        </DialogContent>
      </Dialog>

      {/* MODAL PARA REGISTRAR RECLAMO */}
      <Dialog open={isClaimModalOpen} onOpenChange={setIsClaimModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Registrar Nuevo Reclamo</DialogTitle>
            <DialogDescription>
              Completa los datos del reclamo para registrarlo en el sistema.
            </DialogDescription>
          </DialogHeader>
          <CreateClaimForm onClose={handleCloseClaimModal} />
        </DialogContent>
      </Dialog>
    </div>
  );
}