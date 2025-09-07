// app/(admin)/processing/components/processing-filter.tsx

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label'; // Importa el componente Label

// Objeto de mapeo para traducir los estados del enum a español
const statusTranslations = {
  'all': 'Todos los Estados',
  'new_lead': 'Nuevo Prospecto',
  'contacting': 'Contactando',
  'info_captured': 'Info Capturada',
  'in_review': 'En Revisión',
  'missing_docs': 'Documentos Faltantes',
  'sent_to_carrier': 'Enviado a Compañía',
  'approved': 'Aprobado',
  'rejected': 'Rechazado',
  'active': 'Activo',
  'cancelled': 'Cancelado',
};

export default function ProcessingFilter() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1'); // Reinicia a la página 1 con cada filtro

    if (status && status !== 'all') {
      params.set('status', status);
    } else {
      params.delete('status'); // Si el valor es 'all', elimina el filtro
    }
    replace(`${pathname}?${params.toString()}`);
  };

  const currentStatus = searchParams.get('status')?.toString() || 'all';

  return (
    <div className="flex items-center space-x-4 p-4 bg-white rounded-lg shadow-sm">
      <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
        Filtrar por Estado:
      </Label>
      <Select
        defaultValue={currentStatus}
        onValueChange={handleStatusChange}
      >
        <SelectTrigger id="status-filter" className="w-56">
          <SelectValue placeholder="Selecciona un estado" />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(statusTranslations).map(([value, label]) => (
            <SelectItem key={value} value={value}>
              {label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}