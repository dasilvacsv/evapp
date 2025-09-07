"use client";

import { useState, useMemo } from 'react';
import type { InferSelectModel } from 'drizzle-orm';
import { raffles, tickets, purchases, raffleImages } from '@/lib/db/schema';
import Link from 'next/link';
import Image from 'next/image';

// --- ICONS ---
import { Plus, Eye, ImageIcon, Ticket, DollarSign, Calendar, Crown, AlertTriangle, Search, Filter } from 'lucide-react';

// --- SHADCN/UI COMPONENTS ---
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

// --- TYPES ---
// Definimos un tipo preciso para los datos de la rifa que recibimos del servidor
type PurchaseWithBuyer = InferSelectModel<typeof purchases>;
type WinnerTicket = InferSelectModel<typeof tickets> & { purchase: PurchaseWithBuyer | null };
type RaffleWithDetails = InferSelectModel<typeof raffles> & {
  images: InferSelectModel<typeof raffleImages>[];
  tickets: { id: string }[];
  winnerTicket: WinnerTicket | null;
};

// --- HELPER FUNCTIONS ---

const getStatusBadge = (status: string) => {
    switch (status) {
        case 'active':
            return <Badge className="bg-green-100 text-green-800 border-green-300 hover:bg-green-100">Activa</Badge>;
        case 'finished':
            return <Badge className="bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-100">Finalizada</Badge>;
        case 'cancelled':
            return <Badge className="bg-red-100 text-red-800 border-red-300 hover:bg-red-100">Cancelada</Badge>;
        case 'draft':
            return <Badge className="bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-100">Borrador</Badge>;
        case 'postponed':
            return <Badge className="bg-orange-100 text-orange-800 border-orange-300 hover:bg-orange-100">Pospuesta</Badge>;
        default:
            return <Badge variant="secondary">{status}</Badge>;
    }
};

const formatCurrency = (amount: string, currency: 'USD' | 'VES' | null) => {
    const value = parseFloat(amount).toFixed(2);
    if (currency === 'VES') {
        return `Bs. ${value}`;
    }
    // Default to USD if currency is null or 'USD'
    return `$${value}`;
};


// --- OPTIONS FOR FILTERS ---
const statusOptions = [
    { value: 'all', label: 'Todos los estados' },
    { value: 'active', label: 'Activa' },
    { value: 'finished', label: 'Finalizada' },
    { value: 'draft', label: 'Borrador' },
    { value: 'cancelled', label: 'Cancelada' },
    { value: 'postponed', label: 'Pospuesta' },
];

