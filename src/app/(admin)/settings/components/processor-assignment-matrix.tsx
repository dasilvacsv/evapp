'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { assignProcessorToManagers, getManagers, getProcessors, getProcessorAssignments } from '../actions';
import { Network, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

// Esquema de validación con Zod
const formSchema = z.object({
  processorId: z.string().min(1, 'Debe seleccionar un procesador'),
  managerIds: z.array(z.string()),
});

type FormData = z.infer<typeof formSchema>;

export default function ProcessorAssignmentMatrix() {
  const [loading, setLoading] = useState(false);
  const [managers, setManagers] = useState<any[]>([]);
  const [processors, setProcessors] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      processorId: '',
      managerIds: [],
    },
  });

  const { setValue, watch, handleSubmit, formState: { errors } } = form;

  const selectedProcessorId = watch('processorId');
  const selectedManagerIds = watch('managerIds');

  // Carga inicial de datos
  useEffect(() => {
    loadData();
  }, []);

  // Sincroniza las asignaciones al cambiar el procesador seleccionado
  useEffect(() => {
    if (selectedProcessorId) {
      const existingAssignments = assignments
        .filter(a => a.processorId === selectedProcessorId)
        .map(a => a.managerId);
      setValue('managerIds', existingAssignments);
    }
  }, [selectedProcessorId, assignments, setValue]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [managersData, processorsData, assignmentsData] = await Promise.all([
        getManagers(),
        getProcessors(),
        getProcessorAssignments(),
      ]);
      setManagers(managersData);
      setProcessors(processorsData);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error al cargar los datos:', error);
      toast.error('Error al cargar la información. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleManagerSelection = (managerId: string, checked: boolean) => {
    let newSelection;
    if (checked) {
      newSelection = [...selectedManagerIds, managerId];
    } else {
      newSelection = selectedManagerIds.filter(id => id !== managerId);
    }
    setValue('managerIds', newSelection);
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const result = await assignProcessorToManagers(data);
      if (result.success) {
        toast.success('¡Asignaciones actualizadas con éxito!');
        await loadData();
      } else {
        toast.error(result.message || 'Ocurrió un error al actualizar las asignaciones.');
      }
    } catch (error) {
      toast.error('Ocurrió un error inesperado. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (loading && processors.length === 0) {
    return (
      <Card className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Network className="mr-2 h-5 w-5" />
          Matriz de Asignación Procesador-Gerente
        </CardTitle>
        <CardDescription>
          Asigna procesadores para que manejen las pólizas de los equipos de gerentes específicos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Selector de Procesador */}
          <div className="space-y-2">
            <Label htmlFor="processorId">Seleccionar Procesador</Label>
            <Select onValueChange={value => setValue('processorId', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Elige un procesador" />
              </SelectTrigger>
              <SelectContent>
                {processors.map((processor) => (
                  <SelectItem key={processor.id} value={processor.id}>
                    {processor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.processorId && (
              <p className="text-sm text-red-600">{errors.processorId.message}</p>
            )}
          </div>

          {/* Lista de Gerentes (se muestra solo si se selecciona un procesador) */}
          {selectedProcessorId && (
            <div className="space-y-2">
              <Label>Asignar a Gerentes</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-52 overflow-y-auto border rounded-md p-4 bg-muted/20">
                {managers.length > 0 ? (
                  managers.map((manager) => (
                    <div key={manager.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={manager.id}
                        checked={selectedManagerIds.includes(manager.id)}
                        onCheckedChange={(checked) => handleManagerSelection(manager.id, checked as boolean)}
                      />
                      <Label htmlFor={manager.id} className="text-sm cursor-pointer">
                        {manager.name}
                      </Label>
                    </div>
                  ))
                ) : (
                  <p className="col-span-full text-center text-muted-foreground">No hay gerentes disponibles.</p>
                )}
              </div>
            </div>
          )}

          <Button 
            type="submit" 
            disabled={loading || !selectedProcessorId} 
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Actualizando...
              </>
            ) : (
              'Actualizar Asignaciones'
            )}
          </Button>
        </form>

        {/* Resumen de Asignaciones Actuales */}
        <div className="space-y-4">
          <h4 className="font-semibold text-lg">Resumen de Asignaciones</h4>
          {processors.length > 0 ? (
            processors.map((processor) => {
              const processorAssignments = assignments.filter(a => a.processorId === processor.id);
              return (
                <div key={processor.id} className="p-4 border rounded-lg bg-card/50 shadow-sm">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <p className="font-medium">{processor.name}</p>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 ml-7">
                    {processorAssignments.length === 0
                      ? 'Sin asignaciones'
                      : `Asignado a: ${processorAssignments.map(a => a.managerName).join(', ')}`}
                  </p>
                </div>
              );
            })
          ) : (
            <Alert>
              <AlertDescription>No hay procesadores para mostrar asignaciones.</AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
    </Card>
  );
}