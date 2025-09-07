// app/(admin)/policies/components/policy-filters.tsx

'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import { Label } from '@/components/ui/label';

// Mapeo de estados de póliza a un formato legible y en español
const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos los Estados' },
  { value: 'new_lead', label: 'Nuevo Contacto' },
  { value: 'contacting', label: 'En Contacto' },
  { value: 'info_captured', label: 'Información Capturada' },
  { value: 'in_review', label: 'En Revisión' },
  { value: 'missing_docs', label: 'Documentos Faltantes' },
  { value: 'sent_to_carrier', label: 'Enviado a Aseguradora' },
  { value: 'approved', label: 'Aprobada' },
  { value: 'rejected', label: 'Rechazada' },
  { value: 'active', label: 'Activa' },
  { value: 'cancelled', label: 'Cancelada' },
];

export default function PolicyFilters() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { replace } = useRouter();

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', '1');
    if (value && value !== 'all') {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    replace(`${pathname}?${params.toString()}`);
  };

  const handleSearch = useDebouncedCallback((term: string) => {
    handleFilterChange('search', term);
  }, 300);

  return (
    // Se elimina el div padre con "flex flex-col sm:flex-row..."
    <div className="flex flex-col sm:flex-row items-stretch sm:items-end space-y-4 sm:space-y-0 sm:space-x-4">
      {/* Grupo de control de búsqueda */}
      <div className="flex-1 max-w-lg space-y-2">
        <Label htmlFor="search-input" className="text-sm font-medium text-muted-foreground">
          Buscar Pólizas
        </Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search-input"
            type="search"
            placeholder="Buscar por cliente, póliza o agente..."
            className="pl-9 pr-4"
            defaultValue={searchParams.get('search')?.toString()}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Grupo de control de estado */}
      <div className="w-full sm:w-auto space-y-2">
        <Label htmlFor="status-select" className="text-sm font-medium text-muted-foreground">
          Filtrar por Estado
        </Label>
        <Select
          defaultValue={searchParams.get('status')?.toString() || 'all'}
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Seleccionar estado" />
          </SelectTrigger>
          <SelectContent id="status-select">
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}