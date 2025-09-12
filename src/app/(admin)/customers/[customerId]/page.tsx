'use client';

import { useEffect, useState } from 'react';
import { getCustomerDetails, getDocumentUrl } from '../actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Icons & Utils
import { formatDate, formatCurrency } from '@/lib/utils';
import { ArrowLeft, User, Users, FileText, FolderOpen, Briefcase, Landmark, Wallet, CreditCard, Paperclip, Loader2, CalendarCheck, ShieldAlert } from 'lucide-react';

// Tipos extraídos para usar en el cliente
type CustomerDetails = Awaited<ReturnType<typeof getCustomerDetails>>;
type DocumentType = NonNullable<CustomerDetails>['documents'][0];

// Mapeos de datos
const GENDER_LABELS: Record<string, string> = { male: 'Masculino', female: 'Femenino', other: 'Otro' };
const TAX_TYPE_LABELS: Record<string, string> = { w2: 'W2', '1099': '1099', not_yet_declared: 'No declara aún' };
const IMMIGRATION_STATUS_LABELS: Record<string, string> = {
  citizen: 'Ciudadanía', green_card: 'Residencia', work_permit_ssn: 'Permiso de Trabajo y SSN',
  u_visa: 'Visa U', political_asylum: 'Asilo Político', parole: 'Parol', notice_of_action: 'Aviso de Acción', other: 'Otro'
};

const InfoField = ({ Icon, label, value }: { Icon: React.ElementType, label: string, value: string | null | undefined }) => (
  <div>
    <p className="text-sm font-medium text-muted-foreground flex items-center"><Icon className="h-4 w-4 mr-2" />{label}</p>
    <p className="font-semibold text-base leading-snug">{value || 'No especificado'}</p>
  </div>
);

