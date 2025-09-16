// (admin)/customers/page.tsx

import { Suspense, cache } from 'react';
import { getCustomers, getPoliciesForBoard } from './actions';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, MoreHorizontal, UserX, ChevronLeft, ChevronRight, CalendarPlus, ShieldAlert } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { policyStatusEnum } from '@/db/schema';
import PostVentaModule from './components/post-venta-module';

interface PageProps {
  searchParams: {
    page?: string;
    search?: string;
  };
}

// Cache the server functions to avoid the "Server Functions cannot be called during initial render" error
const getCachedCustomers = cache(getCustomers);
const getCachedPoliciesForBoard = cache(getPoliciesForBoard);

export default function CustomersPage({ searchParams }: PageProps) {
  const page = Number(searchParams.page) || 1;
  const search = searchParams.search || '';

  return (
    <div className="flex flex-col gap-8 p-4 md:p-8">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Gestión de Clientes
          </h1>
          <p className="text-muted-foreground mt-1">
            Busca, visualiza y gestiona las aplicaciones y el servicio post-venta.
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/customers/new">
            <PlusCircle className="mr-2 h-5 w-5" />
            Nueva Venta
          </Link>
        </Button>
      </header>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-[400px]">
          <TabsTrigger value="list">Lista de Clientes</TabsTrigger>
          <TabsTrigger value="post-venta">Post-Venta (Kanban)</TabsTrigger>
        </TabsList>
        
        {/* PESTAÑA 1: LISTA DE CLIENTES */}
        <TabsContent value="list">
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Lista de Clientes</CardTitle>
            </CardHeader>
            <CardContent>
              <Suspense key={page + search} fallback={<CustomersTableSkeleton />}>
                <CustomersTable page={page} search={search} />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {/* PESTAÑA 2: MÓDULO DE POST-VENTA */}
        <TabsContent value="post-venta">
          <Suspense fallback={<PolicyBoardSkeleton/>}>
            <PostVentaModuleWrapper />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function CustomersTable({ page, search }: { page: number, search: string }) {
  const { customers, pagination } = await getCachedCustomers(page, 10, search);

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
              <TableHead>Estado Última Póliza</TableHead>
              <TableHead>Agente Creador</TableHead>
              <TableHead>Fecha de Creación</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((customer) => {
              const initials = customer.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
              const latestPolicyStatus = customer.policies[0]?.status;
              const agentName = customer.createdByAgent.name || 
                `${customer.createdByAgent.firstName} ${customer.createdByAgent.lastName}`;

              return (
                <TableRow key={customer.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <div>
                        <Link href={`/customers/${customer.id}`} className="font-medium text-primary hover:underline">
                          {customer.fullName}
                        </Link>
                        <p className="text-sm text-muted-foreground">{customer.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {latestPolicyStatus ? 
                      <Badge variant="outline">{latestPolicyStatus.replace('_', ' ')}</Badge> : 
                      <Badge variant="secondary">Sin Póliza</Badge>
                    }
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {agentName}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(customer.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/customers/${customer.id}`} className="cursor-pointer">Ver Detalles</Link>
                        </DropdownMenuItem>
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

function PaginationControls({ page, totalPages, search }: { page: number, totalPages: number, search: string }) {
  const createPageURL = (pageNum: number) => `/customers?page=${pageNum}${search ? `&search=${search}` : ''}`;
  
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
          : "Aún no hay clientes que coincidan. ¡Crea la primera aplicación!"
        }
      </p>
    </div>
  );
}

function CustomersTableSkeleton() {
  const skeletonRows = 5;
  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead><Skeleton className="h-5 w-40" /></TableHead>
            <TableHead><Skeleton className="h-5 w-32" /></TableHead>
            <TableHead><Skeleton className="h-5 w-40" /></TableHead>
            <TableHead><Skeleton className="h-5 w-32" /></TableHead>
            <TableHead><Skeleton className="h-5 w-20" /></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <TableRow key={i}>
              <TableCell><div className="flex items-center gap-3"><Skeleton className="h-10 w-10 rounded-full" /><div className="space-y-1"><Skeleton className="h-4 w-24" /><Skeleton className="h-3 w-32" /></div></div></TableCell>
              <TableCell><Skeleton className="h-6 w-28" /></TableCell>
              <TableCell><Skeleton className="h-6 w-36" /></TableCell>
              <TableCell><Skeleton className="h-6 w-28" /></TableCell>
              <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between"><Skeleton className="h-9 w-24" /><Skeleton className="h-4 w-20" /><Skeleton className="h-9 w-24" /></div>
    </div>
  );
}

// --- NUEVO COMPONENTE DEL SERVIDOR (Wrapper) ---
async function PostVentaModuleWrapper() {
  const policiesByStatus = await getCachedPoliciesForBoard();
  return <PostVentaModule policiesByStatus={policiesByStatus} />;
}

function PolicyBoardSkeleton() {
    const columns = 5;
    const cardsPerColumn = 2;
    return (
        <div className="flex gap-6 mt-4 overflow-hidden">
            {Array.from({ length: columns }).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-80 space-y-4">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                        <Skeleton className="h-5 w-24" />
                        <Skeleton className="h-5 w-8" />
                    </div>
                    {Array.from({ length: cardsPerColumn }).map((_, j) => (
                           <Card key={j}>
                               <CardHeader className="p-4 space-y-2">
                                   <Skeleton className="h-4 w-4/5"/>
                                   <Skeleton className="h-3 w-3/5"/>
                               </CardHeader>
                               <CardFooter className="p-4 pt-0">
                                   <Skeleton className="h-3 w-1/2"/>
                               </CardFooter>
                           </Card>
                    ))}
                </div>
            ))}
        </div>
    )
}