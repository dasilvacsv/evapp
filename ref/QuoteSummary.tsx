"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { formatSaleCurrency, getBCVRate } from "@/lib/exchangeRates"
import { FileText, User, Stethoscope, ShoppingCart, CalendarDays, AlertCircle, Loader2, PawPrint, ShieldCheck, ShieldX, PackagePlus, Plus } from "lucide-react"
import { CreateProductDialog } from "./CreateProductDialog"
import { useToast } from "@/hooks/use-toast"

interface WorkflowData {
  clientId?: string
  clientName?: string
  petId?: string
  petName?: string
  veterinarianId?: string
  veterinarianName?: string
  diagnosis?: string
  recommendations?: string
  notes?: string
  items: Array<{
    inventoryItemId: string
    inventoryItemName: string
    quantity: number
    unitPrice: number
    totalPrice: number
    hasIva: boolean // NEW: IVA per item
  }>
}

interface QuoteSummaryProps {
  workflowData: WorkflowData
  onSubmit: () => void
  isSubmitting: boolean
  quoteId?: string
  onItemsChange?: (items: any[]) => void
}

function InfoRow({ icon: Icon, label, value, valueClassName, className }: { 
  icon?: React.ElementType, 
  label: string, 
  value: string | React.ReactNode, 
  valueClassName?: string, 
  className?: string 
}) {
  return (
    <div className={className}>
      <div className="flex items-center text-xs text-muted-foreground mb-0.5">
        {Icon && <Icon className="h-3.5 w-3.5 mr-1.5" />}
        {label}
      </div>
      <p className={`text-sm font-medium ${valueClassName || ''}`}>{value || "N/A"}</p>
    </div>
  )
}

