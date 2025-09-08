// app/(admin)/processing/page.tsx

import { getProcessingQueue, getProcessingStats } from './actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ClipboardList, AlertTriangle, CheckCircle, Clock, Eye, User, DollarSign, Calendar, Info, FileText } from 'lucide-react';
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table';
import ProcessingFilter from './components/processing-filter';

interface PageProps {
  searchParams: {
    page?: string;
    status?: string;
  };
}

// Objeto de mapeo para traducir los estados del enum a español
const statusTranslations: Record<string, string> = {
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

export default async function ProcessingPage({ searchParams }: PageProps) {
  const page = Number(searchParams.page) || 1;
  const status = searchParams.status || '';

  const [{ policies, pagination }, stats] = await Promise.all([
    getProcessingQueue(page, 10, status),
    getProcessingStats(),
  ]);

  const getStatusColor = (status: string) => {
    const colors = { 
      'new_lead': 'bg-blue-100 text-blue-800', 
      'contacting': 'bg-yellow-100 text-yellow-800', 
      'info_captured': 'bg-purple-100 text-purple-800', 
      'in_review': 'bg-orange-100 text-orange-800', 
      'missing_docs': 'bg-red-100 text-red-800', 
      'sent_to_carrier': 'bg-indigo-100 text-indigo-800', 
      'approved': 'bg-green-100 text-green-800', 
      'rejected': 'bg-red-100 text-red-800', 
      'active': 'bg-emerald-100 text-emerald-800', 
      'cancelled': 'bg-gray-100 text-gray-800' 
    };
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityLevel = (status: string, updatedAt: string) => {
    const daysSinceUpdate = Math.floor((Date.now() - new Date(updatedAt).getTime()) / (1000 * 60 * 60 * 24));
    if (status === 'missing_docs' && daysSinceUpdate > 7) return 'high';
    if (status === 'in_review' && daysSinceUpdate > 3) return 'medium';
    if (daysSinceUpdate > 14) return 'high';
    return 'normal';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  // Función para obtener el estado traducido
  const getTranslatedStatus = (status: string) => {
    return statusTranslations[status] || status;
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Cola de Procesamiento</h2>
        <p className="text-muted-foreground">
          Gestiona y procesa las solicitudes de pólizas de seguro asignadas.
        </p>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Asignado</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAssigned}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Requieren Atención</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.needingAttention}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Completado</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.totalAssigned > 0 ? Math.round(((stats.totalAssigned - stats.needingAttention) / stats.totalAssigned) * 100) : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <ProcessingFilter />

      {/* Tabla de la Cola de Procesamiento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ClipboardList className="mr-2 h-5 w-5" />
            Cola de Procesamiento
          </CardTitle>
          <CardDescription>
            Pólizas asignadas a ti para procesar ({pagination.total} en total)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {policies.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">
              No hay pólizas en tu cola de procesamiento.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">Cliente & Póliza</TableHead>
                    <TableHead className="w-[150px]">Estado</TableHead>
                    <TableHead>Detalles de la Póliza</TableHead>
                    <TableHead className="w-[150px]">Información Adicional</TableHead>
                    <TableHead className="w-[150px]">Última Actualización</TableHead>
                    <TableHead className="text-right w-[100px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {policies.map((policy) => {
                    const priority = getPriorityLevel(policy.status, policy.updatedAt);
                    return (
                      <TableRow key={policy.id} className="hover:bg-muted/50 transition-colors">
                        <TableCell className="font-semibold">
                          <div>
                            <div className="font-semibold">{policy.customerName}</div>
                            <div className="text-xs text-muted-foreground">
                              Cliente ID: {policy.customerId}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              Póliza ID: {policy.id}
                            </div>
                            {policy.policyNumber && (
                              <div className="text-xs text-muted-foreground">
                                Número: {policy.policyNumber}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-start gap-1">
                            <Badge className={getStatusColor(policy.status)}>
                              {getTranslatedStatus(policy.status)}
                            </Badge>
                            {priority !== 'normal' && (
                              <div className={`flex items-center space-x-1 ${getPriorityColor(priority)} text-xs font-medium`}>
                                <Clock className="h-3 w-3" />
                                <span>PRIORIDAD {priority === 'high' ? 'ALTA' : 'MEDIA'}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {policy.insuranceCompany && (
                              <div className="flex items-center gap-2">
                                <Info className="h-3 w-3" />
                                {policy.insuranceCompany}
                              </div>
                            )}
                            {policy.monthlyPremium && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-3 w-3" />
                                {formatCurrency(Number(policy.monthlyPremium))} / mes
                              </div>
                            )}
                            {policy.effectiveDate && (
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                Efectiva: {formatDate(policy.effectiveDate)}
                              </div>
                            )}
                            <div className="flex items-center gap-2">
                              <User className="h-3 w-3" />
                              Agente: {policy.agentName}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            {policy.taxCredit && (
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-3 w-3 text-green-500" />
                                Crédito: {formatCurrency(Number(policy.taxCredit))}
                              </div>
                            )}
                            {policy.notes && (
                              <div className="flex items-center gap-2">
                                <FileText className="h-3 w-3" />
                                <span className="truncate max-w-[100px]">
                                  {policy.notes.length > 20 ? `${policy.notes.substring(0, 20)}...` : policy.notes}
                                </span>
                              </div>
                            )}
                            <Badge variant="outline" className="text-xs">
                              {policy.commissionStatus === 'pending' ? 'Comisión Pendiente' :
                               policy.commissionStatus === 'calculated' ? 'Comisión Calculada' :
                               policy.commissionStatus === 'paid' ? 'Comisión Pagada' : policy.commissionStatus}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                {formatDate(policy.updatedAt)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/policies/${policy.id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="mr-2 h-4 w-4" />
                              Procesar
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Paginación */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center space-x-2 mt-6">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((pageNum) => (
                <Link
                  key={pageNum}
                  href={`?page=${pageNum}${status ? `&status=${status}` : ''}`}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}