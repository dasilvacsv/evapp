// src/app/(admin)/customers/[customerId]/page.tsx (Código completo y corregido)

'use client';

import { useEffect, useState } from 'react';
import { getCustomerDetails, getDocumentUrl, sendToProcessing } from '../actions';
import { notFound } from 'next/navigation';
import Link from 'next/link';

// UI Components
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Icons & Utils
import { formatDate, formatCurrency } from '@/lib/utils';
import { ArrowLeft, User, Users, FileText, FolderOpen, Briefcase, Landmark, Wallet, Mail, Phone, MapPin, Calendar, Clock, Paperclip, Loader2, CalendarCheck, ShieldAlert, CreditCard, Send, AlertTriangle, UserCheck, ShieldClose } from 'lucide-react';

// Componentes especializados
import CustomerTasksModule from '../components/customer-tasks-module';

// Tipos extraídos para usar en el cliente
// Se usa un infer para extraer el tipo de retorno y asegurar que no sea null
type CustomerDetails = Awaited<ReturnType<typeof getCustomerDetails>> extends infer T ? NonNullable<T> : any; 
type DocumentType = NonNullable<CustomerDetails>['documents'][0];

// Mapeos de datos
const GENDER_LABELS: Record<string, string> = { male: 'Masculino', female: 'Femenino', other: 'Otro' };
const TAX_TYPE_LABELS: Record<string, string> = { w2: 'W2', '1099': '1099', not_yet_declared: 'No declara aún' };
const IMMIGRATION_STATUS_LABELS: Record<string, string> = {
    citizen: 'Ciudadanía', green_card: 'Residencia', work_permit_ssn: 'Permiso de Trabajo y SSN',
    u_visa: 'Visa U', political_asylum: 'Asilo Político', parole: 'Parol', notice_of_action: 'Aviso de Acción', other: 'Otro'
};

const InfoField = ({ Icon, label, value }: { Icon: React.ElementType; label: string; value: string | null | undefined; }) => (
    <div className="space-y-1">
        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Icon className="h-4 w-4" />{label}
        </p>
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <p className="font-semibold text-base truncate">{value || 'No especificado'}</p>
                </TooltipTrigger>
                <TooltipContent>
                    <p>{value || 'No especificado'}</p>
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    </div>
);

