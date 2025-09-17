'use client';

import { useState, useTransition, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createTemplateSchema, TemplateFormData } from '../schemas';
import { createDocumentTemplate, generateDocumentFromTemplate, getCustomersForSelection } from '../actions';
import { formatDate } from '@/lib/utils';
import { Plus, FileText, MoreHorizontal, Eye, Download, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  type: 'income_letter' | 'coverage_confirmation' | 'renewal_notice' | 'birthday_greeting' | 'address_change_confirmation' | 'general_correspondence';
  content: string;
  variables?: string;
  isActive: boolean;
  createdBy: { name?: string; firstName?: string; lastName?: string; };
  createdAt: string;
  updatedAt: string;
}

interface DocumentTemplatesManagerProps {
  templates: DocumentTemplate[];
}

const TEMPLATE_TYPE_LABELS = {
  income_letter: 'Carta de Ingresos',
  coverage_confirmation: 'Confirmación de Cobertura',
  renewal_notice: 'Aviso de Renovación',
  birthday_greeting: 'Saludo de Cumpleaños',
  address_change_confirmation: 'Confirmación de Cambio de Dirección',
  general_correspondence: 'Correspondencia General',
};

const DEFAULT_TEMPLATE_CONTENT = {
  income_letter: `Estimado/a {{customerName}},

Por medio de la presente, confirmamos que usted cuenta con una póliza de seguro médico activa con {{insuranceCompany}}.

Detalles de la póliza:
- Plan: {{planName}}
- ID de Póliza: {{policyId}}
- Prima Mensual: \${{monthlyPremium}}

Esta carta puede ser utilizada como comprobante de cobertura médica para fines de solicitud de ingresos o cualquier otro trámite que lo requiera.

Si necesita información adicional, no dude en contactarnos.

Atentamente,
MULTISERVICE JAD 5000 C.A.
Fecha: {{currentDate}}`,

  coverage_confirmation: `Estimado/a {{customerName}},

Nos complace confirmar que su cobertura de seguro médico está activa y vigente.

Información de su póliza:
- Aseguradora: {{insuranceCompany}}
- Plan: {{planName}}
- Número de Póliza: {{policyId}}
- Contacto: {{customerEmail}}

Su cobertura está activa desde la fecha de entrada en vigor de su póliza.

Para cualquier consulta adicional, estamos a su disposición.

Saludos cordiales,
MULTISERVICE JAD 5000 C.A.
{{currentDate}}`,
};

