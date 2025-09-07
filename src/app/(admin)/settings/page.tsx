// src/app/settings/page.tsx
'use client';

import { getAllUsers } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { Search, Crown, Shield, Users, UserRoundCheck, ClipboardList, Settings, UserPlus, ArrowLeft, ArrowRight, UserCircle2, Mail, Calendar, Info, CheckCircle2, XCircle } from 'lucide-react';
import ProcessorAssignmentMatrix from './components/processor-assignment-matrix';
import { AddUserDialog } from './components/add-user-dialog';
import { UserActions } from './components/user-actions';
import type { User } from '@/db/schema';
import { Toaster } from '@/components/ui/sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

interface PageProps {
  searchParams: {
    page?: string;
    search?: string;
    role?: string;
  };
}

const roleInfo = {
  super_admin: { label: 'Súper Administrador', color: 'bg-purple-100 text-purple-800', icon: Crown },
  manager: { label: 'Gerente', color: 'bg-blue-100 text-blue-800', icon: Shield },
  agent: { label: 'Agente', color: 'bg-green-100 text-green-800', icon: UserRoundCheck },
  processor: { label: 'Procesador', color: 'bg-orange-100 text-orange-800', icon: ClipboardList },
  commission_analyst: { label: 'Analista de Comisiones', color: 'bg-indigo-100 text-indigo-800', icon: ClipboardList },
  customer_service: { label: 'Servicio al Cliente', color: 'bg-pink-100 text-pink-800', icon: Users },
};

export default function SettingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [userData, setUserData] = useState<{ users: User[], pagination: any } | null>(null);

  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('search') || '';
  const role = searchParams.get('role') || '';

  useEffect(() => {
    startTransition(async () => {
      const { users, pagination } = await getAllUsers(page, 10, search, role);
      setUserData({ users, pagination });
    });
  }, [page, search, role]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const newSearchParams = new URLSearchParams(searchParams.toString());
    const query = e.currentTarget.search.value;
    if (query) {
      newSearchParams.set('search', query);
    } else {
      newSearchParams.delete('search');
    }
    newSearchParams.set('page', '1');
    router.push(`?${newSearchParams.toString()}`, { scroll: false });
  };

  const handleRoleChange = (selectedRole: string) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (selectedRole !== 'all') {
      newSearchParams.set('role', selectedRole);
    } else {
      newSearchParams.delete('role');
    }
    newSearchParams.set('page', '1');
    router.push(`?${newSearchParams.toString()}`, { scroll: false });
  };

  const pagination = userData?.pagination;
  const users = userData?.users;

  return (
    <div className="space-y-6">
      <Toaster richColors position="top-right" />
      
      {/* Encabezado Principal */}
      <div className="flex items-center space-x-2">
        <Settings className="h-8 w-8 text-gray-700" />
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configuración del Sistema</h2>
          <p className="text-muted-foreground">
            Gestiona usuarios, roles y configuraciones del sistema.
          </p>
        </div>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">
            <Users className="mr-2 h-4 w-4" />
            Gestión de Usuarios
          </TabsTrigger>
          <TabsTrigger value="assignments">
            <ClipboardList className="mr-2 h-4 w-4" />
            Asignaciones de Procesadores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div className="flex-1 min-w-[300px]">
              <h3 className="text-lg font-semibold">Usuarios del Sistema</h3>
              <p className="text-sm text-muted-foreground">
                Administra los usuarios registrados y sus roles.
              </p>
            </div>
            <div className="flex-shrink-0">
              <AddUserDialog>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Añadir Usuario
                </Button>
              </AddUserDialog>
            </div>
          </div>

          {/* Panel de Filtros fuera de la tabla */}
          <Card className="bg-background">
            <CardContent className="p-4 flex flex-wrap items-center gap-4">
              <form onSubmit={handleSearch} className="relative flex-1 max-w-sm">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  name="search"
                  placeholder="Buscar por nombre o correo..."
                  className="pl-8"
                  defaultValue={search}
                />
              </form>
              <Select onValueChange={handleRoleChange} defaultValue={role || 'all'}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los Roles</SelectItem>
                  {Object.keys(roleInfo).map((key) => {
                    const info = roleInfo[key as keyof typeof roleInfo];
                    return (
                      <SelectItem key={key} value={key}>
                        {info.label}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0">
              <TooltipProvider>
                <Table>
                  <TableCaption>
                    {isPending ? (
                        <p className="text-sm text-muted-foreground">Cargando usuarios...</p>
                    ) : (
                        pagination && pagination.total > 0 ? (
                            `Mostrando ${users?.length} de ${pagination.total} usuarios.`
                        ) : (
                            'No se encontraron usuarios.'
                        )
                    )}
                  </TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <div className="flex items-center space-x-1">
                          <UserCircle2 className="h-4 w-4" />
                          <span>Nombre</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4" />
                          <span>Correo Electrónico</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center space-x-1">
                          <Shield className="h-4 w-4" />
                          <span>Rol</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center space-x-1">
                          <Info className="h-4 w-4" />
                          <span>Estado</span>
                        </div>
                      </TableHead>
                      <TableHead>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4" />
                          <span>Miembro Desde</span>
                        </div>
                      </TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isPending ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell><Skeleton className="h-4 w-[250px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[120px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-[60px] float-right" /></TableCell>
                        </TableRow>
                      ))
                    ) : (
                      users && users.map((user) => {
                        const info = roleInfo[user.role as keyof typeof roleInfo];
                        const RoleIcon = info?.icon || Users;
                        const roleLabel = info?.label || user.role;
                        const roleColor = info?.color || 'bg-gray-100 text-gray-800';
                        const isActive = user.isActive;

                        return (
                          <TableRow key={user.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {user.firstName} {user.lastName}
                            </TableCell>
                            <TableCell className="text-muted-foreground">{user.email}</TableCell>
                            <TableCell>
                              <Badge className={roleColor}>
                                <RoleIcon className="mr-1 h-3 w-3" />
                                {roleLabel}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge variant={isActive ? 'outline' : 'secondary'}>
                                {isActive ? (
                                  <>
                                    <CheckCircle2 className="h-3 w-3 mr-1 text-green-500" /> Activo
                                  </>
                                ) : (
                                  <>
                                    <XCircle className="h-3 w-3 mr-1 text-red-500" /> Inactivo
                                  </>
                                )}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatDate(user.createdAt)}
                            </TableCell>
                            <TableCell className="text-right">
                              <UserActions user={user} />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TooltipProvider>
            </CardContent>
          </Card>

          {/* Paginación */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-6">
              <Link
                href={`?page=${pagination.page - 1}${search ? `&search=${search}` : ''}${role ? `&role=${role}` : ''}`}
                aria-disabled={pagination.page <= 1}
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page <= 1}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="flex items-center space-x-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <Link
                    key={pageNum}
                    href={`?page=${pageNum}${search ? `&search=${search}` : ''}${role ? `&role=${role}` : ''}`}
                  >
                    <Button
                      variant={pageNum === pagination.page ? 'default' : 'outline'}
                      size="sm"
                    >
                      {pageNum}
                    </Button>
                  </Link>
                ))}
              </div>
              <Link
                href={`?page=${pagination.page + 1}${search ? `&search=${search}` : ''}${role ? `&role=${role}` : ''}`}
                aria-disabled={pagination.page >= pagination.totalPages}
              >
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pagination.page >= pagination.totalPages}
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardList className="mr-2 h-5 w-5" />
                Asignación de Procesadores
              </CardTitle>
              <CardDescription>
                Configura qué procesadores manejan los casos de cada gerente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProcessorAssignmentMatrix />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}