export default function CustomerDetailPage({ params }: { params: { customerId: string } }) {
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [loadingDocId, setLoadingDocId] = useState<string | null>(null);

  useEffect(() => {
    getCustomerDetails(params.customerId).then(details => {
      if (details) {
        setCustomerDetails(details);
      }
      setIsLoadingPage(false);
    });
  }, [params.customerId]);

  const handleViewDocument = async (doc: DocumentType) => {
    setLoadingDocId(doc.id);
    try {
      const result = await getDocumentUrl(doc.s3Key);
      if (result.success && result.url) {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      } else {
        console.error(result.error);
        alert(`Error al obtener el documento: ${result.error}`);
      }
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error inesperado.");
    } finally {
      setLoadingDocId(null);
    }
  };

  if (isLoadingPage) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!customerDetails) {
    return notFound();
  }

  const { dependents, policies, documents: generalDocuments, ...customer } = customerDetails;
  const agentName = customer.createdByAgent.name || `${customer.createdByAgent.firstName} ${customer.createdByAgent.lastName}`;

  // Extraer todas las citas y reclamos de todas las pólizas
  const allAppointments = policies.flatMap(p => p.appointments);
  const allClaims = policies.flatMap(p => p.claims);

  // Componente reutilizable para mostrar cada documento
  const DocumentItem = ({ doc }: { doc: DocumentType }) => (
    <div key={doc.id} className="flex items-start gap-3 text-sm p-2 bg-muted/60 rounded-md">
      {loadingDocId === doc.id ? (
        <Loader2 className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0 animate-spin" />
      ) : (
        <Paperclip className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <button
          onClick={() => handleViewDocument(doc)}
          disabled={loadingDocId === doc.id}
          className="font-semibold text-primary text-left hover:underline disabled:no-underline disabled:cursor-wait disabled:text-muted-foreground truncate w-full"
          title={doc.fileName}
        >
          {doc.fileName}
        </button>
        <p className="text-xs text-muted-foreground">
          Subido por {doc.uploadedByUser?.name || 'N/A'}
        </p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 p-4 md:p-8">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button asChild variant="outline" size="icon"><Link href="/customers"><ArrowLeft className="h-4 w-4" /></Link></Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{customer.fullName}</h1>
            <p className="text-muted-foreground">Creado por {agentName} el {formatDate(customer.createdAt)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* COLUMNA IZQUIERDA Y CENTRAL */}
        <div className="lg:col-span-2 space-y-8">
          <Card>
            <CardHeader><CardTitle className="flex items-center"><User className="mr-2 h-5 w-5 text-primary" />Información del Cliente</CardTitle></CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="font-semibold mb-2">Datos Personales y de Contacto</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <InfoField Icon={User} label="Nombre Completo" value={customer.fullName} />
                  <InfoField Icon={CreditCard} label="Género" value={GENDER_LABELS[customer.gender || '']} />
                  <InfoField Icon={Wallet} label="Fecha de Nacimiento" value={customer.birthDate ? formatDate(customer.birthDate) : undefined} />
                  <InfoField Icon={CreditCard} label="Email" value={customer.email} />
                  <InfoField Icon={Wallet} label="Teléfono" value={customer.phone} />
                  <InfoField Icon={CreditCard} label="Dirección" value={customer.address} />
                </div>
              </div>
              <Separator />
              <div>
                <h3 className="font-semibold mb-2">Información Migratoria y Financiera</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <InfoField Icon={Landmark} label="Estatus Migratorio" value={IMMIGRATION_STATUS_LABELS[customer.immigrationStatus || '']} />
                  <InfoField Icon={Briefcase} label="Ingresos Anuales" value={customer.income ? formatCurrency(Number(customer.income)) : undefined} />
                  <InfoField Icon={Wallet} label="Tipo de Impuestos" value={TAX_TYPE_LABELS[customer.taxType || '']} />
                  <InfoField Icon={CreditCard} label="SSN" value={customer.ssn ? '***-**-' + customer.ssn.slice(-4) : 'No disponible'} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" />Pólizas Registradas</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Aseguradora</TableHead><TableHead>Estado</TableHead><TableHead>Prima Mensual</TableHead><TableHead>Fecha Efectiva</TableHead></TableRow></TableHeader>
                <TableBody>
                  {policies.length > 0 ? policies.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.insuranceCompany}</TableCell>
                      <TableCell><Badge>{p.status}</Badge></TableCell>
                      <TableCell>{p.monthlyPremium ? formatCurrency(Number(p.monthlyPremium)) : '-'}</TableCell>
                      <TableCell>{p.effectiveDate ? formatDate(p.effectiveDate) : '-'}</TableCell>
                    </TableRow>
                  )) : <TableRow><TableCell colSpan={4} className="text-center">No hay pólizas.</TableCell></TableRow>}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* COLUMNA DERECHA */}
        <div className="space-y-8">
          <Card>
            <CardHeader><CardTitle className="flex items-center"><Wallet className="mr-2 h-5 w-5 text-primary" />Métodos de Pago</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {policies.some(p => p.paymentMethod) ? policies.map(p =>
                p.paymentMethod && (
                  <div key={p.paymentMethod.id} className="p-3 bg-muted/50 rounded-md">
                    <p className="font-semibold">{p.paymentMethod.cardBrand || p.paymentMethod.bankName || p.paymentMethod.methodType.replace('_', ' ')}</p>
                    <p className="text-sm text-muted-foreground">Terminada en •••• {p.paymentMethod.cardLast4 || p.paymentMethod.accountLast4}</p>
                  </div>
                )
              ) : <p className="text-sm text-muted-foreground">No hay métodos de pago registrados.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary" />Dependientes</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {dependents.length > 0 ? dependents.map(d => (
                <div key={d.id} className="text-sm p-3 bg-muted/50 rounded-md">
                  <div>
                    <p className="font-semibold">{d.fullName}</p>
                    <p className="text-muted-foreground">{d.relationship} - Nacimiento: {d.birthDate ? formatDate(d.birthDate) : 'N/A'}</p>
                  </div>
                  {d.documents && d.documents.length > 0 && (
                    <div className="pt-2 mt-2 border-t border-muted space-y-2">
                      {d.documents.map(doc => <DocumentItem key={doc.id} doc={doc as DocumentType} />)}
                    </div>
                  )}
                </div>
              )) : <p className="text-sm text-muted-foreground">No hay dependientes.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center"><FolderOpen className="mr-2 h-5 w-5 text-primary" />Documentos Generales</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {generalDocuments.length > 0 ? (
                generalDocuments.map(doc => <DocumentItem key={doc.id} doc={doc} />)
              ) : (
                <p className="text-sm text-muted-foreground">No hay documentos generales.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* HISTORIAL DE CITAS Y RECLAMOS */}
      <div className="space-y-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><CalendarCheck className="mr-2 h-5 w-5 text-primary" />Historial de Citas</CardTitle>
            <CardDescription>Citas agendadas para este cliente y sus pólizas.</CardDescription>
          </CardHeader>
          <CardContent>
            {allAppointments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Póliza Relacionada</TableHead>
                    <TableHead>Notas</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allAppointments.map(appt => (
                    <TableRow key={appt.id}>
                      <TableCell className="font-medium">{formatDate(appt.appointmentDate)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{appt.policyId}</Badge>
                      </TableCell>
                      <TableCell>{appt.notes || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">No hay citas registradas para este cliente.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><ShieldAlert className="mr-2 h-5 w-5 text-primary" />Historial de Reclamos</CardTitle>
            <CardDescription>Reclamos registrados para este cliente y sus pólizas.</CardDescription>
          </CardHeader>
          <CardContent>
            {allClaims.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha del Reclamo</TableHead>
                    <TableHead>Número de Reclamo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Póliza Relacionada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allClaims.map(claim => (
                    <TableRow key={claim.id}>
                      <TableCell className="font-medium">{formatDate(claim.dateFiled)}</TableCell>
                      <TableCell>{claim.claimNumber}</TableCell>
                      <TableCell>{claim.description || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{claim.policyId}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">No hay reclamos registrados para este cliente.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}