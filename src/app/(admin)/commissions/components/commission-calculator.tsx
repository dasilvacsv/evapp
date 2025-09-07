// src/app/commissions/components/commission-calculator.tsx

'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createCommissionBatch } from '../actions';
import { formatCurrency } from '@/lib/utils';
import { Calculator, Plus, Search, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

const formSchema = z.object({
  periodDescription: z.string().min(1, 'La descripción del período es obligatoria.'),
  policyIds: z.array(z.string()).min(1, 'Debes seleccionar al menos una póliza.'),
});

type FormData = z.infer<typeof formSchema>;

interface Policy {
  id: string;
  customerName: string;
  agentName: string;
  insuranceCompany: string;
  monthlyPremium: number;
}

interface CommissionCalculatorProps {
  policies: Policy[];
  selectedPolicies: Policy[];
}

export default function CommissionCalculator({ policies, selectedPolicies }: CommissionCalculatorProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      periodDescription: '',
      policyIds: selectedPolicies.map(p => p.id),
    },
  });

  const selectedPoliciesIds = selectedPolicies.map(p => p.id);
  
  // No necesitamos handlePolicySelection ni useMemo para la selección aquí,
  // porque el componente padre (page.tsx) gestiona la selección.
  // El botón de "Crear Lote" en el modal solo usa las políticas seleccionadas.

  const calculateTotalCommission = useMemo(() => {
    const total = selectedPolicies.reduce((sum, policy) => {
      return sum + (Number(policy.monthlyPremium) * 0.1); // Tasa de comisión del 10%
    }, 0);
    return formatCurrency(total);
  }, [selectedPolicies]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Usamos los IDs de las pólizas seleccionadas, que ya están en el componente padre
      const result = await createCommissionBatch({
        ...data,
        policyIds: selectedPoliciesIds,
      });

      if (result.success) {
        setSuccess(true);
        form.reset({ periodDescription: '', policyIds: [] });
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
          window.location.reload(); // Recarga la página para ver los cambios
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError('Ocurrió un error al crear el lote de comisiones.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button disabled={selectedPolicies.length === 0} variant="default" className="w-full md:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Crear Lote de Comisiones
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-2 border-b">
          <DialogTitle className="flex items-center text-2xl font-bold text-gray-900">
            <Calculator className="mr-3 h-6 w-6 text-gray-600" />
            Confirmar Lote de Comisiones
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            Revisa las pólizas seleccionadas y crea el nuevo lote de pago.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex-grow flex flex-col p-6 space-y-6 overflow-y-auto" id="commission-batch-form">
          {/* Sección: Información del Lote */}
          <div className="space-y-4">
            <Label htmlFor="periodDescription" className="text-sm font-medium text-gray-700">Descripción del Período *</Label>
            <Input
              id="periodDescription"
              {...form.register('periodDescription')}
              placeholder="Ej: Comisiones de Diciembre 2024"
              className="mt-1"
            />
            {form.formState.errors.periodDescription && <p className="text-sm text-red-600 mt-1">{form.formState.errors.periodDescription.message}</p>}
          </div>

          <hr className="border-t" />

          {/* Sección: Resumen y Alertas */}
          <div className="space-y-4">
            <Card className="bg-green-50/50 border-green-200 shadow-sm">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Pólizas Seleccionadas</p>
                    <p className="text-3xl font-bold text-green-900">{selectedPolicies.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-medium">Total a Pagar</p>
                    <p className="text-3xl font-bold text-green-900">{calculateTotalCommission}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {error && (
              <Alert variant="destructive" className="border-red-400">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error al crear lote</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert className="border-green-400 bg-green-50">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>¡Éxito!</AlertTitle>
                <AlertDescription>Lote de comisiones creado con éxito.</AlertDescription>
              </Alert>
            )}
          </div>
        </form>
        
        <DialogFooter className="p-6 border-t bg-gray-50 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button
            type="submit"
            form="commission-batch-form"
            disabled={loading || selectedPolicies.length === 0}
            onClick={form.handleSubmit(onSubmit)}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            {loading ? 'Creando...' : 'Crear Lote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}