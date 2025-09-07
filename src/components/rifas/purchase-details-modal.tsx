// components/PurchaseDetailsModal.tsx
"use client";

import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose, // <-- Importado
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useFormStatus } from "react-dom";
import { Check, X, Eye, Receipt, User, Mail, Phone, Ticket, DollarSign, CreditCard, Hash, ImageIcon, ExternalLink, Loader2 } from "lucide-react";
import Image from "next/image";
import { updatePurchaseStatusAction } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";
import { useFormState } from "react-dom";
// --- Nuevas importaciones ---
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";

// Componente para los botones de acción con estado de carga (sin cambios)
function SubmitButton({ children, newStatus, disabled }: { children: React.ReactNode; newStatus: "confirmed" | "rejected", disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      disabled={pending || disabled}
      variant={newStatus === 'confirmed' ? 'default' : 'destructive'}
      className="w-full sm:w-auto flex items-center gap-2"
    >
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : (newStatus === 'confirmed' ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />)}
      {children}
    </Button>
  );
}

// Componente para mostrar un detalle con ícono (sin cambios)
function InfoDetail({ icon, label, value }: { icon: React.ElementType, label: string, value: React.ReactNode }) {
  const Icon = icon;
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-5 w-5 text-gray-500 mt-1 flex-shrink-0" />
      <div>
        <p className="font-semibold text-gray-800">{label}</p>
        <p className="text-gray-600 break-words">{value || "No proporcionado"}</p>
      </div>
    </div>
  );
}

interface PurchaseDetailsModalProps {
  purchase: {
    id: string;
    buyerName: string | null;
    buyerEmail: string;
    buyerPhone: string | null;
    ticketCount: number;
    amount: string;
    paymentMethod: string | null;
    paymentReference: string | null;
    paymentScreenshotUrl: string | null;
    status: string;
  };
  raffleCurrency: 'USD' | 'VES';
}

