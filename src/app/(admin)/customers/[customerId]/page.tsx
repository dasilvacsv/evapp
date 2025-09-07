import { getCustomerById } from '../actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { formatDate, formatCurrency } from '@/lib/utils';
import { ArrowLeft, FileText, User, Phone, Mail, MapPin, Calendar, Briefcase, Landmark, PersonStanding, IdCard, Wallet } from 'lucide-react';

interface PageProps {
  params: {
    customerId: string;
  };
}

// Mapeo de estados a nombres más legibles y colores de Tailwind CSS
const STATUS_LABELS: Record<string, string> = {
  new_lead: 'Nuevo Prospecto',
  contacting: 'Contactando',
  info_captured: 'Información Capturada',
  in_review: 'En Revisión',
  missing_docs: 'Documentos Faltantes',
  sent_to_carrier: 'Enviado a Compañía',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  active: 'Activo',
  cancelled: 'Cancelado',
};

// Mapeo de géneros a nombres más legibles en español
const GENDER_LABELS: Record<string, string> = {
  male: 'Masculino',
  female: 'Femenino',
  other: 'Otro',
  prefer_not_to_say: 'Prefiero no decirlo',
};

// Mapeo de estados migratorios a nombres más legibles en español
const IMMIGRATION_STATUS_LABELS: Record<string, string> = {
  citizen: 'Ciudadano',
  green_card: 'Tarjeta Verde',
  work_permit: 'Permiso de Trabajo',
  other: 'Otro',
};

const getStatusColor = (status: string) => {
  const colors: Record<string, string> = {
    new_lead: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20',
    contacting: 'bg-yellow-50 text-yellow-700 ring-1 ring-inset ring-yellow-600/20',
    info_captured: 'bg-purple-50 text-purple-700 ring-1 ring-inset ring-purple-600/20',
    in_review: 'bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-600/20',
    missing_docs: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
    sent_to_carrier: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20',
    approved: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20',
    rejected: 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20',
    active: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    cancelled: 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20',
  };
  return colors[status] || 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-600/20';
};

export default async function CustomerDetailPage({ params }: PageProps) {
  const { customer, policies } = await getCustomerById(params.customerId);

  const renderInfoField = (Icon: any, label: string, value: string | undefined | null) => (
    <div className="flex items-start space-x-2">
      <Icon className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
      <div className="overflow-hidden">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="font-medium text-base leading-snug truncate">{value || 'No especificado'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* Encabezado con título y botón de regreso */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div className="flex items-center space-x-4">
          <Link href="/customers">
            <Button variant="outline" size="sm" className="hidden md:flex">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver a Clientes
            </Button>
            <Button variant="ghost" size="icon" className="md:hidden">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">{customer.fullName}</h1>
            <p className="text-lg text-muted-foreground">Detalles del Cliente</p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Información del Cliente */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="mr-2 h-5 w-5 text-primary" />
              Información Personal
            </CardTitle>
            <CardDescription>Datos básicos y de contacto del cliente.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderInfoField(PersonStanding, 'Nombre Completo', customer.fullName)}
              {renderInfoField(Calendar, 'Fecha de Nacimiento', formatDate(customer.birthDate))}
              {renderInfoField(IdCard, 'Género', customer.gender ? GENDER_LABELS[customer.gender] : 'No especificado')}
              {renderInfoField(Mail, 'Email', customer.email)}
              {renderInfoField(Phone, 'Teléfono', customer.phone)}
              {renderInfoField(MapPin, 'Dirección', customer.address)}
            </div>

            <Separator />
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {renderInfoField(Landmark, 'Estado Migratorio', customer.immigrationStatus ? IMMIGRATION_STATUS_LABELS[customer.immigrationStatus] : 'No especificado')}
              {renderInfoField(Wallet, 'Ingresos Anuales', customer.income ? formatCurrency(Number(customer.income)) : 'No especificado')}
              {renderInfoField(Briefcase, 'Tipo de Impuestos', customer.taxType)}
            </div>

            <Separator />

            <div>
              <p className="text-sm font-medium text-muted-foreground">Creado por</p>
              <p className="font-semibold text-lg truncate">{customer.agentName || 'Agente desconocido'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Panel de Pólizas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <FileText className="mr-2 h-5 w-5 text-primary" />
                Pólizas
              </div>
              <span className="text-sm text-muted-foreground font-normal">({policies.length})</span>
            </CardTitle>
            <CardDescription>Todas las pólizas de seguro de este cliente.</CardDescription>
          </CardHeader>
          <CardContent className="h-[500px] overflow-y-auto pr-2">
            {policies.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">
                No se encontraron pólizas para este cliente.
              </p>
            ) : (
              <div className="space-y-4">
                {policies.map((policy) => (
                  <Link key={policy.id} href={`/policies/${policy.id}`} className="block">
                    <div className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={`text-xs px-2 py-1 ${getStatusColor(policy.status)}`}>
                          {STATUS_LABELS[policy.status] || policy.status.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <p className="text-xs text-muted-foreground">{formatDate(policy.createdAt)}</p>
                      </div>
                      <h4 className="font-semibold text-base mb-1 truncate">{policy.insuranceCompany || 'Compañía No Especificada'}</h4>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {policy.monthlyPremium && (
                          <div className="flex items-center">
                            <Wallet className="h-3 w-3 mr-1" />
                            <p>Prima: {formatCurrency(Number(policy.monthlyPremium))}/mes</p>
                          </div>
                        )}
                        {policy.processorName && (
                          <div className="flex items-center">
                            <Briefcase className="h-3 w-3 mr-1" />
                            <p className="truncate">Procesador: {policy.processorName}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}