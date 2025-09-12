// app/(admin)/policies/components/policy-form.tsx

'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Check, ChevronsUpDown, Plus } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { createPolicy, getAvailableProcessors } from '../actions';
import { getCustomers } from '../../customers/actions';

const formSchema = z.object({
  customerId: z.string().min(1, 'El cliente es obligatorio.'),
  insuranceCompany: z.string().min(1, 'El nombre de la aseguradora es obligatorio.'),
  monthlyPremium: z.string().min(1, 'La prima mensual es obligatoria.'),
  marketplaceId: z.string().optional(), // <-- AÑADIDO
  assignedProcessorId: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function PolicyForm() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [customers, setCustomers] = useState<{ id: string; fullName: string }[]>([]);
  const [processors, setProcessors] = useState<{ id: string; name: string }[]>([]);
  const [customerPopoverOpen, setCustomerPopoverOpen] = useState(false);
  const [processorPopoverOpen, setProcessorPopoverOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: '',
      insuranceCompany: '',
      monthlyPremium: '',
      marketplaceId: '', 
      assignedProcessorId: '',
    },
  });

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const loadData = async () => {
    try {
      const [customersData, processorsData] = await Promise.all([
        getCustomers(1, 100),
        getAvailableProcessors(),
      ]);
      setCustomers(customersData.customers || []);
      setProcessors(processorsData || []);
    } catch (error) {
      console.error('Error al cargar los datos:', error);
      setError('No se pudieron cargar los datos necesarios para el formulario.');
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const result = await createPolicy(data);
      if (result.success) {
        setSuccess(true);
        form.reset();
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 2000);
      } else {
        setError(result.message);
      }
    } catch (error) {
      setError('Ocurrió un error al crear la póliza.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Añadir Póliza
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Añadir Nueva Póliza</DialogTitle>
          <DialogDescription>
            Crea una nueva póliza de seguro para un cliente existente.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* Campo de cliente con Combobox */}
          <div className="space-y-2">
            <Label htmlFor="customerId">Cliente *</Label>
            <Popover open={customerPopoverOpen} onOpenChange={setCustomerPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={customerPopoverOpen}
                  className={cn(
                    'w-full justify-between',
                    !form.watch('customerId') && 'text-muted-foreground'
                  )}
                >
                  {form.watch('customerId')
                    ? customers.find((customer) => customer.id === form.watch('customerId'))?.fullName
                    : 'Selecciona un cliente'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Buscar cliente..." />
                  <CommandEmpty>No se encontraron clientes.</CommandEmpty>
                  <CommandGroup className="max-h-60 overflow-y-auto">
                    {customers.map((customer) => (
                      <CommandItem
                        key={customer.id}
                        value={customer.fullName}
                        onSelect={() => {
                          form.setValue('customerId', customer.id, { shouldValidate: true });
                          setCustomerPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            form.watch('customerId') === customer.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {customer.fullName}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
            {form.formState.errors.customerId && (
              <p className="text-sm text-red-600">{form.formState.errors.customerId.message}</p>
            )}
          </div>

          {/* Campo de Aseguradora */}
          <div className="space-y-2">
            <Label htmlFor="insuranceCompany">Aseguradora *</Label>
            <Input
              id="insuranceCompany"
              {...form.register('insuranceCompany')}
              placeholder="Ej. Liberty Mutual, MAPFRE"
            />
            {form.formState.errors.insuranceCompany && (
              <p className="text-sm text-red-600">{form.formState.errors.insuranceCompany.message}</p>
            )}
          </div>

          {/* Campo de Prima Mensual */}
          <div className="space-y-2">
            <Label htmlFor="monthlyPremium">Prima Mensual *</Label>
            <Input
              id="monthlyPremium"
              {...form.register('monthlyPremium')}
              placeholder="150.00"
              type="number"
              step="0.01"
            />
            {form.formState.errors.monthlyPremium && (
              <p className="text-sm text-red-600">{form.formState.errors.monthlyPremium.message}</p>
            )}
          </div>

          <div className="space-y-2">
                <Label htmlFor="marketplaceId">ID Marketplace</Label>
                <Input
                id="marketplaceId"
                {...form.register('marketplaceId')}
                placeholder="Opcional"
                />
            </div>

          {/* Campo de Procesador Asignado con Combobox */}
          <div className="space-y-2">
            <Label htmlFor="assignedProcessorId">Procesador Asignado</Label>
            <Popover open={processorPopoverOpen} onOpenChange={setProcessorPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={processorPopoverOpen}
                  className={cn(
                    'w-full justify-between',
                    !form.watch('assignedProcessorId') && 'text-muted-foreground'
                  )}
                >
                  {form.watch('assignedProcessorId')
                    ? processors.find((processor) => processor.id === form.watch('assignedProcessorId'))?.name
                    : 'Seleccionar procesador (opcional)'}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                <Command>
                  <CommandInput placeholder="Buscar procesador..." />
                  <CommandEmpty>No se encontraron procesadores.</CommandEmpty>
                  <CommandGroup className="max-h-60 overflow-y-auto">
                    {processors.map((processor) => (
                      <CommandItem
                        key={processor.id}
                        value={processor.name}
                        onSelect={() => {
                          form.setValue('assignedProcessorId', processor.id);
                          setProcessorPopoverOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            'mr-2 h-4 w-4',
                            form.watch('assignedProcessorId') === processor.id ? 'opacity-100' : 'opacity-0'
                          )}
                        />
                        {processor.name}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>¡Póliza creada exitosamente!</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creando...' : 'Crear Póliza'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}