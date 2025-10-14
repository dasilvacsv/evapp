'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Pencil, CheckCircle, XCircle } from 'lucide-react';
import { updatePolicyStatus } from '../actions';
import { toast } from 'sonner';

const formSchema = z.object({
  status: z.enum([
    'new_lead', 'contacting', 'info_captured', 'in_review', 'missing_docs', 
    'sent_to_carrier', 'approved', 'rejected', 'active', 'cancelled',
  ]),
  insuranceCompany: z.string().optional(),
  monthlyPremium: z.string().optional(),
  marketplaceId: z.string().optional(),
  effectiveDate: z.string().optional(),
  taxCredit: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface UpdateStatusFormProps {
  policyId: string;
  currentStatus: string;
  currentCompany?: string;
  currentPremium?: string;
  currentMarketplaceId?: string;
  currentEffectiveDate?: string;
  currentTaxCredit?: string;
}

export default function UpdateStatusForm({
  policyId,
  currentStatus,
  currentCompany,
  currentPremium,
  currentMarketplaceId,
  currentEffectiveDate,
  currentTaxCredit,
}: UpdateStatusFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      status: currentStatus as any,
      insuranceCompany: currentCompany || '',
      monthlyPremium: currentPremium || '',
      marketplaceId: currentMarketplaceId || '',
      effectiveDate: currentEffectiveDate || '',
      taxCredit: currentTaxCredit || '',
    },
  });

  const { isDirty, formState: { errors } } = form;

  useEffect(() => {
    if (open) {
      form.reset({
        status: currentStatus as any,
        insuranceCompany: currentCompany || '',
        monthlyPremium: currentPremium || '',
        marketplaceId: currentMarketplaceId || '',
        effectiveDate: currentEffectiveDate || '',
        taxCredit: currentTaxCredit || '',
      });
    }
  }, [open, currentStatus, currentCompany, currentPremium, currentMarketplaceId, currentEffectiveDate, currentTaxCredit, form]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const result = await updatePolicyStatus({ policyId, ...data });
      if (result.success) {
        toast.success('¡Póliza actualizada con éxito! 🚀');
        setOpen(false);
      } else {
        toast.error(result.message || 'Ocurrió un error al actualizar la póliza. 🙁');
      }
    } catch (error) {
      toast.error('Ocurrió un error inesperado. Por favor, inténtalo de nuevo. 😞');
    } finally {
      setLoading(false);
    }
  };

  const statusOptions = [
      { value: 'new_lead', label: 'Nuevo Contacto' },
      { value: 'contacting', label: 'Contactando' },
      { value: 'info_captured', label: 'Información Capturada' },
      { value: 'in_review', label: 'En Revisión' },
      { value: 'missing_docs', label: 'Documentos Faltantes' },
      { value: 'sent_to_carrier', label: 'Enviado a la Aseguradora' },
      { value: 'approved', label: 'Aprobado', icon: CheckCircle },
      { value: 'rejected', label: 'Rechazado', icon: XCircle },
      { value: 'active', label: 'Activo', icon: CheckCircle },
      { value: 'cancelled', label: 'Cancelado', icon: XCircle },
  ];

  const selectedStatus = form.watch('status');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil className="mr-2 h-4 w-4" />
          Editar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Póliza</DialogTitle>
          <DialogDescription>
            Actualiza el estado y los detalles. Los cambios quedarán registrados en el historial del cliente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="status">Estado *</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) => form.setValue('status', value as any, { shouldDirty: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un estado" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex items-center gap-2">
                        {Icon && <Icon className="h-4 w-4" />}
                        {option.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {errors.status && (
              <p className="text-sm text-red-600">{errors.status.message}</p>
            )}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="insuranceCompany">Compañía de Seguros</Label>
              <Input
                id="insuranceCompany"
                {...form.register('insuranceCompany')}
                placeholder="ej. State Farm, Allstate"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="monthlyPremium">Prima Mensual</Label>
              <Input
                id="monthlyPremium"
                {...form.register('monthlyPremium')}
                placeholder="150.00"
                type="number"
                step="0.01"
              />
              {errors.monthlyPremium && (
                <p className="text-sm text-red-600">{errors.monthlyPremium.message}</p>
              )}
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="marketplaceId">ID Marketplace</Label>
              <Input
                id="marketplaceId"
                {...form.register('marketplaceId')}
                placeholder="ej. MKP123456"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="effectiveDate">Fecha Efectiva</Label>
              <Input
                id="effectiveDate"
                {...form.register('effectiveDate')}
                type="date"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="taxCredit">Crédito Fiscal</Label>
            <Input
              id="taxCredit"
              {...form.register('taxCredit')}
              placeholder="0.00"
              type="number"
              step="0.01"
            />
          </div>

          <DialogFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !isDirty}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}