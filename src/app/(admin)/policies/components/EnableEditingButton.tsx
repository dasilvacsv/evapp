// policies/components/EnableEditingButton.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LockOpen, Loader2 } from 'lucide-react';
import { enableEditingForPolicy } from '../actions';
import { toast } from 'sonner';

interface EnableEditingButtonProps {
    policyId: string;
}

export default function EnableEditingButton({ policyId }: EnableEditingButtonProps) {
    const [loading, setLoading] = useState(false);

    const handleEnableEditing = async () => {
        const confirmed = window.confirm(
            '¿Estás seguro de que quieres habilitar la edición para esta póliza? Su estado cambiará a "En Revisión".'
        );

        if (!confirmed) return;

        setLoading(true);
        try {
            const result = await enableEditingForPolicy(policyId);
            if (result.success) {
                toast.success(result.message);
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
        <Button onClick={handleEnableEditing} disabled={loading} variant="secondary">
            {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <LockOpen className="mr-2 h-4 w-4" />
            )}
            Habilitar Edición
        </Button>
    );
}