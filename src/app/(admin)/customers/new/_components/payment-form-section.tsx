// (admin)/customers/new/_components/payment-form-section.tsx
'use client';

import { Control, useWatch } from "react-hook-form";
import { FullApplicationFormData } from "../../schemas";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import InputMask from "react-input-mask";

interface Props {
  formControl: Control<FullApplicationFormData>;
}

export default function PaymentFormSection({ formControl }: Props) {
  // `useWatch` nos permite re-renderizar el componente cuando un campo específico cambia.
  const paymentType = useWatch({
    control: formControl,
    name: "payment.methodType",
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>5. Información de Pago</CardTitle>
        <CardDescription>
          Introduce los datos de pago del cliente. Serán guardados de forma encriptada en la base de datos.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <FormField
          control={formControl}
          name="payment.methodType"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Tipo de Método de Pago*</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger><SelectValue placeholder="Selecciona un tipo..." /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="credit_card">Tarjeta de Crédito</SelectItem>
                  <SelectItem value="debit_card">Tarjeta de Débito</SelectItem>
                  <SelectItem value="bank_account">Cuenta Bancaria</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Renderizado Condicional para Tarjeta de Crédito/Débito */}
        {(paymentType === 'credit_card' || paymentType === 'debit_card') && (
          <div className="p-4 border rounded-md space-y-4 bg-muted/50">
            <h3 className="font-semibold">Datos de la Tarjeta</h3>
            <FormField control={formControl} name="payment.cardHolderName" render={({ field }) => (
                <FormItem><FormLabel>Nombre en la Tarjeta</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={formControl} name="payment.cardNumber" render={({ field }) => (
                <FormItem><FormLabel>Número de Tarjeta</FormLabel><FormControl>
                    <InputMask mask="9999-9999-9999-9999" value={field.value} onChange={field.onChange}>
                        {(inputProps) => <Input {...inputProps} />}
                    </InputMask>
                </FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={formControl} name="payment.expirationDate" render={({ field }) => (
                    <FormItem><FormLabel>Fecha de Expiración</FormLabel><FormControl>
                        <InputMask mask="99/99" value={field.value} onChange={field.onChange}>
                            {(inputProps) => <Input placeholder="MM/AA" {...inputProps} />}
                        </InputMask>
                    </FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={formControl} name="payment.cvv" render={({ field }) => (
                    <FormItem><FormLabel>CVV</FormLabel><FormControl><Input placeholder="123" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            <Alert variant="destructive">
                <Terminal className="h-4 w-4" />
                <AlertTitle>Aviso de Seguridad</AlertTitle>
                <AlertDescription>
                    Por regulaciones de seguridad (PCI DSS), el código CVV **nunca** debe ser almacenado. Este campo es solo para la transacción inicial.
                </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Renderizado Condicional para Cuenta Bancaria */}
        {paymentType === 'bank_account' && (
             <div className="p-4 border rounded-md space-y-4 bg-muted/50">
                <h3 className="font-semibold">Datos de la Cuenta Bancaria</h3>
                 <FormField control={formControl} name="payment.bankName" render={({ field }) => (
                    <FormItem><FormLabel>Nombre del Banco</FormLabel><FormControl><Input placeholder="Bank of America" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={formControl} name="payment.routingNumber" render={({ field }) => (
                    <FormItem><FormLabel>Número de Ruta (Routing)</FormLabel><FormControl><Input placeholder="012345678" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={formControl} name="payment.accountNumber" render={({ field }) => (
                    <FormItem><FormLabel>Número de Cuenta</FormLabel><FormControl><Input placeholder="876543210" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
        )}
      </CardContent>
    </Card>
  );
}