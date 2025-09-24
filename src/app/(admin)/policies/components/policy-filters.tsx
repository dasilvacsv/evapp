'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

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

  const handleDebouncedFilter = useDebouncedCallback((key: string, value: string) => {
    handleFilterChange(key, value);
  }, 300);

  const handleDateChange = useDebouncedCallback((key: string, value: string) => {
    handleFilterChange(key, value);
  }, 500);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
      {/* Buscador General */}
      <div className="lg:col-span-2 space-y-2">
        <Label htmlFor="search-input">Buscar por Cliente</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="search-input"
            type="search"
            placeholder="Nombre del cliente, ID..."
            className="pl-9"
            defaultValue={searchParams.get('search')?.toString()}
            onChange={(e) => handleSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Filtro por Estado */}
      <div className="space-y-2">
        <Label htmlFor="status-select">Estado</Label>
        <Select
          defaultValue={searchParams.get('status')?.toString() || 'all'}
          onValueChange={(value) => handleFilterChange('status', value)}
        >
          <SelectTrigger id="status-select">
            <Filter className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Seleccionar estado" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Filtro por Aseguradora */}
      <div className="space-y-2">
        <Label htmlFor="insurance-input">Aseguradora</Label>
        <Input
          id="insurance-input"
          placeholder="Nombre de la aseguradora..."
          defaultValue={searchParams.get('insuranceCompany')?.toString()}
          onChange={(e) => handleDebouncedFilter('insuranceCompany', e.target.value)}
        />
      </div>

      {/* Filtro por Rango de Fechas */}
      <div className="space-y-2">
        <Label htmlFor="start-date">Fecha Desde</Label>
        <Input
          id="start-date"
          type="date"
          defaultValue={searchParams.get('startDate')?.toString()}
          onChange={(e) => handleDateChange('startDate', e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="end-date">Fecha Hasta</Label>
        <Input
          id="end-date"
          type="date"
          defaultValue={searchParams.get('endDate')?.toString()}
          onChange={(e) => handleDateChange('endDate', e.target.value)}
        />
      </div>

      {/* Botón para limpiar filtros */}
      <div className="col-span-1 md:col-span-2 lg:col-start-4">
        <Button variant="ghost" onClick={() => replace(pathname)} className="w-full">
          Limpiar Filtros
        </Button>
      </div>
    </div>
  );
}