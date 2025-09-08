// (admin)/customers/[customerId]/_components/sensitive-data-section.tsx
'use client';

import { useState } from 'react';
import { revealSensitiveData } from '../../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, LockKeyhole } from 'lucide-react';
import { Customer } from '@/db/schema'; // Asume que tienes este tipo exportado

type DecryptedData = {
    ssn?: string;
    payment?: {
        cardHolderName: string;
        cardNumber: string;
        expirationDate: string;
        // ...otros campos
    };
};

export default function SensitiveDataSection({ customer }: { customer: Customer }) {
    const [decryptedData, setDecryptedData] = useState<DecryptedData | null>(null);
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    const handleReveal = async () => {
        setIsLoading(true);
        const result = await revealSensitiveData({ customerId: customer.id, password });
        
        if (result.success) {
            setDecryptedData(result.data);
            setIsRevealed(true);
            setIsDialogOpen(false);
            toast({ title: "Datos revelados con éxito." });
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
        setIsLoading(false);
        setPassword('');
    };
    
    return (
        <div className="space-y-2">
            <h3 className="font-semibold">Datos Sensibles</h3>
            <div className="p-4 border rounded-lg bg-muted/30">
                {/* --- SSN --- */}
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-sm font-medium">Seguro Social (SSN)</p>
                        <p className="font-mono text-lg">{isRevealed && decryptedData?.ssn ? decryptedData.ssn : '***-**-****'}</p>
                    </div>
                </div>

                {/* --- Botón para revelar todo --- */}
                {!isRevealed ? (
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild><Button className="mt-4"><Eye className="mr-2 h-4 w-4" />Revelar Datos</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Verificación de Administrador</DialogTitle></DialogHeader>
                            <div className="space-y-4 py-2">
                                <p className="text-sm text-muted-foreground">Introduce la contraseña de administrador para ver los datos sensibles.</p>
                                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña..." />
                            </div>
                            <DialogFooter>
                                <Button onClick={handleReveal} disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Desencriptar y Ver
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                ) : (
                    <Button className="mt-4" variant="secondary" onClick={() => setIsRevealed(false)}><EyeOff className="mr-2 h-4 w-4" />Ocultar Datos</Button>
                )}
            </div>
        </div>
    );
}