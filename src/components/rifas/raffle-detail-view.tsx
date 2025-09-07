"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Users, DollarSign, Ticket, Crown, Loader2, Edit, Receipt, Calendar as CalendarIcon, AlertCircle, AlertTriangle, Search, Star, ChevronDown, Phone, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { ImageCarousel } from './image-carousel';
import { StatusActions } from './status-actions';
import { EditRaffleForm } from './edit-raffle-form';
import { PurchaseDetailsModal } from './purchase-details-modal';
import { Button } from '@/components/ui/button';
import { drawWinnerAction, postponeRaffleAction } from '@/lib/actions';
import { useFormState } from 'react-dom';
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// --- Imports para las tablas de datos ---
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
  ColumnFiltersState,
  getSortedRowModel,
  SortingState,
} from "@tanstack/react-table";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// --- NUEVO: Imports para el Dialog y ScrollArea ---
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';


// --- TIPOS ---
type WinnerTicket = {
  id: string;
  ticketNumber: string;
  purchase: {
    buyerName: string | null;
    buyerEmail: string;
    // --- CAMBIO: Se añade el teléfono del comprador ---
    buyerPhone: string | null;
  } | null;
};

type Purchase = {
    id: string;
    status: 'pending' | 'confirmed' | 'rejected';
    buyerName: string | null;
    buyerEmail: string;
    ticketCount: number;
    amount: string;
    createdAt: Date;
};

type RaffleTicket = {
    id: string;
    ticketNumber: string;
    status: 'available' | 'reserved' | 'sold';
    purchaseId: string | null;
};

type RaffleWithRelations = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  currency: 'USD' | 'VES';
  minimumTickets: number;
  status: "active" | "finished" | "cancelled" | "draft" | "postponed";
  createdAt: Date;
  updatedAt: Date;
  limitDate: Date;
  winnerTicketId: string | null;
  winnerLotteryNumber: string | null;
  winnerProofUrl: string | null;
  winnerTicket?: WinnerTicket | null;
  images: { id: string; url: string; }[];
  purchases: Purchase[];
  tickets: RaffleTicket[];
};

type UnifiedTicketInfo = {
  id: string;
  ticketNumber: string;
  ticketStatus: 'available' | 'reserved' | 'sold';
  buyerName: string | null;
  buyerEmail: string | null;
  purchaseStatus: 'pending' | 'confirmed' | 'rejected' | null;
  purchase: Purchase | null;
};

type PurchaseWithTickets = Purchase & {
  ticketNumbers: string[];
};

type TopBuyer = {
    buyerName: string | null;
    buyerEmail: string;
    totalTickets: number;
};


// --- FUNCIONES Y COMPONENTES AUXILIARES ---

const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'confirmed': return <Badge className="bg-green-100 text-green-800">Confirmado</Badge>;
      case 'pending': return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'rejected': return <Badge className="bg-red-100 text-red-800">Rechazado</Badge>;
      default: return null;
    }
};

const getRaffleStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return <Badge className="bg-green-100 text-green-800 border-green-300">Activa</Badge>;
      case 'finished': return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Finalizada</Badge>;
      case 'cancelled': return <Badge className="bg-red-100 text-red-800 border-red-300">Cancelada</Badge>;
      case 'draft': return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Borrador</Badge>;
      case 'postponed': return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Pospuesta</Badge>;
      default: return <Badge variant="secondary">{status}</Badge>;
    }
};

