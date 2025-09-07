'use client';

import { useState, ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { createCustomer } from '../actions';
import { Loader2, CalendarIcon, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

// --- Esquema de validación en base a tu schema.ts ---
const formSchema = z.object({
  fullName: z.string().min(3, 'El nombre completo debe tener al menos 3 caracteres.'),
  birthDate: z.date({ required_error: 'La fecha de nacimiento es obligatoria.' }),
  email: z.string().email('El correo electrónico no es válido.').optional().or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  gender: z.enum(['male', 'female', 'other', 'prefer_not_to_say']).optional(),
  immigrationStatus: z.enum(['citizen', 'green_card', 'work_permit', 'other']).optional(),
  taxType: z.enum(['w2', '1099']).optional(),
  income: z.string().optional(),
  ssn: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface CustomerFormProps {
    children: ReactNode;
}

export default function CustomerForm({ children }: CustomerFormProps) {
  const [open, setOpen] = useState(false);
  const [formStatus, setFormStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      address: '',
      ssn: '',
      income: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    setFormStatus('loading');
    setErrorMessage('');

    try {
      const result = await createCustomer(data as any); 
      if (result.success) {
        setFormStatus('success');
        form.reset();
        setTimeout(() => {
          setOpen(false);
          setFormStatus('idle');
        }, 2000);
      } else {
        setErrorMessage(result.message || 'Ocurrió un error desconocido.');
        setFormStatus('error');
      }
    } catch (error) {
      setErrorMessage('No se pudo conectar con el servidor. Inténtalo de nuevo.');
      setFormStatus('error');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Registrar Nuevo Cliente</DialogTitle>
          <DialogDescription>
            Completa la información para crear un nuevo cliente en el sistema. Los campos con * son obligatorios.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="fullName" render={({ field }) => (
                <FormItem><FormLabel>Nombre Completo *</FormLabel><FormControl><Input placeholder="Ej: Ana María Pérez" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="birthDate" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Fecha de Nacimiento *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                          {field.value ? format(field.value, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={field.value} onSelect={field.onChange} captionLayout="dropdown" fromYear={1920} toYear={new Date().getFullYear()} disabled={(date) => date > new Date()} initialFocus />
                    </PopoverContent>
                  </Popover><FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input type="email" placeholder="ejemplo@correo.com" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="Ej: 300 123 4567" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            
            <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem><FormLabel>Dirección</FormLabel><FormControl><Textarea placeholder="123 Calle Principal, Ciudad, Estado" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField control={form.control} name="gender" render={({ field }) => (
                <FormItem><FormLabel>Género</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="male">Masculino</SelectItem>
                      <SelectItem value="female">Femenino</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefiero no decirlo</SelectItem>
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="ssn" render={({ field }) => (
                <FormItem><FormLabel>Cédula / SSN</FormLabel><FormControl><Input placeholder="Ej: 1022334455" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="immigrationStatus" render={({ field }) => (
                <FormItem><FormLabel>Estatus Migratorio</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="citizen">Ciudadano</SelectItem>
                      <SelectItem value="green_card">Residente</SelectItem>
                      <SelectItem value="work_permit">Permiso de Trabajo</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField control={form.control} name="taxType" render={({ field }) => (
                <FormItem><FormLabel>Tipo de Ingreso/Fiscal</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="w2">W2 (Empleado)</SelectItem>
                      <SelectItem value="1099">1099 (Independiente)</SelectItem>
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="income" render={({ field }) => (
                <FormItem><FormLabel>Ingreso Anual (USD)</FormLabel><FormControl><Input type="number" placeholder="50000" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            {formStatus === 'error' && <Alert variant="destructive"><AlertTitle>Error al crear</AlertTitle><AlertDescription>{errorMessage}</AlertDescription></Alert>}
            {formStatus === 'success' && <Alert className="bg-green-50 border-green-300 text-green-800"><CheckCircle className="h-4 w-4 !text-green-600" /><AlertTitle>¡Cliente Creado!</AlertTitle><AlertDescription>El cliente ha sido registrado exitosamente.</AlertDescription></Alert>}

            <div className="flex justify-end gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={formStatus === 'loading'}>Cancelar</Button>
              <Button type="submit" disabled={formStatus === 'loading'}>
                {formStatus === 'loading' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {formStatus === 'loading' ? 'Guardando...' : 'Guardar Cliente'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

