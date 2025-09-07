import { Suspense } from 'react';
import { getCustomers } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, PlusCircle, MoreHorizontal, UserX, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import Link from 'next/link';

import CustomerForm from './components/customer-form'; // Tu componente de formulario
import SearchInput from './components/search-input'; // Componente de búsqueda (código abajo)

// --- Mapeo de Estatus Migratorio a UI ---
const immigrationStatusConfig = {
  'citizen':     { label: 'Ciudadano', variant: 'outline', className: 'border-green-500 text-green-600' },
  'green_card':  { label: 'Residente',   variant: 'outline', className: 'border-blue-500 text-blue-600' },
  'work_permit': { label: 'Permiso Trab.', variant: 'outline', className: 'border-yellow-500 text-yellow-600' },
  'other':       { label: 'Otro',        variant: 'secondary' },
};

interface PageProps {
  searchParams: {
    page?: string;
    search?: string;
  };
}

// --- COMPONENTE PRINCIPAL DE LA PÁGINA ---
export default function CustomersPage({ searchParams }: PageProps) {
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || '';

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      {/* --- Encabezado y Acción Principal --- */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Gestión de Clientes
          </h1>
          <p className="text-muted-foreground mt-1">
            Busca, visualiza y administra la información de tus clientes.
          </p>
        </div>
        <CustomerForm>
            <Button>
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Cliente
            </Button>
        </CustomerForm>
      </header>
      
      {/* --- Contenedor Principal con Sombra y Bordes --- */}
      <Card className="card-shadow">
        <CardHeader>
            <div className="flex items-center justify-between">
                <CardTitle>Lista de Clientes</CardTitle>
                <div className="w-full max-w-sm">
                    <SearchInput initialValue={search} placeholder="Buscar por nombre..." />
                </div>
            </div>
        </CardHeader>
        <CardContent>
          <Suspense key={page + search} fallback={<CustomersTableSkeleton />}>
            <CustomersTable page={page} search={search} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}


// --- COMPONENTE ASÍNCRONO PARA LA TABLA DE DATOS ---
async function CustomersTable({ page, search }: { page: number, search: string }) {
  const { customers, pagination } = await getCustomers(page, 10, search);

  if (customers.length === 0) {
    return <EmptyState search={search} />;
  }
  
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Estatus Migratorio</TableHead>
              <TableHead className="text-center">Pólizas</TableHead>
              <TableHead>Agente Asignado</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const status = immigrationStatusConfig[customer.immigrationStatus as keyof typeof immigrationStatusConfig] || immigrationStatusConfig.other;
              const initials = customer.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

              return (
                <TableRow key={customer.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-secondary text-secondary-foreground">{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{customer.fullName}</p>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant} className={cn('font-semibold', status.className)}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-center font-mono font-medium">{customer.policyCount}</TableCell>
                  <TableCell className="text-muted-foreground">{customer.agentName}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(customer.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link href={`/customers/${customer.id}`} className="cursor-pointer">Ver Detalles</Link></DropdownMenuItem>
                        <DropdownMenuItem>Editar Cliente</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive">Eliminar</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <PaginationControls {...pagination} search={search} />
    </div>
  );
}

// --- COMPONENTES AUXILIARES ---

function PaginationControls({ page, totalPages, search }: { page: number, totalPages: number, search: string }) {
  const createPageURL = (pageNum: number) => `?page=${pageNum}${search ? `&search=${search}` : ''}`;
  
  return (
    <div className="flex items-center justify-between pt-4">
      <Button variant="outline" size="sm" asChild disabled={page <= 1}>
        <Link href={createPageURL(page - 1)}><ChevronLeft className="mr-2 h-4 w-4" /> Anterior</Link>
      </Button>
      <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
      <Button variant="outline" size="sm" asChild disabled={page >= totalPages}>
        <Link href={createPageURL(page + 1)}>Siguiente <ChevronRight className="ml-2 h-4 w-4" /></Link>
      </Button>
    </div>
  );
}

function EmptyState({ search }: { search: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16">
      <UserX className="h-16 w-16 text-muted-foreground/50 mb-4" />
      <h3 className="text-xl font-semibold">No se encontraron clientes</h3>
      <p className="text-muted-foreground mt-2">
        {search 
          ? "Intenta con otro término de búsqueda o limpia el filtro." 
          : "Parece que aún no hay clientes. ¡Crea el primero!"
        }
      </p>
    </div>
  );
}

function CustomersTableSkeleton() {
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Skeleton className="h-5 w-32" /></TableHead>
            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
            <TableHead><Skeleton className="h-5 w-16" /></TableHead>
            <TableHead><Skeleton className="h-5 w-28" /></TableHead>
            <TableHead><Skeleton className="h-5 w-24" /></TableHead>
            <TableHead><Skeleton className="h-5 w-12" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 5 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div></div></TableCell>
              <TableCell><Skeleton className="h-6 w-24" /></TableCell>
              <TableCell><Skeleton className="h-6 w-16" /></TableCell>
              <TableCell><Skeleton className="h-6 w-28" /></TableCell>
              <TableCell><Skeleton className="h-6 w-24" /></TableCell>
              <TableCell><Skeleton className="h-8 w-8" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between"><Skeleton className="h-9 w-24" /><Skeleton className="h-4 w-20" /><Skeleton className="h-9 w-24" /></div>
    </div>
  );
}
