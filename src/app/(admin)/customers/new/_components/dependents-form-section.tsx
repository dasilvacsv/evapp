'use client';

import { Control, useFieldArray, UseFormSetValue } from "react-hook-form";
import { FullApplicationFormData } from "../../schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
// Importa el nuevo componente que creaste
import { DependentItem } from "./DependentItem"; // Asegúrate que la ruta sea correcta

interface Props {
  formControl: Control<FullApplicationFormData>;
  setFormValue: UseFormSetValue<FullApplicationFormData>;
}

export default function DependentsFormSection({ formControl, setFormValue }: Props) {
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
        {/* El .map() ahora es mucho más simple */}
        {fields.map((field, index) => (
          <DependentItem
            key={field.id}
            fieldId={field.id}
            control={formControl}
            index={index}
            remove={remove}
            setFormValue={setFormValue}
          />
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
            immigrationStatusOther: '',
            appliesToPolicy: true,
            documents: []
          })}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Dependiente
        </Button>
      </CardContent>
    </Card>
  );
}