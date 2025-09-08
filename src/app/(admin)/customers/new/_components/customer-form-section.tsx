'use client';

import { Control } from "react-hook-form";
import { FullApplicationFormData } from "../../schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { isValid, parse } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import InputMask from "react-input-mask";
import { useState, useEffect } from "react";

interface Props {
  formControl: Control<FullApplicationFormData>;
}

// 👇 Función auxiliar para formatear la fecha en UTC y evitar el error del día anterior
const formatDateUTC = (date: Date | null | undefined): string => {
  if (!date || !isValid(date)) return '';
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const year = date.getUTCFullYear();
  return `${day}/${month}/${year}`;
};

export default function CustomerFormSection({ formControl }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>1. Información del Titular de la Póliza</CardTitle>
        <CardDescription>
          Datos personales, de contacto y financieros del cliente principal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* --- SECCIÓN DATOS PERSONALES --- */}
        <div className="space-y-1">
            <h3 className="font-medium text-lg">Datos Personales</h3>
            <hr/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField control={formControl} name="customer.fullName" render={({ field }) => (
            <FormItem><FormLabel>Nombre Completo*</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
          
          {/* 👇 Lógica de Fecha Corregida */}
          <FormField
            control={formControl}
            name="customer.birthDate"
            render={({ field }) => {
              const [inputValue, setInputValue] = useState(formatDateUTC(field.value));

              useEffect(() => {
                setInputValue(formatDateUTC(field.value));
              }, [field.value]);

              return (
                <FormItem className="flex flex-col pt-2"><FormLabel className="mb-1">Fecha de Nacimiento*</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <InputMask
                        mask="99/99/9999"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onBlur={() => {
                          const parsedDate = parse(inputValue, 'dd/MM/yyyy', new Date());
                          if (isValid(parsedDate)) {
                            // Creamos la fecha directamente en UTC
                            const utcDate = new Date(Date.UTC(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate()));
                            field.onChange(utcDate);
                          } else {
                            field.onChange(undefined);
                          }
                        }}
                      >
                        {(inputProps) => <Input {...inputProps} placeholder="DD/MM/AAAA" />}
                      </InputMask>
                    </FormControl>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" size="icon" className="h-10 w-10 flex-shrink-0">
                          <CalendarIcon className="h-4 w-4" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => field.onChange(date)}
                          captionLayout="dropdown-buttons"
                          fromYear={1920}
                          toYear={new Date().getFullYear()}
                          disabled={(date) => date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <FormMessage />
                </FormItem>
              );
            }}
          />

           <FormField control={formControl} name="customer.gender" render={({ field }) => (
            <FormItem><FormLabel>Género*</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un género..." /></SelectTrigger></FormControl>
                    <SelectContent>
                        <SelectItem value="male">Masculino</SelectItem>
                        <SelectItem value="female">Femenino</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                </Select><FormMessage />
            </FormItem>
          )} />
        </div>
        
        {/* El resto del formulario permanece igual */}
        <FormField control={formControl} name="customer.appliesToCoverage" render={({ field }) => (
          <FormItem className="space-y-3"><FormLabel>¿El titular aplica a la cobertura médica?</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={(value) => field.onChange(value === "true")} defaultValue={String(field.value)} className="flex items-center space-x-4">
                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="true" /></FormControl><FormLabel className="font-normal">Sí</FormLabel></FormItem>
                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="false" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
              </RadioGroup>
            </FormControl><FormMessage />
          </FormItem>
        )} />

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
            <FormItem><FormLabel>Dirección Completa</FormLabel><FormControl><Textarea placeholder="123 Main St, Apt 4B, Miami, FL 33101" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField control={formControl} name="customer.county" render={({ field }) => (
                <FormItem><FormLabel>Condado</FormLabel><FormControl><Input placeholder="Miami-Dade" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={formControl} name="customer.state" render={({ field }) => (
                <FormItem><FormLabel>Estado</FormLabel><FormControl><Input placeholder="FL" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
        </div>

        <div className="space-y-1 pt-4">
            <h3 className="font-medium text-lg">Información Migratoria y Financiera</h3>
            <hr/>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FormField control={formControl} name="customer.immigrationStatus" render={({ field }) => (
                <FormItem><FormLabel>Estatus Migratorio</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona un estatus..." /></SelectTrigger></FormControl>
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
                    </Select><FormMessage />
                </FormItem>
            )} />
            <FormField control={formControl} name="customer.documentType" render={({ field }) => (
                <FormItem><FormLabel>Tipo de Documento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona un documento..." /></SelectTrigger></FormControl>
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
                    </Select><FormMessage />
                </FormItem>
            )} />
            <FormField control={formControl} name="customer.ssn" render={({ field }) => (
                <FormItem><FormLabel>Número de Seguro Social (SSN)</FormLabel><FormControl><Input placeholder="###-##-####" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={formControl} name="customer.taxType" render={({ field }) => (
                <FormItem><FormLabel>Tipo de Impuestos (Taxes)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Selecciona un tipo..." /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="w2">W2</SelectItem>
                            <SelectItem value="1099">1099</SelectItem>
                            <SelectItem value="not_yet_declared">Aún no declara</SelectItem>
                        </SelectContent>
                    </Select><FormMessage />
                </FormItem>
            )} />

           {/* 👇 INICIO DEL CÓDIGO CORREGIDO 👇 */}
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
                      // 1. Sobrescribimos el onChange para convertir el valor a número
                      onChange={(e) => {
                        const value = e.target.value;
                        // Si el campo está vacío, pasamos 'undefined' para limpiarlo.
                        // Si no, convertimos el string a número usando Number()
                        field.onChange(value === '' ? undefined : Number(value));
                      }}
                      // 2. Aseguramos que si el valor es undefined/null, el input muestre un string vacío
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {/* 👆 FIN DEL CÓDIGO CORREGIDO 👆 */}
        </div>
        <FormField control={formControl} name="customer.declaresOtherPeople" render={({ field }) => (
          <FormItem className="space-y-3"><FormLabel>¿Declara a otras personas en sus impuestos?</FormLabel>
            <FormControl>
              <RadioGroup onValueChange={(value) => field.onChange(value === "true")} defaultValue={String(field.value)} className="flex items-center space-x-4">
                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="true" /></FormControl><FormLabel className="font-normal">Sí</FormLabel></FormItem>
                <FormItem className="flex items-center space-x-2 space-y-0"><FormControl><RadioGroupItem value="false" /></FormControl><FormLabel className="font-normal">No</FormLabel></FormItem>
              </RadioGroup>
            </FormControl><FormMessage />
          </FormItem>
        )} />
      </CardContent>
    </Card>
  );
}