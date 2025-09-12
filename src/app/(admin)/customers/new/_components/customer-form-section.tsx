'use client';

import { Control, UseFormSetValue } from "react-hook-form";
import { FullApplicationFormData } from "../../schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import InputMask from "react-input-mask";
import { useState, useEffect, useCallback } from "react";
import { Loader2 } from 'lucide-react';
import BirthDateFields from "./birth-date-fields";
import FileUploader from "./file-uploader"; // Importamos el uploader

interface Props {
  formControl: Control<FullApplicationFormData>;
  setFormValue: UseFormSetValue<FullApplicationFormData>;
}

// Objeto auxiliar para convertir el nombre completo del estado a su abreviatura
const STATE_MAP: { [key: string]: string } = {
    'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR', 'California': 'CA',
    'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE', 'Florida': 'FL', 'Georgia': 'GA',
    'Hawaii': 'HI', 'Idaho': 'ID', 'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
    'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD', 'Massachusetts': 'MA',
    'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS', 'Missouri': 'MO', 'Montana': 'MT',
    'Nebraska': 'NE', 'Nevada': 'NV', 'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM',
    'New York': 'NY', 'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
    'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
    'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT', 'Vermont': 'VT',
    'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV', 'Wisconsin': 'WI', 'Wyoming': 'WY',
    'District of Columbia': 'DC', 'American Samoa': 'AS', 'Guam': 'GU', 'Northern Mariana Islands': 'MP',
    'Puerto Rico': 'PR', 'United States Virgin Islands': 'VI',
};

