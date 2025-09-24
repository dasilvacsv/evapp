import { getPolicyById } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import UpdateStatusForm from '../components/update-status-form';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ArrowLeft, FileText, User, Building, DollarSign, Calendar, Phone, Mail, FilePenLine, CreditCard, Link as LinkIcon, FileCheck } from 'lucide-react';
import AorLinkManager from '../components/AorLinkManager';

interface PageProps {
  params: {
    policyId: string;
  };
}

const translateStatus = (status: string) => {
  const translations: { [key: string]: string } = {
    'new_lead': 'Nuevo Prospecto',
    'contacting': 'Contactando',
    'info_captured': 'Info. Capturada',
    'in_review': 'En Revisión',
    'missing_docs': 'Docs. Faltantes',
    'sent_to_carrier': 'Enviado a Aseguradora',
    'approved': 'Aprobado',
    'rejected': 'Rechazado',
    'active': 'Activo',
    'cancelled': 'Cancelado',
    'pending': 'Pendiente',
    'calculated': 'Calculado',
    'in_dispute': 'En Disputa',
    'paid': 'Pagado',
  };
  return translations[status] || status.replace('_', ' ').toUpperCase();
};

export default async function PolicyDetailPage({ params }: PageProps) {
  
  const policy = await getPolicyById(params.policyId);

  const getStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'new_lead': 'bg-blue-100 text-blue-800',
      'contacting': 'bg-yellow-100 text-yellow-800',
      'info_captured': 'bg-purple-100 text-purple-800',
      'in_review': 'bg-orange-100 text-orange-800',
      'missing_docs': 'bg-red-100 text-red-800',
      'sent_to_carrier': 'bg-indigo-100 text-indigo-800',
      'approved': 'bg-green-100 text-green-800',
      'rejected': 'bg-red-100 text-red-800',
      'active': 'bg-emerald-100 text-emerald-800',
      'cancelled': 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getCommissionStatusColor = (status: string) => {
    const colors: { [key: string]: string } = {
      'pending': 'bg-yellow-100 text-yellow-800',
      'calculated': 'bg-blue-100 text-blue-800',
      'in_dispute': 'bg-red-100 text-red-800',
      'paid': 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-6 p-6 md:p-10">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link href="/policies">
            <Button variant="outline" size="icon" className="h-9 w-9">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Detalles de la Póliza</h2>
            <p className="text-muted-foreground truncate max-w-xs md:max-w-md">
              Póliza para <span className="font-semibold">{policy.customerName}</span>
            </p>
          </div>
        </div>
        <UpdateStatusForm
          policyId={policy.id}
          currentStatus={policy.status}
          currentCompany={policy.insuranceCompany || ''}
          currentPremium={policy.monthlyPremium || ''}
          currentMarketplaceId={policy.marketplaceId || ''}
          currentEffectiveDate={policy.effectiveDate || ''}
          currentTaxCredit={policy.taxCredit || ''}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Información Principal de la Póliza */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <FileText className="mr-2 h-5 w-5" />
              Información de la Póliza
            </CardTitle>
            <CardDescription className="pt-2">
              Detalles clave sobre el estado y los términos de esta póliza.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-muted-foreground">Estado</p>
                <Badge className={getStatusColor(policy.status)}>
                  {translateStatus(policy.status)}
                </Badge>
              </div>
              <div className="flex items-center space-x-2">
                <p className="text-sm font-medium text-muted-foreground">Estado de la Comisión</p>
                <Badge className={getCommissionStatusColor(policy.commissionStatus)}>
                  {translateStatus(policy.commissionStatus)}
                </Badge>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {policy.marketplaceId && (
                <div className="flex items-center space-x-3">
                  <FileCheck className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">ID Marketplace</p>
                    <p className="font-semibold">{policy.marketplaceId}</p>
                  </div>
                </div>
              )}

              {policy.insuranceCompany && (
                <div className="flex items-center space-x-3">
                  <Building className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Aseguradora</p>
                    <p className="font-semibold truncate">{policy.insuranceCompany}</p>
                  </div>
                </div>
              )}

              {policy.monthlyPremium && (
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Prima Mensual</p>
                    <p className="font-semibold">{formatCurrency(Number(policy.monthlyPremium))}</p>
                  </div>
                </div>
              )}

              {policy.taxCredit && (
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Crédito Fiscal</p>
                    <p className="font-semibold text-green-600">{formatCurrency(Number(policy.taxCredit))}</p>
                  </div>
                </div>
              )}

              {policy.effectiveDate && (
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Fecha Efectiva</p>
                    <p className="font-semibold">{formatDate(policy.effectiveDate)}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3">
                <FilePenLine className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Última Actualización</p>
                  <p className="font-semibold">{formatDate(policy.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* Enlaces adicionales si están disponibles */}
            {(policy.planLink || policy.aorLink) && (
              <>
                <Separator />
                <div className="space-y-3">
                  <p className="text-sm font-medium text-muted-foreground">Enlaces de Documentos</p>
                  <div className="flex flex-wrap gap-2">
                    {policy.planLink && (
                      <Button variant="outline" size="sm" asChild>
                        <a href={policy.planLink} target="_blank" rel="noopener noreferrer">
                          <LinkIcon className="mr-2 h-4 w-4" />
                          Ver Plan
                        </a>
                      </Button>
                    )}
                    {policy.aorLink && (
                      <AorLinkManager 
                        policyId={policy.id}
                        initialAorLink={policy.aorLink}
                        aorStatus={policy.aorStatus}
                      />
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Notas si están disponibles */}
            {policy.notes && (
              <>
                <Separator />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Notas</p>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                    {policy.notes}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Información del Cliente y Equipo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center text-lg">
              <User className="mr-2 h-5 w-5" />
              Cliente y Equipo
            </CardTitle>
            <CardDescription className="pt-2">
              Información de contacto del cliente y el equipo asignado.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Cliente</p>
              <div className="mt-1">
                <p className="font-semibold">{policy.customerName}</p>
                <div className="flex flex-wrap items-center gap-4 mt-2">
                  {policy.customerEmail && (
                    <div className="flex items-center space-x-1 truncate">
                      <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-muted-foreground truncate">{policy.customerEmail}</span>
                    </div>
                  )}
                  {policy.customerPhone && (
                    <div className="flex items-center space-x-1 truncate">
                      <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-muted-foreground truncate">{policy.customerPhone}</span>
                    </div>
                  )}
                </div>
                <div className="mt-4">
                  <Link href={`/customers/${policy.customerId}`}>
                    <Button variant="outline" size="sm" className="w-full">
                      Ver Detalles del Cliente
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Agente</p>
                <p className="font-semibold">{policy.agentName}</p>
              </div>

              {policy.processorName && (
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">Procesador Asignado</p>
                  <p className="font-semibold">{policy.processorName}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}