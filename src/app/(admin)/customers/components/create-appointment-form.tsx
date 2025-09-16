'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createAppointmentSchema } from '../schemas';
import { createAppointment, getCustomersForSelection } from '../actions';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { useEffect } from 'react';

interface Props {
  onClose: () => void;
}

export function CreateAppointmentForm({ onClose }: Props) {
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);

  const form = useForm({
    resolver: zodResolver(createAppointmentSchema),
    defaultValues: {
      customerId: '',
      policyId: '',
      appointmentDate: undefined,
      notes: '',
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
      const result = await createAppointment(data);
      if (result.success) {
        onClose();
      } else {
        // Handle error
        console.error(result.message);
      }
    } catch (error) {
      console.error('Error creating appointment:', error);
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
          name="appointmentDate"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha y Hora de la Cita</FormLabel>
              <div className="flex gap-2">
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
                          <span>Selecciona una fecha</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        if (date) {
                          const currentTime = field.value ? new Date(field.value) : new Date();
                          date.setHours(currentTime.getHours(), currentTime.getMinutes());
                          field.onChange(date);
                        }
                      }}
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Input
                  type="time"
                  className="w-32"
                  onChange={(e) => {
                    if (field.value && e.target.value) {
                      const [hours, minutes] = e.target.value.split(':');
                      const newDate = new Date(field.value);
                      newDate.setHours(parseInt(hours), parseInt(minutes));
                      field.onChange(newDate);
                    }
                  }}
                  value={field.value ? format(field.value, "HH:mm") : ""}
                />
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Notas adicionales sobre la cita..." {...field} />
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
            Agendar Cita
          </Button>
        </div>
      </form>
    </Form>
  );
}