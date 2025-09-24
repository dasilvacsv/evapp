import { Control, UseFormSetValue, useWatch } from "react-hook-form";
import { FullApplicationFormData } from "../../schemas";
import { Button } from "@/components/ui/button";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";

interface DeclaredPersonItemProps {
  control: Control<FullApplicationFormData>;
  index: number;
  fieldId: string;
  remove: (index: number) => void;
  setFormValue: UseFormSetValue<FullApplicationFormData>;
}

export default function DeclaredPersonItem({ control, index, fieldId, remove, setFormValue }: DeclaredPersonItemProps) {
  const immigrationStatus = useWatch({
    control,
    name: `declaredPeople.${index}.immigrationStatus`
  });

  return (
    <div key={fieldId} className="p-4 border rounded-lg space-y-4 relative bg-muted/50">
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-semibold text-lg">Persona Declarada {index + 1}</h4>
        <Button type="button" variant="ghost" size="icon" className="hover:bg-destructive/10" onClick={() => remove(index)}>
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={control}
          name={`declaredPeople.${index}.fullName`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre Completo *</FormLabel>
              <FormControl>
                <Input 
                  placeholder="JUAN PÉREZ" 
                  {...field} 
                  className="uppercase"
                  onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name={`declaredPeople.${index}.relationship`}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Parentesco *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Selecciona un parentesco..." /></SelectTrigger></FormControl>
                  <SelectContent>
                      <SelectItem value="CÓNYUGE">Cónyuge</SelectItem>
                      <SelectItem value="HIJO/A">Hijo/a</SelectItem>
                      <SelectItem value="PADRE/MADRE">Padre/Madre</SelectItem>
                      <SelectItem value="HERMANO/A">Hermano/a</SelectItem>
                      <SelectItem value="ABUELO/A">Abuelo/a</SelectItem>
                      <SelectItem value="NIETO/A">Nieto/a</SelectItem>
                      <SelectItem value="TÍO/A">Tío/a</SelectItem>
                      <SelectItem value="SOBRINO/A">Sobrino/a</SelectItem>
                      <SelectItem value="PRIMO/A">Primo/a</SelectItem>
                      <SelectItem value="OTRO">Otro</SelectItem>
                  </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          control={control}
          name={`declaredPeople.${index}.immigrationStatus`}
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

        {immigrationStatus === 'other' && (
          <FormField
            control={control}
            name={`declaredPeople.${index}.immigrationStatusOther`}
            render={({ field }) => (
              <FormItem>
                <FormLabel>Especificar Estatus Migratorio *</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="Especifique el estatus..." 
                    {...field}
                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                    className="uppercase"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>
    </div>
  );
}