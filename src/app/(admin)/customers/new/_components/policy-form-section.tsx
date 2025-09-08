'use client';

import { Control } from "react-hook-form";
import { FullApplicationFormData } from "../../schemas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import FormDateInput from "./form-date-input";

interface Props {
  formControl: Control<FullApplicationFormData>;
}

export default function PolicyFormSection({ formControl }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>3. Información de la Póliza</CardTitle>
        <CardDescription>
          Detalles de la cobertura, costos y notas adicionales de la venta.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* --- Detalles Principales de la Póliza --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <FormField
            control={formControl}
            name="policy.insuranceCompany"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Aseguradora*</FormLabel>
                <FormControl><Input placeholder="Ambetter, Oscar, Aetna..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={formControl}
            name="policy.policyNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número de Póliza</FormLabel>
                <FormControl><Input placeholder="Opcional" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={formControl}
            name="policy.effectiveDate"
            render={({ field }) => (
              <FormItem className="flex flex-col pt-2">
                <FormLabel className="mb-1">Fecha Efectiva*</FormLabel>
                <FormControl>
                  <FormDateInput field={field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        {/* --- Detalles Financieros --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 👇 CORRECCIÓN 1: Aplicada a Prima Mensual 👇 */}
            <FormField
                control={formControl}
                name="policy.monthlyPremium"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Prima Mensual ($)*</FormLabel>
                    <FormControl>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="123.45"
                            {...field}
                            onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === '' ? undefined : Number(value));
                            }}
                            value={field.value ?? ''}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            {/* 👇 CORRECCIÓN 2: Aplicada a Crédito Fiscal 👇 */}
            <FormField
                control={formControl}
                name="policy.taxCredit"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Crédito Fiscal (Tax Credit)</FormLabel>
                    <FormControl>
                        <Input
                            type="number"
                            step="0.01"
                            placeholder="Opcional"
                            {...field}
                            onChange={(e) => {
                                const value = e.target.value;
                                field.onChange(value === '' ? undefined : Number(value));
                            }}
                            value={field.value ?? ''}
                        />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>

        {/* --- Enlaces y Notas --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <FormField
                control={formControl}
                name="policy.planLink"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Enlace del Plan (Link)</FormLabel>
                    <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <FormField
                control={formControl}
                name="policy.aorLink"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Enlace del AOR</FormLabel>
                    <FormControl><Input placeholder="https://..." {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}
            />
        </div>
        <FormField
            control={formControl}
            name="policy.notes"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Comentarios Adicionales</FormLabel>
                <FormControl><Textarea placeholder="Añade cualquier nota relevante sobre la venta, el cliente o la póliza..." {...field} /></FormControl>
                <FormMessage />
            </FormItem>
        )} />
      </CardContent>
    </Card>
  );
}