export function QuoteSummary({ workflowData, onSubmit, isSubmitting, quoteId, onItemsChange }: QuoteSummaryProps) {
  const [bcvRate, setBcvRate] = useState<number>(0)
  const [bcvRateError, setBcvRateError] = useState<string | null>(null)
  const [createProductDialogOpen, setCreateProductDialogOpen] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const loadBcvRate = async () => {
      try {
        const rateInfo = await getBCVRate()
        if (typeof rateInfo.rate === 'number' && rateInfo.rate > 0) {
            setBcvRate(rateInfo.rate)
            setBcvRateError(null)
        } else {
            console.warn("Invalid BCV rate received:", rateInfo)
            setBcvRate(35.0)
            setBcvRateError("Tasa BCV no válida, usando tasa de respaldo.")
        }
      } catch (error) {
        console.error("Error loading BCV rate:", error)
        setBcvRate(35.0)
        setBcvRateError("Error al cargar tasa BCV, usando tasa de respaldo.")
      }
    }
    loadBcvRate()
  }, [])

  const handleProductCreated = (newProduct: any) => {
    if (onItemsChange) {
      // Agregar automáticamente al presupuesto
      const newItem = {
        inventoryItemId: newProduct.id,
        inventoryItemName: newProduct.name,
        quantity: 1,
        unitPrice: newProduct.sellingPrice,
        totalPrice: newProduct.sellingPrice,
        hasIva: newProduct.hasIva,
      };
      
      const updatedItems = [...workflowData.items, newItem];
      onItemsChange(updatedItems);
      
      toast({
        title: "¡Producto creado y agregado!",
        description: `${newProduct.name} ha sido creado y agregado al presupuesto.`,
        icon: <Plus className="h-5 w-5 text-green-500" />,
      });
    }
  }

  // NUEVA LÓGICA DE IVA: Calculate totals with IVA per item correctly
  const subtotalWithIva = workflowData.items.filter(item => item.hasIva).reduce((sum, item) => sum + item.totalPrice, 0)
  const subtotalWithoutIva = workflowData.items.filter(item => !item.hasIva).reduce((sum, item) => sum + item.totalPrice, 0)
  const taxRate = 0.16
  const tax = subtotalWithIva * taxRate
  const total = subtotalWithIva + subtotalWithoutIva + tax

  const formatBs = (amount: number) => {
    if (bcvRate <= 0) return "...";
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'VES',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount * bcvRate).replace('VES', 'Bs');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const today = new Date()
  const validUntil = new Date()
  validUntil.setDate(today.getDate() + 5)

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-8 animate-fadeIn">
      <div className="text-center md:text-left">
        <h1 className="text-2xl md:text-3xl font-bold text-primary flex items-center justify-center md:justify-start">
          <FileText className="h-8 w-8 mr-3" />
          Resumen del Presupuesto
        </h1>
        {quoteId && <p className="text-sm text-muted-foreground mt-1">Presupuesto ID: {quoteId}</p>}
         <p className="text-sm text-muted-foreground mt-1">Por favor, revisa todos los detalles antes de confirmar.</p>
      </div>

      <Separator />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-sm border-border/60 hover:shadow-md transition-all duration-200">
            <CardHeader className="bg-muted/20 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Cliente y Mascota
              </CardTitle>
              <CardDescription>Información del paciente y fechas relevantes.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              <InfoRow 
                icon={User} 
                label="Cliente" 
                value={workflowData.clientName || "No seleccionado"} 
                valueClassName="text-base font-semibold" 
              />
              <InfoRow 
                icon={PawPrint} 
                label="Mascota" 
                value={workflowData.petName || "No seleccionada"} 
              />
              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <InfoRow 
                  icon={CalendarDays} 
                  label="Fecha de Emisión" 
                  value={formatDate(today)} 
                />
                <InfoRow 
                  icon={CalendarDays} 
                  label="Válido Hasta" 
                  value={formatDate(validUntil)} 
                />
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-border/60 hover:shadow-md transition-all duration-200">
            <CardHeader className="bg-muted/20 pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Stethoscope className="h-5 w-5 text-primary" />
                Información Médica
              </CardTitle>
              <CardDescription>Detalles del diagnóstico y recomendaciones.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-5">
              {workflowData.veterinarianName && (
                <InfoRow label="Veterinario" value={workflowData.veterinarianName} />
              )}
              <InfoRow 
                label="Diagnóstico" 
                value={
                  <span className="whitespace-pre-wrap text-foreground">{workflowData.diagnosis || "No especificado"}</span>
                }
                className="p-3 bg-muted/30 rounded-md"
              />
              {workflowData.recommendations && (
                <InfoRow 
                  label="Recomendaciones" 
                  value={
                    <span className="whitespace-pre-wrap text-foreground">{workflowData.recommendations}</span>
                  }
                  className="p-3 bg-muted/30 rounded-md"
                />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm border-border/60 hover:shadow-md transition-all duration-200 h-full flex flex-col">
            <CardHeader className="bg-muted/20 pb-4">
              <CardTitle className="text-lg flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  Productos y Servicios
                </div>
                {onItemsChange && (
                  <Button
                    onClick={() => setCreateProductDialogOpen(true)}
                    size="sm"
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                  >
                    <PackagePlus className="h-4 w-4 mr-1" />
                    Nuevo Producto
                  </Button>
                )}
              </CardTitle>
              <CardDescription>Detalle de los items incluidos en el presupuesto.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow p-0">
              {workflowData.items.length > 0 ? (
                <div className="overflow-hidden">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/20 hover:bg-muted/20 border-b border-border/60">
                          <TableHead className="w-[35%] md:w-[40%]">Descripción</TableHead>
                          <TableHead className="text-center">Cant.</TableHead>
                          <TableHead className="text-right">P. Unit. ($)</TableHead>
                          <TableHead className="text-right">P. Unit. (Bs)</TableHead>
                          <TableHead className="text-center">IVA</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {workflowData.items.map((item) => (
                          <TableRow key={item.inventoryItemId} className="hover:bg-muted/20 transition-colors">
                            <TableCell className="font-medium text-sm py-3">{item.inventoryItemName}</TableCell>
                            <TableCell className="text-center py-3 text-sm">{item.quantity}</TableCell>
                            <TableCell className="text-right py-3 text-sm">{formatSaleCurrency(item.unitPrice, "USD")}</TableCell>
                            <TableCell className="text-right py-3 text-sm">{formatBs(item.unitPrice)}</TableCell>
                            <TableCell className="text-center py-3">
                              {item.hasIva ? (
                                <Badge variant="default" className="text-xs">
                                  <ShieldCheck className="h-3 w-3" />
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">
                                  <ShieldX className="h-3 w-3" />
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right py-3 text-sm font-semibold">{formatSaleCurrency(item.totalPrice, "USD")}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter className="text-sm bg-muted/10">
                        {subtotalWithIva > 0 && (
                          <TableRow className="hover:bg-muted/20">
                            <TableCell colSpan={5} className="py-2.5">Subtotal (con IVA)</TableCell>
                            <TableCell className="text-right py-2.5">{formatSaleCurrency(subtotalWithIva, "USD")}</TableCell>
                          </TableRow>
                        )}
                        {subtotalWithoutIva > 0 && (
                          <TableRow className="hover:bg-muted/20">
                            <TableCell colSpan={5} className="py-2.5">Subtotal (exento)</TableCell>
                            <TableCell className="text-right py-2.5">{formatSaleCurrency(subtotalWithoutIva, "USD")}</TableCell>
                          </TableRow>
                        )}
                        <TableRow className="hover:bg-muted/20">
                          <TableCell colSpan={5} className="py-2.5">
                            IVA (16%)
                          </TableCell>
                          <TableCell className="text-right py-2.5">
                            {formatSaleCurrency(tax, "USD")}
                          </TableCell>
                        </TableRow>
                        <TableRow className="text-base hover:bg-muted/20">
                          <TableCell colSpan={5} className="font-bold py-3 text-primary">Total USD</TableCell>
                          <TableCell className="text-right font-bold py-3 text-primary">{formatSaleCurrency(total, "USD")}</TableCell>
                        </TableRow>
                        {bcvRate > 0 && (
                          <TableRow className="bg-primary/5 hover:bg-primary/10 text-base transition-colors">
                            <TableCell colSpan={5} className="font-bold text-primary py-3">
                              Total Bs <span className="text-xs font-normal">(Tasa: {bcvRate.toFixed(2)})</span>
                            </TableCell>
                            <TableCell className="text-right font-bold text-primary py-3">
                              {formatBs(total)}
                            </TableCell>
                          </TableRow>
                        )}
                      </TableFooter>
                    </Table>
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No hay productos o servicios agregados a este presupuesto.</p>
                  {onItemsChange && (
                    <Button
                      onClick={() => setCreateProductDialogOpen(true)}
                      className="mt-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                    >
                      <PackagePlus className="h-4 w-4 mr-2" />
                      Crear Primer Producto
                    </Button>
                  )}
                </div>
              )}
              {bcvRateError && (
                <div className="px-6 py-3">
                  <p className="text-xs text-destructive flex items-center gap-1.5">
                    <AlertCircle className="h-3.5 w-3.5" /> {bcvRateError}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {workflowData.notes && (
        <>
        <Separator />
        <Card className="shadow-sm border-border/60 hover:shadow-md transition-all duration-200">
          <CardHeader className="bg-muted/20 pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Notas Adicionales
            </CardTitle>
            <CardDescription>Observaciones importantes sobre este presupuesto.</CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <p className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 bg-muted/50 p-4 rounded-md">
              {workflowData.notes}
            </p>
          </CardContent>
        </Card>
        </>
      )}

      <Separator />

      <div className="flex flex-col items-center justify-center pt-4 space-y-2">
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || workflowData.items.length === 0}
          size="lg"
          className="w-full max-w-xs gap-2 text-base bg-green-600 hover:bg-green-700 transition-all duration-200 hover:shadow-md"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Creando Presupuesto...
            </>
          ) : (
            <>
              <FileText className="h-5 w-5" />
              Confirmar y Crear Presupuesto
            </>
          )}
        </Button>
        {workflowData.items.length === 0 && (
          <p className="text-xs text-destructive">No se puede crear un presupuesto sin items.</p>
        )}
      </div>

      {/* Create Product Dialog */}
      {onItemsChange && (
        <CreateProductDialog
          isOpen={createProductDialogOpen}
          onClose={() => setCreateProductDialogOpen(false)}
          onProductCreated={handleProductCreated}
        />
      )}
    </div>
  );
}