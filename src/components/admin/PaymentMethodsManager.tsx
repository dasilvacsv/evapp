// app/admin/metodos-pago/PaymentMethodsManager.tsx

import { db } from "@/lib/db";
import {
  createPaymentMethodAction,
  updatePaymentMethodAction,
  deletePaymentMethodAction,
} from "@/lib/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { CreditCard, Edit, Plus, AlertTriangle, ImageIcon } from "lucide-react";
import { PaymentMethodDialog } from "./PaymentMethodDialog";
import { DeleteMethodDialog } from "./DeleteMethodDialog";

// Componente para visualizar detalles de forma más clara y estructurada.
function MethodDetails({ method }: { method: any }) {
  const details = [
    { label: "Titular", value: method.accountHolderName },
    { label: "Banco", value: method.bankName },
    { label: "RIF/CI", value: method.rif },
    { label: "N° Cuenta", value: method.accountNumber },
    { label: "Teléfono", value: method.phoneNumber },
    { label: "Correo", value: method.email },
    { label: "Wallet", value: method.walletAddress },
    { label: "Red", value: method.network },
    { label: "Binance Pay ID", value: method.binancePayId },
  ].filter(detail => detail.value);

  if (details.length === 0) {
    return <span className="text-sm text-muted-foreground">Sin detalles configurados.</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
      {details.map((detail, index) => (
        <div key={index} className="text-sm text-muted-foreground">
          <span className="font-semibold text-foreground">{detail.label}:</span> {detail.value}
        </div>
      ))}
    </div>
  );
}

export async function PaymentMethodsManager() {
  const paymentMethods = await db.query.paymentMethods.findMany();

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Métodos de Pago
          </CardTitle>
          <CardDescription>
            Añade, edita o desactiva los métodos de pago disponibles para los clientes.
          </CardDescription>
        </div>
        <PaymentMethodDialog
          action={createPaymentMethodAction}
          triggerButton={
            <Button className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Añadir Método
            </Button>
          }
        />
      </CardHeader>
      <CardContent>
        {paymentMethods.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold">No hay métodos de pago</h3>
            <p className="text-muted-foreground mt-2">
              Añade tu primer método de pago para que los clientes puedan realizar sus compras.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Icono</TableHead>
                <TableHead>Título</TableHead>
                <TableHead className="hidden lg:table-cell">Detalles</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentMethods.map((method) => (
                <TableRow key={method.id}>
                  <TableCell>
                    {method.iconUrl ? (
                      <img
                        src={method.iconUrl}
                        alt={`Ícono de ${method.title}`}
                        className="h-10 w-10 object-contain rounded-md border p-1"
                      />
                    ) : (
                      <div className="h-10 w-10 flex items-center justify-center bg-muted/50 rounded-md border">
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{method.title}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <MethodDetails method={method} />
                  </TableCell>
                  <TableCell>
                    <Badge variant={method.isActive ? "default" : "secondary"} className={method.isActive ? "bg-green-600/90 text-white" : ""}>
                      {method.isActive ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 justify-end">
                      <TooltipProvider delayDuration={100}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                              <PaymentMethodDialog
                                action={updatePaymentMethodAction}
                                method={method}
                                triggerButton={
                                  <Button variant="outline" size="icon">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                }
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Editar Método</p>
                          </TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div>
                               <DeleteMethodDialog 
                                methodId={method.id} 
                                action={deletePaymentMethodAction} 
                              />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Eliminar Método</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}