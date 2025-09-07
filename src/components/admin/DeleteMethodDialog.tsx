// app/admin/metodos-pago/DeleteMethodDialog.tsx

"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash } from "lucide-react";
import { toast } from "sonner"; // MEJORA: Importar toast para notificaciones

interface DeleteMethodDialogProps {
  methodId: string;
  action: (prevState: any, formData: FormData) => Promise<{ success: boolean; message: string }>;
}

function DeleteButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="destructive" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Eliminando...
        </>
      ) : (
        "Sí, eliminar"
      )}
    </Button>
  );
}

export function DeleteMethodDialog({ methodId, action }: DeleteMethodDialogProps) {
  // MEJORA: Controlar la apertura y cierre del diálogo para cerrarlo tras una acción exitosa.
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(action, { success: false, message: "" });

  // MEJORA: Usar useEffect para mostrar notificaciones (toasts) como feedback.
  useEffect(() => {
    if (state.message) {
      if (state.success) {
        toast.success(state.message);
        setOpen(false); // Cierra el diálogo si la acción fue exitosa
      } else {
        toast.error(state.message);
      }
    }
  }, [state]);

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {/* MEJORA: Se cambia a size="icon" y variant="ghost" para consistencia */}
        <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10">
          <Trash className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción es irreversible. El método de pago se eliminará permanentemente de tu base de datos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {/* MEJORA: El form ahora envuelve el footer para una estructura más semántica */}
        <form action={formAction}>
          <input type="hidden" name="id" value={methodId} />
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction asChild>
              <DeleteButton />
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}