export function RafflesDataTable({ initialRaffles }: { initialRaffles: RaffleWithDetails[] }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const filteredRaffles = useMemo(() => {
        return initialRaffles.filter(raffle => {
            const matchesSearch = raffle.name.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesStatus = statusFilter === 'all' || raffle.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [initialRaffles, searchTerm, statusFilter]);

    if (initialRaffles.length === 0) {
        return (
            <Card className="border-2 border-dashed">
                <CardContent className="flex flex-col items-center justify-center text-center p-16">
                    <div className="bg-gray-100 p-4 rounded-full mb-4">
                        <Ticket className="h-10 w-10 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-800 mb-2">Aún no tienes rifas</h3>
                    <p className="text-gray-500 mb-6 max-w-sm">¡No te preocupes! Crear tu primera rifa es muy fácil. Haz clic en el botón para empezar.</p>
                    <Link href="/rifas/nuevo">
                        <Button size="lg">
                            <Plus className="h-5 w-5 mr-2" />
                            Crear Mi Primera Rifa
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        );
    }
    
    return (
        <Card>
            <div className="flex flex-col md:flex-row items-center gap-4 p-4 border-b">
                <div className="relative w-full md:flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nombre de rifa..."
                        className="pl-9 w-full"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full md:w-auto">
                            <Filter className="h-4 w-4 mr-2" />
                            Filtrar por estado
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[200px]">
                        <DropdownMenuLabel>Selecciona un estado</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuRadioGroup value={statusFilter} onValueChange={setStatusFilter}>
                            {statusOptions.map(option => (
                                <DropdownMenuRadioItem key={option.value} value={option.value}>
                                    {option.label}
                                </DropdownMenuRadioItem>
                            ))}
                        </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {filteredRaffles.length > 0 ? (
                <>
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Rifa</TableHead>
                                    <TableHead>Estado</TableHead>
                                    <TableHead>Precio</TableHead>
                                    <TableHead>Fecha Sorteo</TableHead>
                                    <TableHead>Tickets Ocupados</TableHead>
                                    <TableHead className="text-right">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredRaffles.map((raffle) => {
                                    const isDrawDay = new Date(raffle.limitDate) <= new Date() && raffle.status === 'active';
                                    return (
                                        <TableRow key={raffle.id} className={isDrawDay ? 'bg-yellow-50' : ''}>
                                            <TableCell>
                                                <div className="flex items-center gap-4">
                                                    <div className="relative w-20 h-12 rounded-md overflow-hidden border bg-gray-50 flex-shrink-0">
                                                        {raffle.images.length > 0 ? (
                                                            <Image src={raffle.images[0].url} alt={raffle.name} fill className="object-cover" />
                                                        ) : (
                                                            <div className="flex h-full w-full items-center justify-center">
                                                                <ImageIcon className="h-6 w-6 text-gray-400" />
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-gray-900">{raffle.name}</div>
                                                        {raffle.winnerTicket?.purchase ? (
                                                            <div className="flex items-center gap-1.5 text-xs text-green-700 mt-1 font-semibold">
                                                                <Crown className="h-4 w-4" />
                                                                <span>Ganador: {raffle.winnerTicket.purchase.buyerName}</span>
                                                            </div>
                                                        ) : isDrawDay ? (
                                                            <Alert variant="default" className="mt-2 p-2 border-yellow-300 bg-yellow-100 text-yellow-800">
                                                                <div className="flex items-center gap-2">
                                                                    <AlertTriangle className="h-4 w-4" />
                                                                    <AlertDescription className="text-xs font-medium">¡Es día del sorteo!</AlertDescription>
                                                                </div>
                                                            </Alert>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getStatusBadge(raffle.status)}</TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-blue-600">
                                                    {formatCurrency(raffle.price, raffle.currency)}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                                    <Calendar className="h-4 w-4" />
                                                    {new Date(raffle.limitDate).toLocaleDateString('es-VE', {
                                                        year: 'numeric', month: 'short', day: 'numeric'
                                                    })}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium">{raffle.tickets.length.toLocaleString()}</span>
                                                <span className="text-muted-foreground"> / {raffle.minimumTickets.toLocaleString()}</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/rifas/${raffle.id}`}>
                                                    <Button variant="outline" size="sm">
                                                        <Eye className="h-4 w-4 mr-1.5" /> Gestionar
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:hidden gap-4 p-4">
                        {filteredRaffles.map((raffle) => {
                            const isDrawDay = new Date(raffle.limitDate) <= new Date() && raffle.status === 'active';
                            return (
                                <Card key={raffle.id} className={`flex flex-col justify-between overflow-hidden ${isDrawDay ? 'border-yellow-400 border-2' : ''}`}>
                                    <div>
                                        <CardHeader className="p-0">
                                            <div className="relative aspect-video w-full">
                                                {raffle.images.length > 0 ? (
                                                    <Image src={raffle.images[0].url} alt={raffle.name} fill className="object-cover" />
                                                ) : (
                                                    <div className="flex h-full w-full flex-col items-center justify-center bg-gray-100">
                                                        <ImageIcon className="h-12 w-12 text-gray-400" />
                                                    </div>
                                                )}
                                                <div className="absolute top-2 right-2">{getStatusBadge(raffle.status)}</div>
                                            </div>
                                            <div className="p-4 pb-2">
                                                <CardTitle className="text-lg">{raffle.name}</CardTitle>
                                                {raffle.winnerTicket?.purchase && (
                                                    <div className="flex items-center gap-1.5 text-xs text-green-700 mt-2 font-semibold bg-green-50 px-2 py-1 rounded-md border border-green-200">
                                                        <Crown className="h-4 w-4 flex-shrink-0" />
                                                        <span>
                                                            Ganador: {raffle.winnerTicket.purchase.buyerName}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4 px-4 pb-4">
                                            {isDrawDay && !raffle.winnerTicket?.purchase && (
                                                <Alert variant="default" className="p-2 border-yellow-300 bg-yellow-100 text-yellow-800">
                                                    <div className="flex items-center gap-2">
                                                        <AlertTriangle className="h-4 w-4" />
                                                        <AlertDescription className="text-xs">¡Hoy es el sorteo! Finaliza la rifa para registrar al ganador.</AlertDescription>
                                                    </div>
                                                </Alert>
                                            )}
                                            <div className="text-sm border-t pt-4 space-y-2.5">
                                                <div className="flex justify-between items-center">
                                                    <span className="flex items-center gap-2 text-gray-600"><Calendar className="h-4 w-4" />Fecha Sorteo:</span>
                                                    <span className="font-medium text-gray-900">{new Date(raffle.limitDate).toLocaleDateString('es-VE')}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="flex items-center gap-2 text-gray-600"><Ticket className="h-4 w-4" />Ocupados:</span>
                                                    <span className="font-bold text-gray-900">{raffle.tickets.length.toLocaleString()} / {raffle.minimumTickets.toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between items-center">
                                                    <span className="flex items-center gap-2 text-gray-600"><DollarSign className="h-4 w-4" />Precio:</span>
                                                    <span className="font-bold text-lg text-blue-600">{formatCurrency(raffle.price, raffle.currency)}</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </div>
                                    <CardFooter className="bg-gray-50 p-2 border-t">
                                        <Link href={`/rifas/${raffle.id}`} className="flex-1">
                                            <Button variant="outline" className="w-full">
                                                <Eye className="h-4 w-4 mr-2" /> Gestionar
                                            </Button>
                                        </Link>
                                    </CardFooter>
                                </Card>
                            );
                        })}
                    </div>
                </>
            ) : (
                <div className="text-center p-16">
                    <Search className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-xl font-semibold">No se encontraron rifas</h3>
                    <p className="mt-1 text-sm text-gray-500">Intenta ajustar tu búsqueda o filtros.</p>
                </div>
            )}
        </Card>
    );
}