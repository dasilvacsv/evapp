// (admin)/customers/new/_components/dependents-form-section.tsx

'use client';

import { Control, useFieldArray } from "react-hook-form";
import { FullApplicationFormData } from "../../schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { PlusCircle, Trash2 } from "lucide-react";
import FormDateInput from "./form-date-input"; // 👈 Importamos el nuevo componente de fecha

interface Props {
  formControl: Control<FullApplicationFormData>;
}

export default function DependentsFormSection({ formControl }: Props) {
  const { fields, append, remove } = useFieldArray({
    control: formControl,
    name: "dependents",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Dependientes</CardTitle>
        <CardDescription>
          Añade los dependientes que aplican a la póliza.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {fields.map((field, index) => (
          <div key={field.id} className="p-4 border rounded-lg space-y-4 relative bg-muted/50">
            <div className="flex justify-between items-center mb-2">
                <h4 className="font-semibold text-lg">Dependiente {index + 1}</h4>
                <Button type="button" variant="ghost" size="icon" className="hover:bg-destructive/10" onClick={() => remove(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={formControl}
                name={`dependents.${index}.fullName`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo*</FormLabel>
                    <FormControl><Input placeholder="Jane Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* 👇 CAMBIO: Parentesco ahora es un Select */}
              <FormField
                control={formControl}
                name={`dependents.${index}.relationship`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parentesco*</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un parentesco..." /></SelectTrigger></FormControl>
                        <SelectContent>
                            <SelectItem value="Cónyuge">Cónyuge</SelectItem>
                            <SelectItem value="Hijo/a">Hijo/a</SelectItem>
                            <SelectItem value="Padre/Madre">Padre/Madre</SelectItem>
                            <SelectItem value="Hermano/a">Hermano/a</SelectItem>
                            <SelectItem value="Otro">Otro</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* 👇 CAMBIO: Usamos el nuevo componente de fecha */}
              <FormField
                control={formControl}
                name={`dependents.${index}.birthDate`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Nacimiento*</FormLabel>
                    <FormControl>
                      <FormDateInput field={field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={formControl}
                name={`dependents.${index}.immigrationStatus`}
                render={({ field }) => (
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
                )}
              />
            </div>
            <FormField
                control={formControl}
                name={`dependents.${index}.appliesToPolicy`}
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>¿Aplica a la Póliza?</FormLabel>
                    <FormControl>
                        <RadioGroup
                        onValueChange={(value) => field.onChange(value === "true")}
                        defaultValue={String(field.value)}
                        className="flex items-center space-x-4 pt-2"
                        >
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="true" /></FormControl>
                            <FormLabel className="font-normal">Sí</FormLabel>
                        </FormItem>
                        <FormItem className="flex items-center space-x-2 space-y-0">
                            <FormControl><RadioGroupItem value="false" /></FormControl>
                            <FormLabel className="font-normal">No</FormLabel>
                        </FormItem>
                        </RadioGroup>
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          onClick={() => append({ 
            fullName: '', 
            relationship: '', 
            // @ts-ignore
            birthDate: undefined,
            immigrationStatus: undefined,
            appliesToPolicy: true 
          })}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Dependiente
        </Button>
      </CardContent>
    </Card>
  );
}