export default function DocumentTemplatesManager({ templates }: DocumentTemplatesManagerProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [customers, setCustomers] = useState<Array<{id: string; fullName: string; policies: Array<{id: string;}>}>>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const form = useForm<TemplateFormData>({
    resolver: zodResolver(createTemplateSchema),
    defaultValues: {
      name: '',
      description: '',
      type: 'general_correspondence',
      content: '',
      variables: '',
      isActive: true,
    },
  });

  useEffect(() => {
    getCustomersForSelection().then(setCustomers);
  }, []);

  const handleCreateTemplate = async (data: TemplateFormData) => {
    startTransition(async () => {
      try {
        const result = await createDocumentTemplate(data);
        if (result.success) {
          toast.success("Plantilla creada con éxito");
          setIsCreateModalOpen(false);
          form.reset();
          router.refresh();
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error("Error inesperado al crear la plantilla");
      }
    });
  };

  const handleGenerateDocument = async () => {
    if (!selectedTemplate || !selectedCustomerId) return;

    startTransition(async () => {
      try {
        const result = await generateDocumentFromTemplate(
          selectedTemplate.id, 
          selectedCustomerId, 
          selectedPolicyId || undefined
        );
        if (result.success) {
          toast.success("Documento generado con éxito");
          setIsGenerateModalOpen(false);
          setSelectedTemplate(null);
          setSelectedCustomerId('');
          setSelectedPolicyId('');
          
          if (result.data?.content) {
            const newWindow = window.open('', '_blank');
            if (newWindow) {
              newWindow.document.write(`
                <html>
                  <head>
                    <title>Documento Generado</title>
                    <style>
                      body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
                      pre { white-space: pre-wrap; word-wrap: break-word; }
                    </style>
                  </head>
                  <body>
                    <h1>Documento Generado</h1>
                    <pre>${result.data.content}</pre>
                  </body>
                </html>
              `);
              newWindow.document.close();
            }
          }
        } else {
          toast.error(result.message);
        }
      } catch (error) {
        toast.error("Error inesperado al generar el documento");
      }
    });
  };

  const getUserName = (user: { name?: string; firstName?: string; lastName?: string; }) => {
    return user.name || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'Usuario');
  };

  const handleTemplateTypeChange = (type: string) => {
    form.setValue('type', type as any);
    if (DEFAULT_TEMPLATE_CONTENT[type as keyof typeof DEFAULT_TEMPLATE_CONTENT]) {
      form.setValue('content', DEFAULT_TEMPLATE_CONTENT[type as keyof typeof DEFAULT_TEMPLATE_CONTENT]);
    } else {
      form.setValue('content', ''); // Limpiar si no hay plantilla por defecto
    }
  };

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-xl">Plantillas de Documentos</CardTitle>
            <CardDescription>Crea y gestiona plantillas para generar documentos recurrentes de forma automática</CardDescription>
          </div>
          <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Plantilla
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Crear Nueva Plantilla</DialogTitle>
                <DialogDescription>
                  Crea una plantilla que podrá ser utilizada para generar documentos personalizados para los clientes.
                </DialogDescription>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(handleCreateTemplate)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de la Plantilla *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Carta de Ingresos Standard" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descripción</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descripción de cuándo usar esta plantilla..." 
                            {...field} 
                            rows={2}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de Plantilla *</FormLabel>
                        <Select onValueChange={handleTemplateTypeChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona el tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(TEMPLATE_TYPE_LABELS).map(([value, label]) => (
                              <SelectItem key={value} value={value}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Contenido de la Plantilla *</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Contenido del documento. Usa {{variableName}} para insertar datos dinámicos como {{customerName}}, {{insuranceCompany}}, etc." 
                            {...field} 
                            rows={12}
                            className="font-mono text-sm"
                          />
                        </FormControl>
                        <FormMessage />
                        <div className="text-xs text-muted-foreground mt-2">
                          <strong>Variables disponibles:</strong>
                          {' {{customerName}}, {{customerEmail}}, {{customerPhone}}, {{customerAddress}}, {{policyId}}, {{insuranceCompany}}, {{planName}}, {{monthlyPremium}}, {{currentDate}}'}
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCreateModalOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isPending}>
                      {isPending ? 'Creando...' : 'Crear Plantilla'}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </CardHeader>
        
        <CardContent>
          {templates.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold">No hay plantillas</h3>
              <p className="text-sm">Crea tu primera plantilla para generar documentos automáticamente.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Creado por</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {templates.map((template) => (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{template.name}</div>
                        {template.description && (
                          <div className="text-sm text-muted-foreground">
                            {template.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {TEMPLATE_TYPE_LABELS[template.type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={template.isActive ? "default" : "secondary"}>
                        {template.isActive ? 'Activa' : 'Inactiva'}
                      </Badge>
                    </TableCell>
                    <TableCell>{getUserName(template.createdBy)}</TableCell>
                    <TableCell>{formatDate(template.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedTemplate(template);
                              setIsGenerateModalOpen(true);
                            }}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Generar Documento
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              navigator.clipboard.writeText(template.content);
                              toast.success("Contenido copiado al portapapeles");
                            }}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copiar Contenido
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Modal para Generar Documento */}
      <Dialog open={isGenerateModalOpen} onOpenChange={setIsGenerateModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generar Documento</DialogTitle>
            <DialogDescription>
              Selecciona un cliente para generar el documento con la plantilla "{selectedTemplate?.name}".
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div>
              <label htmlFor="customer-select" className="text-sm font-medium">Cliente *</label>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger id="customer-select" className="mt-1">
                  <SelectValue placeholder="Selecciona un cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.fullName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCustomer && selectedCustomer.policies.length > 0 && (
              <div>
                <label htmlFor="policy-select" className="text-sm font-medium">Póliza (Opcional)</label>
                <Select value={selectedPolicyId} onValueChange={setSelectedPolicyId}>
                  <SelectTrigger id="policy-select" className="mt-1">
                    <SelectValue placeholder="Selecciona una póliza" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Ninguna póliza específica</SelectItem>
                    {selectedCustomer.policies.map((policy) => (
                      <SelectItem key={policy.id} value={policy.id}>
                        Póliza #{policy.id.slice(0, 8)}...
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsGenerateModalOpen(false);
                setSelectedCustomerId('');
                setSelectedPolicyId('');
              }}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleGenerateDocument}
              disabled={!selectedCustomerId || isPending}
            >
              {isPending ? 'Generando...' : 'Generar Documento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}