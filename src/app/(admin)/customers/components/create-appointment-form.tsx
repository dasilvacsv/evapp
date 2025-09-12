'use client';

import { useEffect, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { createAppointment, getCustomersForSelection } from '../actions';
import { Input } from '@/components/ui/input';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const formSchema = z.object({
  customerId: z.string().nonempty('Selecciona un cliente.'),
  policyId: z.string().nonempty('Selecciona una póliza.'),
  appointmentDate: z.date({
    required_error: 'La fecha de la cita es obligatoria.',
  }),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Props {
  onClose: () => void;
}

export function CreateAppointmentForm({ onClose }: Props) {
  const [customers, setCustomers] = useState<{ id: string; fullName: string; policies: { id: string; planName: string; insuranceCompany: string }[] }[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  useEffect(() => {
    async function fetchCustomers() {
      const data = await getCustomersForSelection();
      setCustomers(data);
    }
    fetchCustomers();
  }, []);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  async function onSubmit(data: FormData) {
    startTransition(async () => {
      const result = await createAppointment(data);
      if (result.success) {
        onClose();
      } else {
        console.error(result.message);
      }
    });
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
              <Select onValueChange={(value) => {
                field.onChange(value);
                setSelectedCustomerId(value);
                form.setValue('policyId', '');
              }} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {customers.map(customer => (
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
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger disabled={!selectedCustomerId}>
                    <SelectValue placeholder="Selecciona una póliza..." />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {selectedCustomer?.policies.map(policy => (
                    <SelectItem key={policy.id} value={policy.id}>
                      {policy.planName} ({policy.insuranceCompany})
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
              <FormLabel>Fecha de la Cita</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full pl-3 text-left font-normal",
                        !field.value && "text-muted-foreground"
                      )}
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
                    onSelect={field.onChange}
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
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notas</FormLabel>
              <FormControl>
                <Textarea placeholder="Escribe notas sobre la cita..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Agendar Cita
        </Button>
      </form>
    </Form>
  );
}