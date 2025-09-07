// src/components/RaffleDetailClient.tsx (Diseño "Stardust")

'use client'

import { useState, memo, useEffect } from 'react';
import { BuyTicketsForm } from '@/components/forms/BuyTicketsForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';
import Image from 'next/image';
import { 
    ArrowLeft, DollarSign, Ticket, Trophy, AlertCircle, 
    Sparkles, ChevronLeft, ChevronRight, Gift, Clock, X, CheckCircle, Star
} from 'lucide-react';

// --- INTERFACES (Sin cambios) ---
interface PaymentMethod {
    id: string;
    title: string;
    isActive: boolean;
    accountHolderName?: string | null;
    rif?: string | null;
    phoneNumber?: string | null;
    bankName?: string | null;
    accountNumber?: string | null;
}
interface RaffleImage {
    id: string;
    url: string;
}
interface Purchase {
    id: string;
    buyerName: string;
    buyerEmail: string;
}
interface WinnerTicket {
    id: string;
    ticketNumber: string;
    purchase: Purchase;
}
interface Raffle {
    id: string;
    name: string;
    description: string | null;
    price: string;
    currency: 'USD' | 'VES';
    minimumTickets: number;
    status: 'active' | 'finished' | 'cancelled' | 'postponed';
    limitDate: Date;
    winnerLotteryNumber: string | null;
    winnerProofUrl: string | null;
    winnerTicketId: string | null;
    images: RaffleImage[];
    winnerTicket: WinnerTicket | null;
}
interface RaffleDetailClientProps {
    raffle: Raffle;
    paymentMethods: PaymentMethod[];
    ticketsTakenCount: number;
}

// --- UTILIDADES (Sin cambios) ---
const formatCurrency = (amount: string, currency: 'USD' | 'VES') => {
    const value = parseFloat(amount);
    if (isNaN(value)) return currency === 'USD' ? '$0.00' : 'Bs. 0,00';
    return currency === 'USD' 
        ? `$${value.toFixed(2)}` 
        : `Bs. ${new Intl.NumberFormat('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}`;
};

// --- ESTILOS GLOBALES PARA ANIMACIONES ---
const GlobalStyles = memo(function GlobalStyles() {
    return (
      <style jsx global>{`
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scale-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        @keyframes border-spin {
            from { transform: translate(-50%, -50%) rotate(0deg); }
            to { transform: translate(-50%, -50%) rotate(360deg); }
        }
    
        .fade-in-anim { animation: fade-in 0.3s ease-out forwards; }
        .scale-in-anim { animation: scale-in 0.3s ease-out forwards; }
        .blob-anim { animation: blob 7s infinite; }
        .animation-delay-4000 { animation-delay: 4s; }
    
        .animated-border::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 150%;
            height: 150%;
            background: conic-gradient(from 0deg, transparent 70%, #8b5cf6, #ec4899, transparent 100%);
            animation: border-spin 5s linear infinite;
            z-index: -1;
        }
        .animated-border-winner::before {
            content: '';
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 150%;
            height: 150%;
            background: conic-gradient(from 0deg, transparent 70%, #f59e0b, #fbbf24, transparent 100%);
            animation: border-spin 5s linear infinite;
            z-index: -1;
        }
      `}</style>
    );
});


// --- COMPONENTES AUXILIARES REFACTORIZADOS ---

