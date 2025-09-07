'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

// Este componente envolverá el botón/enlace que abre el diálogo
export function AdminAuthDialog({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const router = useRouter();

    const handlePasswordCheck = () => {
        if (password === '2025') {
            setError('');
            setPassword('');
            setIsOpen(false);
            // Pequeño delay para que la animación de cierre se vea bien
            setTimeout(() => {
                router.push('/auth/login');
            }, 100);
        } else {
            setError('Contraseña incorrecta. Inténtalo de nuevo.');
            setPassword('');
        }
    };

    // Resetea el estado cuando el diálogo se cierra
    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setPassword('');
            setError('');
        }
        setIsOpen(open);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-zinc-950 border-zinc-800 text-white shadow-2xl shadow-amber-500/10">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <ShieldCheck className="h-6 w-6 text-amber-400" />
                        <DialogTitle className="text-amber-400 text-2xl font-bold tracking-tight">
                            Acceso de Administrador
                        </DialogTitle>
                    </div>
                    <DialogDescription className="text-zinc-400">
                        Por seguridad, debes ingresar la contraseña para acceder al panel de control.
                    </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                    <Input
                        id="password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handlePasswordCheck();
                        }}
                        placeholder="••••••••••"
                        className="bg-zinc-900 border-2 border-zinc-700 h-12 text-lg focus-visible:ring-amber-500 focus-visible:ring-offset-zinc-950 focus-visible:border-amber-500 text-white"
                    />
                    {error && (
                        <div className="flex items-center gap-2 text-sm text-red-400 bg-red-950/60 border border-red-500/30 rounded-lg p-3 animate-fade-in">
                            <ShieldAlert className="h-5 w-5 flex-shrink-0" />
                            <p>{error}</p>
                        </div>
                    )}
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsOpen(false)}
                        className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                    >
                        Cancelar
                    </Button>
                    <Button 
                        type="submit" 
                        onClick={handlePasswordCheck}
                        className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold transition-all transform hover:scale-105"
                    >
                        Ingresar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}