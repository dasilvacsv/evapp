'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
} from '@/components/ui/alert-dialog';
import { LockOpen, Loader2 } from 'lucide-react';
import { enableEditingForPolicy } from '../actions';
import { toast } from 'sonner';

interface EnableEditingButtonProps {
    policyId: string;
}

export default function EnableEditingButton({ policyId }: EnableEditingButtonProps) {
    const [loading, setLoading] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleConfirm = async () => {
        setLoading(true);
        try {
            const result = await enableEditingForPolicy(policyId);
            if (result.success) {
                toast.success(result.message);
                setIsDialogOpen(false); // Cierra el diálogo si la operación es exitosa
            } else {
                toast.error(result.message);
            }
        } catch (error) {
            toast.error('Ocurrió un error inesperado.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <AlertDialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <AlertDialogTrigger asChild>
                <Button variant="secondary">
                     {/* FIX: Se envuelven el icono y el texto en un único span para solucionar el error. */}
                     <span className="flex items-center">
                        <LockOpen className="mr-2 h-4 w-4" />
                        Habilitar Edición
                     </span>
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>¿Estás seguro de que quieres continuar?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Al habilitar la edición, el estado de la póliza cambiará a "En Revisión". Esta acción no se puede deshacer.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleConfirm} disabled={loading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmar
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