const RaffleImagesCarousel = memo(function RaffleImagesCarousel({ images, raffleName }: { images: RaffleImage[], raffleName: string }) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const handleNext = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setCurrentIndex((prev) => (prev + 1) % images.length); };
    const handlePrev = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setCurrentIndex((prev) => (prev - 1 + images.length) % images.length); };
    
    if (!images || images.length === 0) {
        return <div className="aspect-video w-full bg-black/20 flex items-center justify-center rounded-xl"><Gift className="h-16 w-16 text-white/10"/></div>;
    }

    return (
        <div className="relative group/carousel aspect-video w-full overflow-hidden rounded-xl shadow-lg">
            <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${currentIndex * 100}%)` }}>
                {images.map(image => (
                    <div key={image.id} className="relative w-full flex-shrink-0 aspect-video">
                        <Image src={image.url} alt={raffleName} fill className="object-cover transition-transform duration-500 group-hover/carousel:scale-110"/>
                    </div>
                ))}
            </div>
            {images.length > 1 && (<>
                <Button variant="ghost" size="icon" className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 text-white hover:bg-black/70 backdrop-blur-sm transition-all duration-300 z-20 opacity-0 group-hover/carousel:opacity-100" onClick={handlePrev}><ChevronLeft className="h-6 w-6" /></Button>
                <Button variant="ghost" size="icon" className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 rounded-full bg-black/40 text-white hover:bg-black/70 backdrop-blur-sm transition-all duration-300 z-20 opacity-0 group-hover/carousel:opacity-100" onClick={handleNext}><ChevronRight className="h-6 w-6" /></Button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
                    {images.map((_, i) => (
                        <button key={i} onClick={(e) => {e.preventDefault(); e.stopPropagation(); setCurrentIndex(i);}} className={`h-1.5 w-6 rounded-full transition-all duration-300 ${currentIndex === i ? 'bg-white w-8' : 'bg-white/40'}`}></button>
                    ))}
                </div>
            </>)}
        </div>
    );
});

const ProofOfWinModal = memo(function ProofOfWinModal({ imageUrl, onClose }: { imageUrl: string | null, onClose: () => void }) {
    if (!imageUrl) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 fade-in-anim" onClick={onClose}>
            <div className="relative max-w-4xl max-h-[95vh] scale-in-anim" onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="absolute -top-4 -right-4 h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20 z-10 border border-white/10" onClick={onClose}>
                    <X className="h-6 w-6" />
                </Button>
                <Image src={imageUrl} alt="Prueba del ganador" width={1600} height={1000} className="object-contain rounded-xl shadow-2xl shadow-black/70 border border-zinc-700 max-h-[90vh] w-auto" />
            </div>
        </div>
    );
});

const WinnerDisplayCard = memo(function WinnerDisplayCard({ raffle, onShowProof }: { raffle: Raffle, onShowProof: (url: string) => void }) {
    if (!raffle.winnerTicket) return null;
    return (
        <div className="group relative rounded-2xl p-px overflow-hidden animated-border-winner">
            <Card className="relative bg-zinc-900/80 backdrop-blur-md border-none rounded-[15px] overflow-hidden shadow-2xl shadow-black/40">
                <CardHeader className="p-6 text-center">
                    <Trophy className="h-16 w-16 mx-auto text-amber-400 drop-shadow-[0_2px_8px_rgba(251,191,36,0.6)]" />
                    <CardTitle className="text-3xl font-bold text-white mt-4">¡Rifa Finalizada!</CardTitle>
                    <p className="text-amber-400/80 mt-1">Felicidades al ganador</p>
                </CardHeader>
                <CardContent className="p-6 pt-2 space-y-6">
                    <div className="text-center">
                        <p className="text-4xl font-extrabold mt-1 leading-tight drop-shadow-md bg-clip-text text-transparent bg-gradient-to-br from-amber-200 to-yellow-400">
                            {raffle.winnerTicket.purchase.buyerName}
                        </p>
                        <p className="text-zinc-400 text-sm">{raffle.winnerTicket.purchase.buyerEmail}</p>
                    </div>
                    <div className="bg-black/30 border border-amber-500/20 rounded-xl p-3 text-center">
                        <span className="text-xs text-zinc-400 block mb-1">Ticket Ganador</span>
                        <p className="text-4xl font-mono tracking-wider text-amber-300 font-bold">{raffle.winnerTicket.ticketNumber}</p>
                    </div>
                    {raffle.winnerProofUrl && (
                        <Button className="w-full bg-white/5 hover:bg-white/10 text-white font-bold rounded-lg border border-white/10 py-6 text-base" onClick={() => onShowProof(raffle.winnerProofUrl!)}>
                            <CheckCircle className="h-5 w-5 mr-2" /> Ver Prueba del Sorteo
                        </Button>
                    )}
                </CardContent>
            </Card>
        </div>
    );
});

const CountdownTimer = memo(function CountdownTimer({ targetDate }: { targetDate: Date }) {
    const [hasMounted, setHasMounted] = useState(false);
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    // ✅ CAMBIO: Nuevo estado para controlar si el contador ha llegado a 0.
    const [isFinished, setIsFinished] = useState(false);

    useEffect(() => { setHasMounted(true); }, []);

    useEffect(() => {
        if (hasMounted) {
            const calculateTime = () => {
                const difference = +new Date(targetDate) - +new Date();
                if (difference > 0) {
                    setTimeLeft({
                        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                        minutes: Math.floor((difference / 1000 / 60) % 60),
                        seconds: Math.floor((difference / 1000) % 60),
                    });
                } else {
                    // ✅ CAMBIO: Si el contador llega a 0, establece isFinished a true.
                    setIsFinished(true);
                    setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                }
            };
            calculateTime();
            const timer = setInterval(calculateTime, 1000);
            return () => clearInterval(timer);
        }
    }, [hasMounted, targetDate]);

    const timeUnits = hasMounted ? timeLeft : { days: 0, hours: 0, minutes: 0, seconds: 0 };
    // ✅ CAMBIO: Usa el estado isFinished para determinar qué renderizar.
    const hasEnded = isFinished;

    return (
        <div className="flex items-center gap-3 font-mono">
            <Clock className="h-6 w-6 text-amber-400 flex-shrink-0" />
            <div className="flex items-end gap-3 min-h-[28px] text-zinc-400">
                {hasEnded ? (
                    // ✅ CAMBIO: Contenedor para el mensaje con el mismo tamaño que los números para evitar saltos.
                    <div className="flex-grow flex items-center justify-center h-[36px]">
                        <p className="text-lg font-bold text-amber-400 animate-pulse">¡El sorteo está por iniciar!</p>
                    </div>
                ) : hasMounted ? (
                    <>
                        {timeUnits.days > 0 && (
                            <div className="flex items-end leading-none">
                                <span className="text-3xl font-bold text-white">{String(timeUnits.days).padStart(2, '0')}</span>
                                <span className="text-zinc-500 ml-1.5 mb-0.5 text-sm">d</span>
                            </div>
                        )}
                        <span className="text-3xl font-bold text-white">{String(timeUnits.hours).padStart(2, '0')}</span>
                        <span className="text-zinc-500 text-3xl -mx-1.5">:</span>
                        <span className="text-3xl font-bold text-white">{String(timeUnits.minutes).padStart(2, '0')}</span>
                        <span className="text-zinc-500 text-3xl -mx-1.5">:</span>
                        <span className="text-3xl font-bold text-amber-400">{String(timeUnits.seconds).padStart(2, '0')}</span>
                    </>
                ) : (
                    <>
                        <span className="text-3xl font-bold text-white">--</span>
                        <span className="text-zinc-500 text-3xl -mx-1.5">:</span>
                        <span className="text-3xl font-bold text-white">--</span>
                        <span className="text-zinc-500 text-3xl -mx-1.5">:</span>
                        <span className="text-3xl font-bold text-amber-400">--</span>
                    </>
                )}
            </div>
        </div>
    );
});

const getStatusBadge = (status: Raffle['status']) => {
    switch (status) {
        case 'active':
            return <Badge className="bg-black/50 text-amber-300 font-semibold py-1.5 px-4 border border-amber-300/20 backdrop-blur-sm"><Sparkles className="h-4 w-4 mr-2 text-amber-400 animate-pulse" /> ¡EN VIVO!</Badge>;
        case 'finished':
            return <Badge className="bg-zinc-800 text-zinc-300 border border-zinc-700 py-1.5 px-3">Finalizada</Badge>;
        case 'cancelled':
            return <Badge variant="destructive" className="bg-red-900/50 text-red-400 border border-red-500/30 py-1.5 px-3">Cancelada</Badge>;
        default:
            return <Badge variant="secondary" className="py-1.5 px-3">{status}</Badge>;
    }
}


// --- COMPONENTE PRINCIPAL ---
export default function RaffleDetailClient({ raffle, paymentMethods, ticketsTakenCount }: RaffleDetailClientProps) {
    const progress = Math.min((ticketsTakenCount / raffle.minimumTickets) * 100, 100);
    const [proofModalUrl, setProofModalUrl] = useState<string | null>(null);

    return (
        <>
            <GlobalStyles />
            <div className="min-h-screen bg-zinc-950 text-white font-sans relative isolate overflow-hidden">
                <div className="absolute inset-0 -z-10 h-full w-full bg-zinc-950 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px]"></div>
                <div className="absolute -top-40 -left-40 w-[30rem] h-[30rem] bg-gradient-to-br from-amber-600/40 to-orange-600/20 rounded-full blur-3xl blob-anim -z-10"></div>
                <div className="absolute -bottom-40 -right-40 w-[30rem] h-[30rem] bg-gradient-to-br from-purple-600/30 to-indigo-600/20 rounded-full blur-3xl blob-anim animation-delay-4000 -z-10"></div>

                <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
                    <Link href="/" className="inline-flex items-center gap-2 text-zinc-400 hover:text-amber-400 mb-8 transition-colors text-sm group">
                        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                        Volver a todas las rifas
                    </Link>

                    <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
                        {/* --- Columna Izquierda: Detalles de la Rifa --- */}
                        <div className="lg:col-span-3 space-y-8">
                            <RaffleImagesCarousel images={raffle.images} raffleName={raffle.name} />
                            
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                    <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
                                        {raffle.name}
                                    </h1>
                                    <div className="flex-shrink-0 mt-1">{getStatusBadge(raffle.status)}</div>
                                </div>
                                {raffle.description && (
                                    <p className="text-zinc-300 text-lg leading-relaxed max-w-prose">{raffle.description}</p>
                                )}
                            </div>
                            
                            <div className="bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-xl p-6 space-y-5">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="font-bold text-white">Progreso de la Rifa</span>
                                        <span className="font-bold text-white">{progress.toFixed(0)}%</span>
                                    </div>
                                    <Progress value={progress} className="h-2.5 bg-white/10 rounded-full border border-white/10 overflow-hidden [&>div]:bg-gradient-to-r [&>div]:from-amber-400 [&>div]:to-orange-500" />
                                </div>
                                <CountdownTimer targetDate={raffle.limitDate} />
                            </div>
                        </div>

                        {/* --- Columna Derecha: Formulario o Ganador --- */}
                        <aside className="lg:col-span-2">
                            <div className="lg:sticky lg:top-8 space-y-8">
                                {raffle.status === 'finished' && raffle.winnerTicketId ? (
                                    <WinnerDisplayCard raffle={raffle} onShowProof={setProofModalUrl} />
                                ) : raffle.status === 'active' ? (
                                    <div className="group relative rounded-2xl p-px overflow-hidden animated-border">
                                        <Card className="relative bg-zinc-900/80 backdrop-blur-md border-none rounded-[15px] overflow-hidden">
                                            <CardHeader className="p-6 border-b border-white/10">
                                                <CardTitle className="text-2xl font-bold flex items-center gap-3 text-white">
                                                    <Ticket className="h-7 w-7 text-amber-400"/>
                                                    ¡Participa Ahora!
                                                </CardTitle>
                                                <div className="mt-4">
                                                    <p className="text-sm text-zinc-400">Precio por ticket</p>
                                                    <p className="text-4xl font-extrabold text-white">{formatCurrency(raffle.price, raffle.currency)}</p>
                                                </div>
                                            </CardHeader>
                                            <BuyTicketsForm raffle={raffle} paymentMethods={paymentMethods} />
                                        </Card>
                                    </div>
                                ) : (
                                    <Card className="bg-zinc-900/60 backdrop-blur-md border border-white/10">
                                        <CardContent className="p-6">
                                            <Alert variant="destructive" className="bg-transparent border-zinc-700 text-zinc-300">
                                                <AlertCircle className="h-5 w-5 text-amber-500" />
                                                <AlertDescription className="ml-2">
                                                    { raffle.status === 'finished' ? "Esta rifa ha finalizado. ¡Gracias por participar!" : "La compra de tickets no está disponible en este momento." }
                                                </AlertDescription>
                                            </Alert>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        </aside>
                    </div>
                </main>
            </div>
            {proofModalUrl && <ProofOfWinModal imageUrl={proofModalUrl} onClose={() => setProofModalUrl(null)} />}
        </>
    );
}