export default function CustomerFormSection({ formControl, setFormValue }: Props) {
  const [zipCode, setZipCode] = useState('');
  const [isFetchingZip, setIsFetchingZip] = useState(false);
  const [zipError, setZipError] = useState('');

  // --- Tu nueva función para usar OpenStreetMap (Nominatim) API ---
  const fetchZipData = useCallback(async (zip: string) => {
    if (zip.length !== 5) return;

    setIsFetchingZip(true);
    setZipError('');

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?postalcode=${zip}&countrycodes=us&format=json&addressdetails=1`, {
          headers: {
            'User-Agent': 'InsuranceCRM/1.0 (your-contact-email@example.com)'
          }
        }
      );
      
      if (!response.ok) throw new Error('Error de conexión con el servicio de geolocalización.');

      const data = await response.json();
      if (!data || data.length === 0) throw new Error('Código postal no encontrado.');
      
      const address = data[0].address;
      const stateName = address.state;
      const countyName = address.county;

      const stateAbbr = stateName ? STATE_MAP[stateName] : '';
      const county = countyName ? countyName.replace(' County', '') : '';

      if (stateAbbr && county) {
        setFormValue('customer.state', stateAbbr, { shouldValidate: true });
        setFormValue('customer.county', county, { shouldValidate: true });
      } else {
        throw new Error('No se pudo determinar estado/condado.');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Código postal inválido.';
      setZipError(errorMessage);
      setFormValue('customer.state', '', { shouldValidate: true });
      setFormValue('customer.county', '', { shouldValidate: true });
    } finally {
      setIsFetchingZip(false);
    }
  }, [setFormValue]);

  // useEffect con la corrección para guardar el zipCode en el estado del formulario
  useEffect(() => {
    const handler = setTimeout(() => {
        if (zipCode) {
            setFormValue('customer.zipCode', zipCode, { shouldValidate: true });
            fetchZipData(zipCode);
        }
    }, 500);
    return () => clearTimeout(handler);
  }, [zipCode, fetchZipData, setFormValue]);

  return (
    <div className="space-y-8">
        <Card>
            <CardHeader>
                <CardTitle>1. Información del Titular</CardTitle>
                <CardDescription>Datos personales, de contacto y financieros del cliente principal.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* --- SECCIÓN DATOS PERSONALES --- */}
                <div className="space-y-1">
                    <h3 className="font-medium text-lg">Datos Personales</h3>
                    <hr/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField control={formControl} name="customer.fullName" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nombre Completo</FormLabel>
                            <FormControl><Input placeholder="JOHN DOE" {...field} className="uppercase" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    
                    <FormField control={formControl} name="customer.birthDate" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Fecha de Nacimiento*</FormLabel>
                            <FormControl>
                                <BirthDateFields
                                    value={field.value}
                                    onChange={field.onChange}
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={formControl} name="customer.gender" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Género*</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="male">Masculino</SelectItem>
                                    <SelectItem value="female">Femenino</SelectItem>
                                    <SelectItem value="other">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                
                {/* --- SECCIÓN CONTACTO Y DIRECCIÓN --- */}
                <div className="space-y-1 pt-4">
                    <h3 className="font-medium text-lg">Contacto y Dirección</h3>
                    <hr/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={formControl} name="customer.email" render={({ field }) => (
                        <FormItem><FormLabel>Correo Electrónico</FormLabel><FormControl><Input type="email" placeholder="ejemplo@correo.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={formControl} name="customer.phone" render={({ field }) => (
                        <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input placeholder="555-123-4567" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                </div>
                <FormField control={formControl} name="customer.address" render={({ field }) => (
                        <FormItem><FormLabel>Dirección Completa</FormLabel><FormControl><Textarea placeholder="123 MAIN ST, APT 4B..." {...field} className="uppercase" /></FormControl><FormMessage /></FormItem>
                )} />
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    <FormItem>
                        <FormLabel>Código Postal (ZIP)</FormLabel>
                        <div className="relative">
                            <Input 
                                placeholder="12345" 
                                value={zipCode}
                                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').substring(0,5))}
                                maxLength={5}
                            />
                            {isFetchingZip && <Loader2 className="h-4 w-4 animate-spin absolute right-2 top-2.5 text-muted-foreground" />}
                        </div>
                        {zipError && <p className="text-sm text-destructive mt-1">{zipError}</p>}
                    </FormItem>
                    <FormField control={formControl} name="customer.state" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <FormControl><Input placeholder="Auto-completado" {...field} readOnly className="bg-muted/80" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={formControl} name="customer.county" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Condado</FormLabel>
                            <FormControl><Input placeholder="Auto-completado" {...field} readOnly className="bg-muted/80 uppercase" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                {/* --- SECCIÓN INFORMACIÓN MIGRATORIA Y FINANCIERA --- */}
                <div className="space-y-1 pt-4">
                    <h3 className="font-medium text-lg">Información Migratoria y Financiera</h3>
                    <hr/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField control={formControl} name="customer.immigrationStatus" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Estatus Migratorio</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un estatus..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="citizen">Ciudadanía</SelectItem>
                                    <SelectItem value="green_card">Residencia (Green Card)</SelectItem>
                                    <SelectItem value="work_permit_ssn">Permiso de Trabajo y SSN</SelectItem>
                                    <SelectItem value="u_visa">Visa U</SelectItem>
                                    <SelectItem value="political_asylum">Asilo Político</SelectItem>
                                    <SelectItem value="parole">Parol</SelectItem>
                                    <SelectItem value="notice_of_action">Aviso de Acción</SelectItem>
                                    <SelectItem value="other">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={formControl} name="customer.documentType" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Documento</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un documento..." /></SelectTrigger></FormControl>
                                <SelectContent>
                                    <SelectItem value="foreign_passport">Pasaporte Extranjero</SelectItem>
                                    <SelectItem value="drivers_license">Licencia de Conducción</SelectItem>
                                    <SelectItem value="credentials">Credenciales</SelectItem>
                                    <SelectItem value="work_permit_ssn_card">Permiso de Trabajo y Social</SelectItem>
                                    <SelectItem value="ssn_card">Tarjeta de Seguro Social</SelectItem>
                                    <SelectItem value="work_student_visa_holder">Visa de Trabajo o Estudiante</SelectItem>
                                    <SelectItem value="permanent_residence">Residencia Permanente</SelectItem>
                                    <SelectItem value="voter_registration">Tarjeta de Votante</SelectItem>
                                    <SelectItem value="citizen_passport">Pasaporte Ciudadano</SelectItem>
                                    <SelectItem value="marriage_certificate">Certificado de Matrimonio</SelectItem>
                                    <SelectItem value="income_proof">Comprobante de Ingresos</SelectItem>
                                    <SelectItem value="other">Otro</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={formControl} name="customer.ssn" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Seguro Social (SSN)</FormLabel>
                            <FormControl>
                                {/* @ts-ignore */}
                                <InputMask mask="999-99-9999" value={field.value || ''} onChange={field.onChange}>
                                    {(inputProps: any) => <Input {...inputProps} placeholder="000-00-0000" />}
                                </InputMask>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={formControl} name="customer.taxType" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tipo de Impuestos (Taxes)</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona un tipo..." /></SelectTrigger></FormControl>
                            <SelectContent>
                                <SelectItem value="w2">W2</SelectItem>
                                <SelectItem value="1099">1099</SelectItem>
                                <SelectItem value="not_yet_declared">Aún no declara</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )} />
                    <FormField
                        control={formControl}
                        name="customer.income"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ingresos Anuales (USD)</FormLabel>
                                <FormControl>
                                    <Input
                                        type="number"
                                        placeholder="50000"
                                        {...field}
                                        onChange={(e) => {
                                            const value = e.target.value;
                                            field.onChange(value === '' ? undefined : Number(value));
                                        }}
                                        value={field.value ?? ''}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <FormField control={formControl} name="customer.declaresOtherPeople" render={({ field }) => (
                    <FormItem className="space-y-3">
                        <FormLabel>¿Declara a otras personas en sus impuestos?</FormLabel>
                        <FormControl>
                            <RadioGroup onValueChange={(value) => field.onChange(value === "true")} defaultValue={String(field.value)} className="flex items-center space-x-4">
                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="true" /></FormControl><FormLabel className="font-normal">Sí</FormLabel></FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="false" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
                            </RadioGroup>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
            </CardContent>
        </Card>

        {/* --- SECCIÓN DE DOCUMENTOS GENERALES --- */}
        <Card>
            <CardHeader>
                <CardTitle>Documentos Generales del Titular</CardTitle>
                <CardDescription>Sube documentos de identidad, comprobantes de ingresos, etc., que apliquen a la póliza en general.</CardDescription>
            </CardHeader>
            <CardContent>
                <FormField
                    control={formControl}
                    name="documents"
                    render={({ field }) => (
                        <FileUploader
                            uploadedFiles={field.value || []}
                            onFilesChange={(newFiles) => {
                                setFormValue("documents", newFiles, { shouldValidate: true });
                            }}
                        />
                    )}
                />
            </CardContent>
        </Card>
    </div>
  );
}