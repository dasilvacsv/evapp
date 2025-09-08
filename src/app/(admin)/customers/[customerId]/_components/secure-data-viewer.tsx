// (admin)/customers/[customerId]/_components/secure-data-viewer.tsx
'use client';

import { useState } from 'react';
import { revealSensitiveData } from '../../actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PaymentMethod } from '@/lib/types'; // Crearemos este archivo de tipos si no lo tienes

type DecryptedData = {
    cardHolderName: string;
    cardNumber: string;
    expirationDate: string;
    routingNumber?: string;
    accountNumber?: string;
};

export default function SecureDataViewer({ paymentMethods, customerId }: { paymentMethods: PaymentMethod[], customerId: string }) {
    const [decryptedData, setDecryptedData] = useState<Record<string, DecryptedData>>({});
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isRevealed, setIsRevealed] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const { toast } = useToast();

    const handleReveal = async () => {
        setIsLoading(true);
        const result = await revealSensitiveData({ customerId, password });
        
        if (result.success) {
            setDecryptedData(result.data || {});
            setIsRevealed(true);
            setIsDialogOpen(false);
            toast({ title: "Datos desencriptados con éxito." });
        } else {
            toast({ variant: "destructive", title: "Error", description: result.error });
        }
        setIsLoading(false);
        setPassword('');
    };

    if (paymentMethods.length === 0) {
        return (
            <Card>
                <CardHeader><CardTitle className="flex items-center"><LockKeyhole className="mr-2 h-5 w-5" />Método de Pago</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">No hay un método de pago registrado.</p></CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center">
                        <LockKeyhole className="mr-2 h-5 w-5 text-primary" />
                        Información de Pago
                    </div>
                    {isRevealed ? (
                        <Button variant="ghost" size="sm" onClick={() => setIsRevealed(false)}><EyeOff className="mr-2 h-4 w-4" />Ocultar</Button>
                    ) : (
                         <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                            <DialogTrigger asChild><Button size="sm"><Eye className="mr-2 h-4 w-4" />Revelar Datos</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>Verificación de Administrador</DialogTitle></DialogHeader>
                                <div className="space-y-4 py-2">
                                    <p className="text-sm text-muted-foreground">Introduce tu contraseña de administrador para ver los datos de pago encriptados.</p>
                                    <Input 
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Contraseña..."
                                    />
                                </div>
                                <DialogFooter>
                                    <Button onClick={handleReveal} disabled={isLoading}>
                                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Desencriptar y Ver
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </CardTitle>
                 <CardDescription>Los detalles están encriptados en la base de datos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                {paymentMethods.map(pm => (
                    <div key={pm.id} className="p-3 bg-muted/50 rounded-md">
                        <p className="font-semibold">{pm.cardBrand || pm.bankName || pm.methodType.replace('_', ' ')}</p>
                        <p className="text-sm text-muted-foreground">Terminada en •••• {pm.last4}</p>
                        {isRevealed && decryptedData[pm.id] && (
                            <div className="mt-2 pt-2 border-t font-mono text-xs space-y-1">
                                <p><strong>Titular:</strong> {decryptedData[pm.id].cardHolderName}</p>
                                <p><strong>Número:</strong> {decryptedData[pm.id].cardNumber}</p>
                                <p><strong>Expira:</strong> {decryptedData[pm.id].expirationDate}</p>
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}