// --- NUEVO COMPONENTE: Modal para ver todos los tickets ---
function TicketListModal({ ticketNumbers, buyerName }: { ticketNumbers: string[], buyerName: string | null }) {
  if (!ticketNumbers || ticketNumbers.length === 0) {
    return <span className="text-gray-400 italic">Sin asignar</span>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">Ver {ticketNumbers.length} ticket(s)</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tickets de {buyerName || 'Comprador'}</DialogTitle>
          <DialogDescription>
            Estos son todos los números asignados a esta venta.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-72 w-full rounded-md border p-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            {ticketNumbers.map(number => (
              <div key={number} className="font-mono p-2 bg-slate-100 rounded-md text-sm">
                {number}
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// --- Formulario de Ganador y Posponer (SIN CAMBIOS) ---
function DrawWinnerForm({ raffleId }: { raffleId: string }) {
    const [state, formAction] = useFormState(drawWinnerAction, { success: false, message: "" });
    const [isPending, setIsPending] = useState(false);
    const [showPostpone, setShowPostpone] = useState(false);

    useEffect(() => {
        if (state.message && !state.success && state.message.includes("no fue vendido o no existe")) {
        setShowPostpone(true);
        }
    }, [state]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsPending(true);
        const formData = new FormData(event.currentTarget);
        await formAction(formData);
        setIsPending(false);
    };

    return (
        <Card className="shadow-lg border-blue-200">
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-600">
            <Crown className="h-5 w-5" />
            {showPostpone ? 'Posponer Rifa' : 'Registrar Ganador'}
            </CardTitle>
            <CardDescription>
            {showPostpone
                ? 'El número ganador no fue vendido. Debes elegir una nueva fecha y hora para el sorteo.'
                : 'Ingresa el número ganador de la lotería y la imagen de prueba.'}
            </CardDescription>
        </CardHeader>
        <CardContent>
            {showPostpone ? (
            <PostponeRaffleForm raffleId={raffleId} />
            ) : (
            <>
                {state.message && !state.success && (
                <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{state.message}</AlertDescription>
                </Alert>
                )}
                <form onSubmit={handleSubmit} className="space-y-4">
                <input type="hidden" name="raffleId" value={raffleId} />
                <div>
                    <Label htmlFor="lotteryNumber">Número Ganador (4 dígitos)</Label>
                    <Input id="lotteryNumber" name="lotteryNumber" required maxLength={4} pattern="\d{4}" placeholder="Ej: 2444" className="mt-1" />
                </div>
                <div>
                    <Label htmlFor="winnerProof">Prueba del Sorteo (Imagen)</Label>
                    <Input id="winnerProof" name="winnerProof" type="file" required accept="image/*" className="mt-1" />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                    {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Confirmar Ganador
                </Button>
                </form>
            </>
            )}
        </CardContent>
        </Card>
    );
}
function PostponeRaffleForm({ raffleId }: { raffleId: string }) {
    const [state, formAction] = useFormState(postponeRaffleAction, { success: false, message: "" });
    const [date, setDate] = useState<Date | undefined>();
    const [hour, setHour] = useState('19');
    const [minute, setMinute] = useState('00');
    const [combinedDateTime, setCombinedDateTime] = useState<Date | null>(null);

    useEffect(() => {
        if (date) {
        const newDateTime = new Date(date);
        const validHour = Math.max(0, Math.min(23, parseInt(hour, 10) || 0));
        const validMinute = Math.max(0, Math.min(59, parseInt(minute, 10) || 0));
        newDateTime.setHours(validHour, validMinute, 0, 0);
        setCombinedDateTime(newDateTime);
        }
    }, [date, hour, minute]);

    return (
        <div className="pt-4">
        {state.message && (
            <Alert variant={state.success ? "default" : "destructive"} className="mb-4">
            <AlertDescription>{state.message}</AlertDescription>
            </Alert>
        )}
        <form action={formAction} className="space-y-4">
            <input type="hidden" name="raffleId" value={raffleId} />
            <input type="hidden" name="newLimitDate" value={combinedDateTime?.toISOString() || ''} />

            <div>
            <Label className='mb-2 block'>Nueva Fecha</Label>
            <Popover>
                <PopoverTrigger asChild>
                <Button
                    variant={"outline"}
                    className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP", { locale: es }) : <span>Selecciona una fecha</span>}
                </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    disabled={(day) => day < new Date(new Date().setDate(new Date().getDate() - 1))}
                />
                </PopoverContent>
            </Popover>
            </div>

            <div className="grid grid-cols-2 gap-2">
            <div>
                <Label htmlFor="hour">Hora (24h)</Label>
                <Input id="hour" type="number" value={hour} onChange={(e) => setHour(e.target.value)} min="0" max="23"/>
            </div>
            <div>
                <Label htmlFor="minute">Minutos</Label>
                <Input id="minute" type="number" value={minute} onChange={(e) => setMinute(e.target.value)} min="0" max="59"/>
            </div>
            </div>

            <Button type="submit" variant="outline" className="w-full" disabled={!combinedDateTime}>
            Confirmar Posposición
            </Button>
        </form>
        </div>
    );
}
function TopBuyersCard({ topBuyers }: { topBuyers: TopBuyer[] }) {
    if (topBuyers.length === 0) return null;

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Star className="h-5 w-5 text-yellow-500" /> Top Compradores
                </CardTitle>
                <CardDescription>Los 5 mayores compradores de tickets confirmados.</CardDescription>
            </CardHeader>
            <CardContent>
                <ul className="space-y-4">
                    {topBuyers.map((buyer, index) => (
                        <li key={`${buyer.buyerEmail}-${index}`} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className={`flex items-center justify-center h-8 w-8 rounded-full font-bold text-sm ${
                                    index === 0 ? 'bg-yellow-400 text-white' :
                                    index === 1 ? 'bg-gray-300 text-gray-700' :
                                    index === 2 ? 'bg-yellow-700 text-white' : 'bg-gray-100'
                                }`}>{index + 1}</span>
                                <div>
                                    <p className="font-semibold text-gray-800 truncate">{buyer.buyerName}</p>
                                    <p className="text-xs text-gray-500 truncate">{buyer.buyerEmail}</p>
                                </div>
                            </div>
                            <Badge variant="secondary" className="text-base">{buyer.totalTickets}</Badge>
                        </li>
                    ))}
                </ul>
            </CardContent>
        </Card>
    );
}

// --- TABLA DE TICKETS (SIN CAMBIOS FUNCIONALES) ---
const unifiedColumns: ColumnDef<UnifiedTicketInfo>[] = [
    { accessorKey: "ticketNumber", header: "Número", cell: ({ row }) => <div className="font-mono font-bold text-lg text-slate-800">{row.getValue("ticketNumber")}</div> },
    { accessorKey: "buyerName", header: "Comprador", cell: ({ row }) => {
        const ticket = row.original;
        if (!ticket.buyerName) { return <span className="text-gray-400 italic">Disponible</span>; }
        return ( <div><div className="font-medium">{ticket.buyerName}</div><div className="text-sm text-muted-foreground">{ticket.buyerEmail}</div></div>);
      }
    },
    { accessorKey: "purchaseStatus", header: "Estado Compra", cell: ({ row }) => getStatusBadge(row.getValue("purchaseStatus")),
      filterFn: (row, id, value) => {
        if (!value.length) return true;
        const status = row.getValue(id);
        const ticketStatus = row.original.ticketStatus;
        if(value.includes('available')) { return ticketStatus === 'available' || value.includes(status); }
        return value.includes(status);
      },
    },
    { id: "actions", header: "Acciones", cell: ({ row }) => {
        const ticket = row.original;
        if (ticket.purchase) { return <PurchaseDetailsModal purchase={ticket.purchase as any} />; }
        return <span className="text-gray-400">-</span>;
      },
    },
];

function UnifiedDataTable({ data }: { data: UnifiedTicketInfo[] }) {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');

    const table = useReactTable({ data, columns: unifiedColumns, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(), onColumnFiltersChange: setColumnFilters, onGlobalFilterChange: setGlobalFilter, getFilteredRowModel: getFilteredRowModel(),
        state: { columnFilters, globalFilter },
        globalFilterFn: (row, columnId, filterValue) => {
            const ticketNumber = row.original.ticketNumber;
            const buyerName = row.original.buyerName?.toLowerCase();
            const buyerEmail = row.original.buyerEmail?.toLowerCase();
            const searchTerm = filterValue.toLowerCase();
            return ticketNumber.includes(searchTerm) || buyerName?.includes(searchTerm) || buyerEmail?.includes(searchTerm);
        },
    });

    const statusOptions = ['available', 'confirmed', 'pending', 'rejected'];

    return (
        <div>
            <div className="flex items-center py-4 gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar por ticket, nombre o email..." value={globalFilter ?? ''} onChange={(event) => setGlobalFilter(event.target.value)} className="pl-10"/>
                </div>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" className="ml-auto">Estado <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {statusOptions.map((status) => (
                            <DropdownMenuCheckboxItem key={status} className="capitalize" checked={table.getColumn("purchaseStatus")?.getFilterValue()?.includes(status) ?? false}
                                onCheckedChange={(value) => {
                                    const currentFilter = table.getColumn("purchaseStatus")?.getFilterValue() as string[] | undefined || [];
                                    const newFilter = value ? [...currentFilter, status] : currentFilter.filter(s => s !== status);
                                    table.getColumn("purchaseStatus")?.setFilterValue(newFilter.length ? newFilter : undefined);
                                }}
                            >
                                {status === 'confirmed' ? 'Confirmado' : status === 'pending' ? 'Pendiente' : status === 'rejected' ? 'Rechazado' : 'Disponible'}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>{table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                                    {row.getVisibleCells().map((cell) => (<TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>))}
                                </TableRow>
                            ))
                        ) : (<TableRow><TableCell colSpan={unifiedColumns.length} className="h-24 text-center">No se encontraron resultados.</TableCell></TableRow>)}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                 <div className="flex-1 text-sm text-muted-foreground">{table.getFilteredRowModel().rows.length} de {data.length} ticket(s).</div>
                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button>
            </div>
        </div>
    );
}


// --- TABLA DE VENTAS (MODIFICADA) ---
const salesColumns: ColumnDef<PurchaseWithTickets>[] = [
    { accessorKey: "buyerName", header: "Comprador", cell: ({ row }) => {
        const purchase = row.original;
        return (<div><div className="font-medium">{purchase.buyerName || 'N/A'}</div><div className="text-sm text-muted-foreground">{purchase.buyerEmail}</div></div>);
      },
    },
    { accessorKey: "status", header: "Estado", cell: ({ row }) => getStatusBadge(row.getValue("status")), filterFn: (row, id, value) => value.includes(row.getValue(id)), },
    { accessorKey: "ticketCount", header: "Tickets", cell: ({ row }) => <div className="text-center font-medium">{row.getValue("ticketCount")}</div> },
    {
      accessorKey: "ticketNumbers",
      header: "Números Asignados",
      cell: ({ row }) => {
        const purchase = row.original;
        // --- CAMBIO: Usar el nuevo componente de Modal ---
        return <TicketListModal ticketNumbers={purchase.ticketNumbers} buyerName={purchase.buyerName} />;
      },
    },
    { id: "actions", header: "Acciones", cell: ({ row }) => { const purchase = row.original; return <PurchaseDetailsModal purchase={purchase as any} />; }, },
];

function SalesDataTable({ data }: { data: PurchaseWithTickets[] }) {
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState<SortingState>([]);

    const table = useReactTable({ data, columns: salesColumns, getCoreRowModel: getCoreRowModel(), getPaginationRowModel: getPaginationRowModel(), onColumnFiltersChange: setColumnFilters, onGlobalFilterChange: setGlobalFilter, getFilteredRowModel: getFilteredRowModel(), onSortingChange: setSorting, getSortedRowModel: getSortedRowModel(),
        state: { sorting, columnFilters, globalFilter },
         globalFilterFn: (row, columnId, filterValue) => {
            const buyerName = row.original.buyerName?.toLowerCase();
            const buyerEmail = row.original.buyerEmail?.toLowerCase();
            const searchTerm = filterValue.toLowerCase();
            return buyerName?.includes(searchTerm) || buyerEmail?.includes(searchTerm);
        },
    });

    const statusOptions = ['confirmed', 'pending', 'rejected'];

    return (
        <div>
            <div className="flex items-center py-4 gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Buscar por nombre o email del comprador..." value={globalFilter ?? ''} onChange={(event) => setGlobalFilter(event.target.value)} className="pl-10"/>
                </div>
                 <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" className="ml-auto">Estado <ChevronDown className="ml-2 h-4 w-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        {statusOptions.map((status) => (
                            <DropdownMenuCheckboxItem key={status} className="capitalize" checked={table.getColumn("status")?.getFilterValue()?.includes(status) ?? false}
                                onCheckedChange={(value) => {
                                    const currentFilter = table.getColumn("status")?.getFilterValue() as string[] | undefined || [];
                                    const newFilter = value ? [...currentFilter, status] : currentFilter.filter(s => s !== status);
                                    table.getColumn("status")?.setFilterValue(newFilter.length ? newFilter : undefined);
                                }}
                            >
                                {status === 'confirmed' ? 'Confirmado' : status === 'pending' ? 'Pendiente' : 'Rechazado'}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            <div className="rounded-md border">
                <Table>
                    <TableHeader>{table.getHeaderGroups().map(hg => <TableRow key={hg.id}>{hg.headers.map(h => <TableHead key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</TableHead>)}</TableRow>)}</TableHeader>
                    <TableBody>
                        {table.getRowModel().rows?.length ? (
                            table.getRowModel().rows.map((row) => (
                                <TableRow key={row.id}>{row.getVisibleCells().map((cell) => <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>)}</TableRow>
                            ))
                        ) : (<TableRow><TableCell colSpan={salesColumns.length} className="h-24 text-center">No se encontraron ventas.</TableCell></TableRow>)}
                    </TableBody>
                </Table>
            </div>
            <div className="flex items-center justify-end space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">{table.getFilteredRowModel().rows.length} de {data.length} venta(s).</div>
                <Button variant="outline" size="sm" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Anterior</Button>
                <Button variant="outline" size="sm" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Siguiente</Button>
            </div>
        </div>
    );
}


// --- COMPONENTE PRINCIPAL ---
export function RaffleDetailView({
    initialRaffle,
    topBuyers
}: {
    initialRaffle: RaffleWithRelations;
    topBuyers: TopBuyer[];
}) {
  const [isEditing, setIsEditing] = useState(false);
  const raffle = initialRaffle;

  const isDrawDay = new Date(raffle.limitDate) <= new Date() && raffle.status === 'active';
  const ticketsSoldCount = raffle.tickets.filter(t => t.status === 'sold').length;

  const confirmedRevenue = raffle.purchases
    .filter(p => p.status === 'confirmed')
    .reduce((sum, purchase) => sum + parseFloat(purchase.amount), 0);

  const formatCurrency = (amount: number | string, currency: 'USD' | 'VES') => {
    const value = typeof amount === 'string' ? parseFloat(amount) : amount;
    return currency === 'USD' ? `$${value.toFixed(2)}` : `Bs. ${value.toFixed(2)}`;
  };

  const stats = [
    { title: "Total Compras", value: raffle.purchases.length, icon: Users },
    { title: "Tickets Vendidos", value: ticketsSoldCount.toLocaleString(), icon: Ticket },
    { title: "Ingresos Confirmados", value: formatCurrency(confirmedRevenue, raffle.currency), icon: DollarSign, color: "text-blue-600" },
    { title: "Fecha del Sorteo", value: new Date(raffle.limitDate).toLocaleString('es-VE'), icon: CalendarIcon },
  ];

  const unifiedTicketsData = useMemo(() => {
    const purchasesMap = new Map(raffle.purchases.map(p => [p.id, p]));
    return raffle.tickets.map(ticket => {
        const purchase = ticket.purchaseId ? purchasesMap.get(ticket.purchaseId) : null;
        return {
            id: ticket.id, ticketNumber: ticket.ticketNumber, ticketStatus: ticket.status,
            buyerName: purchase?.buyerName ?? null, buyerEmail: purchase?.buyerEmail ?? null,
            purchaseStatus: purchase?.status ?? null, purchase: purchase,
        }
    });
  }, [raffle.tickets, raffle.purchases]);

  const purchasesWithTicketsData = useMemo(() => {
      const ticketsByPurchaseId = raffle.tickets.reduce<Record<string, string[]>>((acc, ticket) => {
          if (ticket.purchaseId) {
              if (!acc[ticket.purchaseId]) { acc[ticket.purchaseId] = []; }
              acc[ticket.purchaseId].push(ticket.ticketNumber);
          }
          return acc;
      }, {});

      return raffle.purchases
          .map(purchase => ({ ...purchase, ticketNumbers: ticketsByPurchaseId[purchase.id]?.sort((a,b) => a.localeCompare(b, undefined, {numeric: true})) || [] }))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [raffle.purchases, raffle.tickets]);

  if (isEditing) {
    return <EditRaffleForm raffle={raffle} onCancel={() => setIsEditing(false)} />;
  }

  return (
    <div className="bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8 md:py-12">
        <Link href="/rifas" className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Volver a todas las rifas
        </Link>

        <div className="mt-8 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
                <div className="flex items-center gap-2"><h1 className="text-3xl font-bold text-gray-900">{raffle.name}</h1>{getRaffleStatusBadge(raffle.status)}</div>
                <p className="text-gray-600">Detalles y gestión de la rifa.</p>
            </div>
            <div className="flex items-center gap-2">
                {raffle.status === 'draft' && (<Button variant="outline" size="sm" onClick={() => setIsEditing(true)}><Edit className="h-4 w-4 mr-1" /> Editar</Button>)}
                <StatusActions raffle={raffle} />
            </div>
        </div>

        {isDrawDay && (
            <Alert variant="default" className="mb-8 bg-yellow-100 border-yellow-300 text-yellow-800">
                <AlertTriangle className="h-5 w-5" />
                <AlertTitle className="font-bold">¡Es Día del Sorteo!</AlertTitle>
                <AlertDescription>La fecha límite para esta rifa ha llegado. El siguiente paso es <strong>finalizar la rifa</strong> para detener la venta de tickets y poder registrar al ganador.</AlertDescription>
            </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <ImageCarousel images={raffle.images} />
            <Card className="w-full">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-2xl"><Ticket className="h-6 w-6" /> Gestión de la Rifa</CardTitle>
                    <CardDescription>Visualiza los datos por tickets individuales o por ventas consolidadas.</CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="tickets" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="tickets">Lista de Tickets</TabsTrigger>
                      <TabsTrigger value="ventas">Lista de Ventas</TabsTrigger>
                    </TabsList>
                    <TabsContent value="tickets"><UnifiedDataTable data={unifiedTicketsData} /></TabsContent>
                    <TabsContent value="ventas"><SalesDataTable data={purchasesWithTicketsData} /></TabsContent>
                  </Tabs>
                </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1 space-y-6 lg:sticky lg:top-8 self-start">
            <Card className="shadow-lg">
                <CardHeader><CardTitle>Estadísticas</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    {stats.map((stat) => (
                    <div key={stat.title} className="p-4 bg-gray-50 rounded-lg border">
                        <stat.icon className="h-5 w-5 text-gray-500 mb-2" />
                        <p className="text-xs text-gray-600">{stat.title}</p>
                        <p className={`text-xl font-bold ${stat.color || 'text-gray-900'}`}>{stat.value}</p>
                    </div>
                    ))}
                </CardContent>
            </Card>
            <TopBuyersCard topBuyers={topBuyers} />

            {/* ============================================================= */}
            {/* === INICIO DEL BLOQUE DE CÓDIGO ACTUALIZADO PARA EL GANADOR === */}
            {/* ============================================================= */}
            {raffle.status === 'finished' && (
              <Card className="shadow-lg">
                <CardHeader><CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-yellow-500" />{raffle.winnerTicketId ? 'Ganador' : 'Sorteo'}</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm">
                  {raffle.winnerTicketId && raffle.winnerTicket ? (
                    <div className="space-y-4">
                      <div><Label>Número Sorteado</Label><p className="text-2xl font-bold">{raffle.winnerLotteryNumber}</p></div>

                      {/* --- Datos del Ganador con Teléfono y WhatsApp --- */}
                      <div>
                        <Label>Ganador</Label>
                        <p className="font-semibold text-lg">{raffle.winnerTicket?.purchase?.buyerName ?? "Sin nombre"}</p>
                        <p className="text-sm text-gray-600">{raffle.winnerTicket?.purchase?.buyerEmail}</p>

                        {/* Se muestra solo si existe el número de teléfono */}
                        {raffle.winnerTicket?.purchase?.buyerPhone && (
                            <>
                                <a href={`tel:${raffle.winnerTicket.purchase.buyerPhone}`} className="flex items-center gap-2 mt-2 text-sm text-blue-600 hover:underline">
                                    <Phone className="h-4 w-4" />
                                    {raffle.winnerTicket.purchase.buyerPhone}
                                </a>
                                <a href={`https://wa.me/${raffle.winnerTicket.purchase.buyerPhone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-1 text-sm text-green-600 hover:underline">
                                    <MessageSquare className="h-4 w-4" />
                                    Enviar WhatsApp
                                </a>
                            </>
                        )}
                      </div>

                      {raffle.winnerProofUrl && (
                        <div><Label>Prueba del Sorteo</Label><a href={raffle.winnerProofUrl} target="_blank" rel="noopener noreferrer"><Image src={raffle.winnerProofUrl} alt="Prueba del sorteo" width={400} height={200} className="rounded-md object-cover mt-1 border" /></a></div>
                      )}
                    </div>
                  ) : (<DrawWinnerForm raffleId={raffle.id} />)}
                </CardContent>
              </Card>
            )}
            {/* =========================================================== */}
            {/* === FIN DEL BLOQUE DE CÓDIGO ACTUALIZADO PARA EL GANADOR === */}
            {/* =========================================================== */}

            <Card className="shadow-lg">
                <CardHeader><CardTitle>Información</CardTitle></CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div><p className="font-semibold text-gray-800">Precio por Ticket</p><p className="text-blue-600 font-bold text-lg">{formatCurrency(raffle.price, raffle.currency)}</p></div>
                    <div><p className="font-semibold text-gray-800">Tickets Mínimos</p><p>{raffle.minimumTickets.toLocaleString()}</p></div>
                    <div><p className="font-semibold text-gray-800">Descripción</p><p className="text-gray-600">{raffle.description || 'Sin descripción.'}</p></div>
                </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}