export function PurchaseDetailsModal({ purchase, raffleCurrency }: PurchaseDetailsModalProps) {
  const [open, setOpen] = useState(false);
  // --- Estados para el diálogo de rechazo ---
  const [rejectionDialogOpen, setRejectionDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState<'invalid_payment' | 'malicious' | ''>('');
  const [rejectionComment, setRejectionComment] = useState('');
  
  const [state, formAction] = useFormState(updatePurchaseStatusAction, { success: false, message: "" });
  const { toast } = useToast();

  useEffect(() => {
    if (state.message) {
      setOpen(false);
      setRejectionDialogOpen(false); // Cierra el diálogo de rechazo también
      toast({
        title: state.success ? "Éxito" : "Error",
        description: state.message,
        variant: state.success ? "default" : "destructive",
      });
      // Limpiar estados al cerrar
      if (state.success) {
        setRejectionReason('');
        setRejectionComment('');
      }
    }
  }, [state, toast]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
  };

  const formatCurrency = (amount: string, currency: 'USD' | 'VES') => {
    const value = parseFloat(amount).toFixed(2);
    return currency === 'USD' ? `$${value}` : `Bs. ${value}`;
  };

  // --- Lógica para deshabilitar el botón de rechazar ---
  const isRejectButtonDisabled = !rejectionReason || (rejectionReason === 'malicious' && rejectionComment.trim() === '');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Eye className="h-4 w-4" />
          Ver Detalles
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl p-0">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Receipt className="h-6 w-6" />
            Detalles de la Compra
          </DialogTitle>
          <DialogDescription>
            Revisa la información del comprador y el comprobante de pago para confirmar o rechazar la transacción.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-6 pb-6 max-h-[70vh] overflow-y-auto">
          {/* Columna de Información */}
          <div className="space-y-5 pr-4">
            <InfoDetail icon={User} label="Comprador" value={purchase.buyerName} />
            <InfoDetail icon={Mail} label="Email" value={purchase.buyerEmail} />
            <InfoDetail icon={Phone} label="Teléfono" value={purchase.buyerPhone} />
            
            <Separator className="my-4" />

            <InfoDetail icon={Ticket} label="Cantidad de Tickets" value={purchase.ticketCount} />
            <InfoDetail 
              icon={DollarSign} 
              label="Monto Total" 
              value={formatCurrency(purchase.amount, raffleCurrency)} 
            />
            <InfoDetail icon={CreditCard} label="Método de Pago" value={purchase.paymentMethod} />
            <InfoDetail icon={Hash} label="Referencia de Pago" value={purchase.paymentReference} />
          </div>

          {/* Columna de Captura de Pago */}
          <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-gray-500" />
                Comprobante de Pago
              </h3>
            <div className="relative aspect-video w-full rounded-lg overflow-hidden border-2 border-dashed bg-slate-50 flex items-center justify-center">
              {purchase.paymentScreenshotUrl ? (
                <Image src={purchase.paymentScreenshotUrl} alt="Captura de pago" fill className="object-contain" />
              ) : (
                <div className="text-center text-gray-500">
                  <ImageIcon className="h-12 w-12 mx-auto mb-2" />
                  <p>No se adjuntó imagen.</p>
                </div>
              )}
            </div>
            {purchase.paymentScreenshotUrl && (
                  <a href={purchase.paymentScreenshotUrl} target="_blank" rel="noopener noreferrer" className="w-full">
                    <Button variant="outline" className="w-full flex items-center gap-2">
                        <ExternalLink className="h-4 w-4" />
                        Ver imagen en tamaño completo
                    </Button>
                  </a>
            )}
          </div>
        </div>

        <DialogFooter className="bg-slate-50 p-4 border-t flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
          {purchase.status === 'pending' ? (
            <>
              {/* --- Nuevo diálogo de rechazo --- */}
              <Dialog open={rejectionDialogOpen} onOpenChange={setRejectionDialogOpen}>
                <DialogTrigger asChild>
                  <Button type="button" variant="destructive" className="w-full sm:w-auto flex items-center gap-2">
                    <X className="h-4 w-4" /> Rechazar Compra
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Rechazar la compra</DialogTitle>
                    <DialogDescription>
                      Selecciona un motivo para el rechazo. Se enviará una notificación al comprador.
                    </DialogDescription>
                  </DialogHeader>
                  <form action={formAction} className="space-y-4">
                      <input type="hidden" name="purchaseId" value={purchase.id} />
                      <input type="hidden" name="newStatus" value="rejected" />
                      
                      <RadioGroup
                        name="rejectionReason"
                        required
                        value={rejectionReason}
                        onValueChange={(value: 'invalid_payment' | 'malicious' | '') => setRejectionReason(value)}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="invalid_payment" id="r1" />
                          <Label htmlFor="r1">Pago inválido</Label>
                        </div>
                        <p className="pl-6 text-sm text-muted-foreground">
                          Se le notificará al cliente que intente su compra de nuevo.
                        </p>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="malicious" id="r2" />
                          <Label htmlFor="r2">Malicioso / Fraudulento</Label>
                        </div>
                         <p className="pl-6 text-sm text-muted-foreground">
                          Se requiere un comentario explicando el motivo.
                        </p>
                      </RadioGroup>

                      {rejectionReason === 'malicious' && (
                        <div className="grid w-full gap-1.5">
                            <Label htmlFor="rejectionComment">Comentario (obligatorio)</Label>
                            <Textarea
                              placeholder="Ej: La imagen del comprobante está alterada."
                              id="rejectionComment"
                              name="rejectionComment"
                              value={rejectionComment}
                              onChange={(e) => setRejectionComment(e.target.value)}
                            />
                        </div>
                      )}

                      <DialogFooter>
                        <DialogClose asChild>
                          <Button type="button" variant="outline">Cancelar</Button>
                        </DialogClose>
                        <SubmitButton newStatus="rejected" disabled={isRejectButtonDisabled}>
                          Rechazar y Notificar
                        </SubmitButton>
                      </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>

              {/* Diálogo de Confirmación (sin cambios) */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" className="w-full sm:w-auto flex items-center gap-2">
                     <Check className="h-4 w-4" /> Confirmar Compra
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro de confirmar esta compra?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Al confirmar, se asignarán los tickets al comprador y la transacción se marcará como completada.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <form action={formAction} className="w-full sm:w-auto">
                      <input type="hidden" name="purchaseId" value={purchase.id} />
                      <input type="hidden" name="newStatus" value="confirmed" />
                      <AlertDialogAction asChild>
                        <SubmitButton newStatus="confirmed">Sí, confirmar</SubmitButton>
                      </AlertDialogAction>
                    </form>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </>
          ) : (
            <Button variant="outline" disabled>
              Esta compra ya fue {purchase.status === 'confirmed' ? 'confirmada' : 'rechazada'}.
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}