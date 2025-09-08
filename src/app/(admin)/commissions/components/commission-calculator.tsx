'use client';

import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { createCommissionBatch } from '../actions';
import { formatCurrency } from '@/lib/utils';
import { Calculator, Plus, CheckCircle2, XCircle, Loader2 } from 'lucide-react';

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
  policyNumber?: string;
  taxCredit?: number;
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

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      periodDescription: '',
      policyIds: selectedPolicies.map(p => p.id),
    },
  });

  const selectedPoliciesIds = selectedPolicies.map(p => p.id);

  const calculateTotalCommission = useMemo(() => {
    const total = selectedPolicies.reduce((sum, policy) => {
      return sum + (Number(policy.monthlyPremium) * 0.1);
    }, 0);
    return formatCurrency(total);
  }, [selectedPolicies]);

  const calculateTotalPremiums = useMemo(() => {
    const total = selectedPolicies.reduce((sum, policy) => {
      return sum + Number(policy.monthlyPremium);
    }, 0);
    return formatCurrency(total);
  }, [selectedPolicies]);

  const calculateTotalTaxCredits = useMemo(() => {
    const total = selectedPolicies.reduce((sum, policy) => {
      return sum + (Number(policy.taxCredit) || 0);
    }, 0);
    return formatCurrency(total);
  }, [selectedPolicies]);

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
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
          window.location.reload();
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

          <div className="space-y-4">
            <Card className="bg-green-50/50 border-green-200 shadow-sm">
              <CardContent className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-green-700 font-medium">Pólizas</p>
                    <p className="text-2xl font-bold text-green-900">{selectedPolicies.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-medium">Total Primas</p>
                    <p className="text-2xl font-bold text-green-900">{calculateTotalPremiums}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-medium">Créditos Fiscales</p>
                    <p className="text-2xl font-bold text-green-900">{calculateTotalTaxCredits}</p>
                  </div>
                  <div>
                    <p className="text-sm text-green-700 font-medium">Total Comisiones</p>
                    <p className="text-2xl font-bold text-green-900">{calculateTotalCommission}</p>
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

          {/* Preview of selected policies */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Pólizas Incluidas</Label>
            <div className="max-h-60 overflow-y-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Cliente</TableHead>
                    <TableHead className="text-xs">N° Póliza</TableHead>
                    <TableHead className="text-xs text-right">Prima</TableHead>
                    <TableHead className="text-xs text-right">Comisión</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedPolicies.map((policy) => (
                    <TableRow key={policy.id} className="text-sm">
                      <TableCell>{policy.customerName}</TableCell>
                      <TableCell className="text-xs text-gray-600">{policy.policyNumber || 'N/A'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(Number(policy.monthlyPremium))}</TableCell>
                      <TableCell className="text-right font-semibold text-green-600">
                        {formatCurrency(Number(policy.monthlyPremium) * 0.1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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