const DocumentItem = ({ doc, loadingDocId, handleViewDocument }: { doc: DocumentType; loadingDocId: string | null; handleViewDocument: (doc: DocumentType) => Promise<void>; }) => (
    <div key={doc.id} className="flex items-center gap-3 text-sm p-3 bg-muted/60 rounded-md">
        {loadingDocId === doc.id ? (
            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin flex-shrink-0" />
        ) : (
            <Paperclip className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <button
                            onClick={() => handleViewDocument(doc)}
                            disabled={loadingDocId === doc.id}
                            className="font-semibold text-primary text-left hover:underline disabled:no-underline disabled:cursor-wait disabled:text-muted-foreground truncate w-full"
                        >
                            {doc.fileName}
                        </button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>{doc.fileName}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <p className="text-xs text-muted-foreground truncate">
                Subido por {doc.uploadedByUser?.name || 'N/A'}
            </p>
        </div>
    </div>
);

export default function CustomerDetailPage({ params }: { params: { customerId: string } }) {
    // El estado puede ser null (cargando inicial), 'ACCESS_DENIED' (error de permiso) o CustomerDetails
    const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null | 'ACCESS_DENIED'>(null);
    const [isLoadingPage, setIsLoadingPage] = useState(true);
    const [loadingDocId, setLoadingDocId] = useState<string | null>(null);
    const [isSendingToProcessing, setIsSendingToProcessing] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        getCustomerDetails(params.customerId).then(details => {
            if (details) {
                setCustomerDetails(details);
            } else {
                // Si details es null, lo marcamos como Acceso Denegado (basado en la lógica del prompt)
                setCustomerDetails('ACCESS_DENIED');
            }
            setIsLoadingPage(false);
        }).catch(() => {
            setIsLoadingPage(false);
            toast({
                variant: "destructive",
                title: "Error",
                // Mensaje para un error de servidor (ej. fallo de DB), no un Acceso Denegado
                description: "Ocurrió un error en el servidor al intentar cargar la información del cliente.",
            });
        });
    }, [params.customerId, toast]);

    const handleViewDocument = async (doc: DocumentType) => {
        setLoadingDocId(doc.id);
        try {
            const result = await getDocumentUrl(doc.s3Key);
            if (result.success && result.url) {
                window.open(result.url, '_blank', 'noopener,noreferrer');
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: `Error al obtener el documento: ${result.error}`,
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error inesperado",
                description: "Ocurrió un error al intentar ver el documento.",
            });
        } finally {
            setLoadingDocId(null);
        }
    };

    const handleSendToProcessing = async () => {
        if (!window.confirm('¿Estás seguro de que quieres enviar este caso a procesamiento? Una vez enviado, perderás acceso a los detalles del cliente.')) {
            return;
        }

        setIsSendingToProcessing(true);
        try {
            const result = await sendToProcessing(params.customerId);
            if (result.success) {
                toast({
                    title: "Caso enviado a procesamiento",
                    description: "El caso ha sido transferido al equipo de procesamiento.",
                });
                // Recargar la página para reflejar los cambios
                window.location.reload();
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: result.message,
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Error inesperado",
                description: "No se pudo enviar el caso a procesamiento.",
            });
        } finally {
            setIsSendingToProcessing(false);
        }
    };

    if (isLoadingPage) {
        return <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
    }

    // Manejo de Acceso Denegado
    if (customerDetails === 'ACCESS_DENIED') {
        return (
            <div className="flex flex-col items-center justify-center h-screen p-8 bg-gray-50">
                <ShieldClose className="h-16 w-16 text-red-500 mb-4" />
                <h2 className="text-2xl font-bold mb-2">Acceso Denegado 🛑</h2>
                <p className="text-lg text-muted-foreground text-center">
                    No tienes los permisos necesarios para ver los detalles de este cliente. 
                    Si eres **Manager**, asegúrate de que el agente creador pertenezca a tu equipo.
                </p>
                <Button asChild className="mt-6">
                    <Link href="/customers">Volver a la lista de clientes</Link>
                </Button>
            </div>
        );
    }
    
    // Si el cliente no existe (o el id es inválido y el backend devuelve notFound)
    if (!customerDetails) {
        return notFound();
    }

    // Desestructuración segura después de las comprobaciones
    const { dependents, policies, documents: generalDocuments, tasks, generatedDocuments, declaredPeople, ...customer } = customerDetails;
    const agentName = customer.createdByAgent?.name || `${customer.createdByAgent?.firstName || ''} ${customer.createdByAgent?.lastName || ''}`.trim() || 'N/A';

    const allAppointments = policies.flatMap(p => p.appointments);
    const allClaims = policies.flatMap(p => p.claims);
    // Filtrar métodos de pago duplicados por ID
    const allPaymentMethods = policies.flatMap(p => p.paymentMethod || []).filter((pm, index, self) => index === self.findIndex((t) => (
        t.id === pm.id
    )));

    const isInProcessing = customer.processingStartedAt;

    return (
        <div className="space-y-8 p-4 md:p-8">
            {/* Encabezado */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button asChild variant="outline" size="icon" className="shrink-0">
                        <Link href="/customers">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{customer.fullName}</h1>
                        <div className="flex items-center gap-4 mt-1">
                            <p className="text-sm text-muted-foreground">
                                Creado por {agentName} el {formatDate(customer.createdAt)}
                            </p>
                            {isInProcessing && (
                                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                                    <Clock className="mr-1 h-3 w-3" />
                                    En Procesamiento desde {formatDate(isInProcessing)}
                                </Badge>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Botón para enviar a procesamiento (solo si no está ya en procesamiento) */}
                {!isInProcessing && (
                    <Button 
                        onClick={handleSendToProcessing}
                        disabled={isSendingToProcessing}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        {isSendingToProcessing ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="mr-2 h-4 w-4" />
                        )}
                        Enviar a Procesamiento
                    </Button>
                )}
            </div>

            {/* Alerta de restricción de acceso */}
            {isInProcessing && (
                <Alert className="border-orange-200 bg-orange-50">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <AlertDescription className="text-orange-800">
                        Este caso está actualmente en procesamiento. El acceso detallado está restringido al equipo de procesamiento.
                        Solo puedes ver información básica y gestionar tareas asignadas a ti.
                    </AlertDescription>
                </Alert>
            )}

            <div className="grid gap-8 lg:grid-cols-3">
                {/* COLUMNA IZQUIERDA Y CENTRAL - Información principal y de pólizas */}
                <div className="lg:col-span-2 space-y-8">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center"><User className="mr-2 h-5 w-5 text-primary" />Información del Cliente</CardTitle></CardHeader>
                        <CardContent className="space-y-6">
                            <div>
                                <h3 className="font-semibold mb-3">Datos Personales y de Contacto</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    <InfoField Icon={User} label="Nombre Completo" value={customer.fullName} />
                                    <InfoField Icon={Mail} label="Email" value={customer.email} />
                                    <InfoField Icon={Phone} label="Teléfono" value={customer.phone} />
                                    <InfoField Icon={Calendar} label="Fecha de Nacimiento" value={customer.birthDate ? formatDate(customer.birthDate) : undefined} />
                                    <InfoField Icon={CreditCard} label="Género" value={GENDER_LABELS[customer.gender || '']} />
                                    <InfoField Icon={MapPin} label="Dirección" value={customer.address} />
                                </div>
                            </div>
                            <Separator />
                            <div>
                                <h3 className="font-semibold mb-3">Información Adicional</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                                    <InfoField Icon={Landmark} label="Estatus Migratorio" value={IMMIGRATION_STATUS_LABELS[customer.immigrationStatus || '']} />
                                    <InfoField Icon={Briefcase} label="Ingresos Anuales" value={customer.income ? formatCurrency(Number(customer.income)) : undefined} />
                                    <InfoField Icon={Wallet} label="Tipo de Impuestos" value={TAX_TYPE_LABELS[customer.taxType || '']} />
                                    <InfoField Icon={CreditCard} label="SSN" value={customer.ssn ? '***-**-' + customer.ssn.slice(-4) : 'No disponible'} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Secciones de Historial en Tabs */}
                    <Tabs defaultValue="policies">
                        <TabsList className="grid w-full grid-cols-5 md:w-[600px]">
                            <TabsTrigger value="policies">Pólizas</TabsTrigger>
                            <TabsTrigger value="declared">Declarados</TabsTrigger>
                            <TabsTrigger value="appointments">Citas</TabsTrigger>
                            <TabsTrigger value="claims">Reclamos</TabsTrigger>
                            <TabsTrigger value="tasks">Tareas</TabsTrigger>
                        </TabsList>

                        <TabsContent value="policies" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <FileText className="mr-2 h-5 w-5 text-primary" />
                                        Pólizas Registradas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Aseguradora</TableHead>
                                                <TableHead>Estado</TableHead>
                                                <TableHead>Prima Mensual</TableHead>
                                                <TableHead>Fecha Efectiva</TableHead>
                                                <TableHead>AOR</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {policies.length > 0 ? policies.map(p => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium">{p.insuranceCompany}</TableCell>
                                                    <TableCell><Badge>{p.status}</Badge></TableCell>
                                                    <TableCell>{p.monthlyPremium ? formatCurrency(Number(p.monthlyPremium)) : '-'}</TableCell>
                                                    <TableCell>{p.effectiveDate ? formatDate(p.effectiveDate) : '-'}</TableCell>
                                                    <TableCell>
                                                        {p.aorLink ? (
                                                            <Button variant="outline" size="sm" asChild>
                                                                <a href={p.aorLink} target="_blank" rel="noopener noreferrer">
                                                                    <FileText className="mr-1 h-3 w-3" />
                                                                    Ver AOR
                                                                </a>
                                                            </Button>
                                                        ) : (
                                                            <span className="text-muted-foreground text-sm">Sin AOR</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )) : <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">No hay pólizas.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* TAB: Personas Declaradas */}
                        <TabsContent value="declared" className="mt-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <UserCheck className="mr-2 h-5 w-5 text-primary" />
                                        Personas Declaradas en Impuestos
                                    </CardTitle>
                                    <CardDescription>
                                        Personas que el cliente declara en sus impuestos (no son dependientes de la póliza).
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {declaredPeople && declaredPeople.length > 0 ? (
                                        <div className="space-y-4">
                                            {declaredPeople.map(person => (
                                                <div key={person.id} className="p-4 border rounded-lg bg-muted/30">
                                                    <div className="flex items-start gap-3">
                                                        <UserCheck className="h-5 w-5 text-primary flex-shrink-0 mt-1" />
                                                        <div className="flex-1">
                                                            <h4 className="font-semibold text-base">{person.fullName}</h4>
                                                            <p className="text-sm text-muted-foreground">Parentesco: {person.relationship}</p>
                                                            {person.immigrationStatus && (
                                                                <p className="text-sm text-muted-foreground">
                                                                    Estatus Migratorio: {IMMIGRATION_STATUS_LABELS[person.immigrationStatus] || person.immigrationStatusOther}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                            <p>No hay personas declaradas en impuestos.</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="appointments" className="mt-6">
                            <Card>
                                <CardHeader><CardTitle className="flex items-center"><CalendarCheck className="mr-2 h-5 w-5 text-primary" />Historial de Citas</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Fecha</TableHead><TableHead>Póliza Relacionada</TableHead><TableHead>Notas</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {allAppointments.length > 0 ? allAppointments.map(appt => (
                                                <TableRow key={appt.id}>
                                                    <TableCell className="font-medium">{formatDate(appt.appointmentDate)}</TableCell>
                                                    <TableCell><Badge variant="secondary">{appt.policyId}</Badge></TableCell>
                                                    <TableCell>{appt.notes || 'N/A'}</TableCell>
                                                </TableRow>
                                            )) : <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-4">No hay citas registradas.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="claims" className="mt-6">
                            <Card>
                                <CardHeader><CardTitle className="flex items-center"><ShieldAlert className="mr-2 h-5 w-5 text-primary" />Historial de Reclamos</CardTitle></CardHeader>
                                <CardContent>
                                    <Table>
                                        <TableHeader><TableRow><TableHead>Fecha del Reclamo</TableHead><TableHead>Número de Reclamo</TableHead><TableHead>Descripción</TableHead><TableHead>Póliza Relacionada</TableHead></TableRow></TableHeader>
                                        <TableBody>
                                            {allClaims.length > 0 ? allClaims.map(claim => (
                                                <TableRow key={claim.id}>
                                                    <TableCell className="font-medium">{formatDate(claim.dateFiled)}</TableCell>
                                                    <TableCell>{claim.claimNumber}</TableCell>
                                                    <TableCell>{claim.description || 'N/A'}</TableCell>
                                                    <TableCell><Badge variant="secondary">{claim.policyId}</Badge></TableCell>
                                                </TableRow>
                                            )) : <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-4">No hay reclamos registrados.</TableCell></TableRow>}
                                        </TableBody>
                                    </Table>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="tasks" className="mt-6">
                            <CustomerTasksModule
                                customerId={params.customerId}
                                policyId={policies[0]?.id}
                                tasks={tasks || []}
                            />
                        </TabsContent>
                    </Tabs>
                </div>

                {/* COLUMNA DERECHA - Documentos, Dependientes, Pagos */}
                <div className="space-y-8">
                    <Card>
                        <CardHeader><CardTitle className="flex items-center"><FolderOpen className="mr-2 h-5 w-5 text-primary" />Documentos Generales</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                            {generalDocuments.length > 0 ? (
                                generalDocuments.map(doc => <DocumentItem key={doc.id} doc={doc} loadingDocId={loadingDocId} handleViewDocument={handleViewDocument} />)
                            ) : (
                                <p className="text-sm text-muted-foreground text-center">No hay documentos generales.</p>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="flex items-center"><Users className="mr-2 h-5 w-5 text-primary" />Dependientes</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {dependents.length > 0 ? dependents.map(d => (
                                <div key={d.id} className="text-sm p-4 bg-muted/50 rounded-lg">
                                    <div className="flex items-start gap-2">
                                        <User className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                                        <div>
                                            <p className="font-semibold">{d.fullName}</p>
                                            <p className="text-muted-foreground text-xs">{d.relationship} - Nacimiento: {d.birthDate ? formatDate(d.birthDate) : 'N/A'}</p>
                                        </div>
                                    </div>
                                    {d.documents && d.documents.length > 0 && (
                                        <div className="pt-4 mt-4 border-t border-muted-foreground/30 space-y-2">
                                            <p className="text-xs font-medium text-muted-foreground">Documentos del dependiente:</p>
                                            {d.documents.map(doc => <DocumentItem key={doc.id} doc={doc as DocumentType} loadingDocId={loadingDocId} handleViewDocument={handleViewDocument} />)}
                                        </div>
                                    )}
                                </div>
                            )) : <p className="text-sm text-muted-foreground text-center">No hay dependientes.</p>}
                        </CardContent>
                    </Card>
                    
                    <Card>
                        <CardHeader><CardTitle className="flex items-center"><CreditCard className="mr-2 h-5 w-5 text-primary" />Métodos de Pago</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            {allPaymentMethods.length > 0 ? allPaymentMethods.map(pm => (
                                <div key={pm.id} className="p-3 bg-muted/50 rounded-md">
                                    <p className="font-semibold">{pm.cardBrand || pm.bankName || 'Método de Pago'}</p>
                                    <p className="text-sm text-muted-foreground">Terminada en •••• {pm.cardLast4 || pm.accountLast4}</p>
                                    {/* Mostrar nombre del titular si existe */}
                                    {pm.accountHolderName && (
                                        <p className="text-sm text-muted-foreground">Titular: {pm.accountHolderName}</p>
                                    )}
                                </div>
                            )) : <p className="text-sm text-muted-foreground text-center">No hay métodos de pago registrados.</p>}
                        </CardContent>
                    </Card>

                    {/* Documentos Generados */}
                    {generatedDocuments && generatedDocuments.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center">
                                    <FileText className="mr-2 h-5 w-5 text-primary" />
                                    Documentos Generados
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {generatedDocuments.map(genDoc => (
                                    <div key={genDoc.id} className="p-3 bg-muted/50 rounded-md">
                                        <p className="font-semibold text-sm">{genDoc.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Plantilla: {genDoc.template.name} | Generado por: {genDoc.generatedBy.name} | {formatDate(genDoc.createdAt)}
                                        </p>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="mt-2"
                                            onClick={() => {
                                                const newWindow = window.open('', '_blank');
                                                if (newWindow) {
                                                    newWindow.document.write(`
                                                        <html>
                                                            <head>
                                                                <title>${genDoc.title}</title>
                                                                <style>
                                                                    body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                                                                    pre { white-space: pre-wrap; }
                                                                </style>
                                                            </head>
                                                            <body>
                                                                <h1>${genDoc.title}</h1>
                                                                <pre>${genDoc.generatedContent}</pre>
                                                            </body>
                                                        </html>
                                                    `);
                                                    newWindow.document.close();
                                                }
                                            }}
                                        >
                                            <FileText className="mr-1 h-3 w-3" />
                                            Ver Documento
                                        </Button>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}