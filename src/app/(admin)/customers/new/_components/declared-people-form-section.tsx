'use client';

import { Control, UseFormSetValue, useFieldArray, useWatch } from "react-hook-form";
import { FullApplicationFormData } from "../../schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import DeclaredPersonItem from "./declared-person-item";

interface Props {
  formControl: Control<FullApplicationFormData>;
  setFormValue: UseFormSetValue<FullApplicationFormData>;
}

export default function DeclaredPeopleFormSection({ formControl, setFormValue }: Props) {
  const { fields, append, remove } = useFieldArray({
    control: formControl,
    name: "declaredPeople",
  });

  // Observar si el cliente declara a otras personas
  const declaresOtherPeople = useWatch({
    control: formControl,
    name: "customer.declaresOtherPeople",
  });

  if (!declaresOtherPeople) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>2. Personas Declaradas en Impuestos</CardTitle>
          <CardDescription>
            No hay personas declaradas. Para agregar personas, vuelve al paso anterior y selecciona "Sí" en "¿Declara a otras personas en sus impuestos?".
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>2. Personas Declaradas en Impuestos</CardTitle>
        <CardDescription>
          Añade las personas que el cliente declara en sus impuestos (diferentes a los dependientes para la póliza).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {fields.map((field, index) => (
          <DeclaredPersonItem
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
            immigrationStatus: undefined,
            immigrationStatusOther: '',
          })}
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          Añadir Persona Declarada
        </Button>
        
        {fields.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p className="mb-4">No has agregado ninguna persona declarada.</p>
            <p className="text-sm">Haz clic en "Añadir Persona Declarada" para comenzar.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}