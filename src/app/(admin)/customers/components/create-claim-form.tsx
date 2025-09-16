'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createClaimSchema } from '../schemas';
import { createClaim, getCustomersForSelection } from '../actions';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Props {
  onClose: () => void;
}

export function CreateClaimForm({ onClose }: Props) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  const form = useForm({
    resolver: zodResolver(createClaimSchema),
    defaultValues: {
      customerId: '',
      policyId: '',
      dateFiled: undefined,
      claimNumber: '',
      description: '',
    },
  });

  useEffect(() => {
    getCustomersForSelection().then((data) => {
      setCustomers(data);
      setIsLoadingCustomers(false);
    });
  }, []);

  const selectedCustomerData = customers.find(c => c.id === selectedCustomer);

  async function onSubmit(data: any) {
    setIsLoading(true);
    try {
      const result = await createClaim(data);
      if (result.success) {
        onClose();
      } else {
        console.error(result.message);
      }
    } catch (error) {
      console.error('Error creating claim:', error);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cliente</FormLabel>
              <Select 
                onValueChange={(value) => {
                  field.onChange(value);
                  setSelectedCustomer(value);
                  form.setValue('policyId', '');
                }} 
                defaultValue={field.value}
                disabled={isLoadingCustomers}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder={isLoadingCustomers ? "Cargando clientes..." : "Selecciona un cliente"} />
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
          name="policyId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Póliza</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value} disabled={!selectedCustomer}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una póliza" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {selectedCustomerData?.policies?.map((policy) => (
                    <SelectItem key={policy.id} value={policy.id}>
                      {policy.planName} - {policy.insuranceCompany}
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
          name="dateFiled"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha del Reclamo</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className="w-full pl-3 text-left font-normal"
                    >
                      {field.value ? (
                        format(field.value, "PPP")
                      ) : (
                        <span>Selecciona la fecha del reclamo</span>
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
                    disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
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
          name="claimNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de Reclamo (Opcional)</FormLabel>
              <FormControl>
                <Input placeholder="CLM-2024-001234" {...field} />
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
              <FormLabel>Descripción del Reclamo</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Describe detalladamente el reclamo, incluyendo qué pasó, cuándo ocurrió, y cualquier información relevante..." 
                  {...field}
                  className="min-h-[100px]"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar Reclamo
          </Button>
        </div>
      </form>
    </Form>
  );
}