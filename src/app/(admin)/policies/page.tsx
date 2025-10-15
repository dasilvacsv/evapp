"use client";

import { getPolicies } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import PolicyForm from './components/policy-form';
import UpdateStatusForm from './components/update-status-form';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/utils';
import { Eye, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import PolicyFilters from './components/policy-filters';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import EnableEditingButton from './components/EnableEditingButton';

const STATUS_MAP = {
  new_lead: { label: 'Nuevo Contacto', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
  contacting: { label: 'En Contacto', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
  info_captured: { label: 'Info Capturada', color: 'bg-purple-100 text-purple-800 hover:bg-purple-200' },
  in_review: { label: 'En Revisión', color: 'bg-orange-100 text-orange-800 hover:bg-orange-200' },
  missing_docs: { label: 'Doc. Faltante', color: 'bg-red-100 text-red-800 hover:bg-red-200' },
  sent_to_carrier: { label: 'Enviado a Aseguradora', color: 'bg-indigo-100 text-indigo-800 hover:bg-indigo-200' },
  approved: { label: 'Aprobada', color: 'bg-green-100 text-green-800 hover:bg-green-200' },
  rejected: { label: 'Rechazada', color: 'bg-red-100 text-red-800 hover:bg-red-200' },
  active: { label: 'Activa', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' },
  cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800 hover:bg-gray-200' },
};

const COMMISSION_STATUS_MAP = {
  pending: { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' },
  calculated: { label: 'Calculada', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' },
  in_dispute: { label: 'En Disputa', color: 'bg-red-100 text-red-800 hover:bg-red-200' },
  paid: { label: 'Pagada', color: 'bg-green-100 text-green-800 hover:bg-green-200' },
};

export default function PoliciesPage() {
  const searchParams = useSearchParams();
  const page = Number(searchParams.get('page')) || 1;
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const itemsPerPage = 10;

  const [policies, setPolicies] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchPolicies = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const { policies, pagination, currentUserRole } = await getPolicies(page, itemsPerPage, search, status);
        setPolicies(policies);
        setPagination(pagination);
        setCurrentUserRole(currentUserRole);
      } catch (err: any) {
        console.error("Failed to fetch policies:", err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPolicies();
  }, [page, search, status]);

  const getStatusInfo = (status: string) => STATUS_MAP[status as keyof typeof STATUS_MAP] || { label: 'Desconocido', color: 'bg-gray-100 text-gray-800' };
  const getCommissionStatusInfo = (status: string) => COMMISSION_STATUS_MAP[status as keyof typeof COMMISSION_STATUS_MAP] || { label: 'Desconocido', color: 'bg-gray-100 text-gray-800' };
  
  const createPageURL = (pageNum: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', pageNum.toString());
    return `?${params.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Pólizas</h2>
          <p className="text-muted-foreground">
            Administra pólizas de seguro y rastrea su progreso.
          </p>
        </div>
        <PolicyForm />
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <CardTitle className="flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Listado de Pólizas
          </CardTitle>
          <CardDescription>
            Total de pólizas: {pagination.total}
          </CardDescription>
          <PolicyFilters />
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <span className="h-6 w-6 animate-spin rounded-full border-4 border-t-transparent border-primary"></span>
                <span className="ml-2 text-primary">Cargando...</span>
              </div>
            ) : error ? (
              <p className="text-center py-8 text-red-500">
                Hubo un error al cargar las pólizas. Por favor, intenta de nuevo.
              </p>
            ) : policies.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No se encontraron pólizas. {search && 'Intenta ajustar tus criterios de búsqueda.'}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Comisión</TableHead>
                    <TableHead className="hidden md:table-cell">ID Marketplace</TableHead>
                    <TableHead className="hidden md:table-cell">Aseguradora</TableHead>
                    <TableHead className="hidden md:table-cell">Prima Mensual</TableHead>
                    <TableHead className="hidden lg:table-cell">Fecha Efectiva</TableHead>
                    <TableHead className="hidden lg:table-cell">Agente</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => (
                    <TableRow key={policy.id}>
                      <TableCell className="font-medium">{policy.customerName}</TableCell>
                      <TableCell>
                        <Badge className={getStatusInfo(policy.status).color}>
                          {getStatusInfo(policy.status).label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getCommissionStatusInfo(policy.commissionStatus).color}>
                          {getCommissionStatusInfo(policy.commissionStatus).label}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-gray-600">
                        {policy.marketplaceId || 'N/A'}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{policy.insuranceCompany || 'N/A'}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {policy.monthlyPremium ? formatCurrency(Number(policy.monthlyPremium)) : 'N/A'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm">
                        {policy.effectiveDate ? formatDate(policy.effectiveDate) : 'N/A'}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">{policy.agentName || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-1">
                          
                          {/* --- INICIO DE LA DEPURACIÓN --- */}
                          {/* Hemos comentado temporalmente los botones de acción. */}
                          {/* Si la página carga sin errores con este cambio, el problema */}
                          {/* está 100% dentro de UpdateStatusForm o EnableEditingButton. */}
                          {/*
                          {policy.isEditableStatus ? (
                            <UpdateStatusForm
                              policyId={policy.id}
                              currentStatus={policy.status}
                              currentCompany={policy.insuranceCompany || ''}
                              currentPremium={policy.monthlyPremium || ''}
                              currentMarketplaceId={policy.marketplaceId || ''}
                              currentEffectiveDate={policy.effectiveDate || ''}
                              currentTaxCredit={policy.taxCredit || ''}
                            />
                          ) : (currentUserRole === 'super_admin' || currentUserRole === 'manager') ? (
                            <EnableEditingButton policyId={policy.id} />
                          ) : null}
                          */}
                          {/* --- FIN DE LA DEPURACIÓN --- */}
                          
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/policies/${policy.id}`}>
                              <Eye className="h-4 w-4" />
                            </Link>
                          </Button>

                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
        {/* La paginación se mantiene igual que en la versión anterior y correcta */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-center space-x-2 p-6">
            {page === 1 ? (
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" /> Anterior
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link href={createPageURL(page - 1)}>
                  <ChevronLeft className="h-4 w-4" /> Anterior
                </Link>
              </Button>
            )}
            <div className="flex items-center space-x-1">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === pagination.totalPages || (p >= page - 1 && p <= page + 1))
                .map((pageNum, index, array) => (
                  <div key={pageNum} className="flex items-center">
                    {index > 0 && array[index - 1] + 1 < pageNum && <span className="text-muted-foreground mx-1">...</span>}
                    <Button variant={pageNum === page ? 'default' : 'outline'} size="sm" asChild>
                      <Link href={createPageURL(pageNum)}>
                        {pageNum}
                      </Link>
                    </Button>
                  </div>
                ))}
            </div>
            {page === pagination.totalPages ? (
              <Button variant="outline" size="sm" disabled>
                Siguiente <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button variant="outline" size="sm" asChild>
                <Link href={createPageURL(page + 1)}>
                  Siguiente <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        )}
      </Card>
    </div>
  );
}