'use client';

import { useEffect, useState } from "react";
import { Control, useWatch } from "react-hook-form";
import { FullApplicationFormData } from "../../schemas";
import { useSession } from "next-auth/react";
import { CARRIERS_BY_STATE } from "../../lib/carriers-data";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import FormDateInput from "./form-date-input";

interface Props {
    formControl: Control<FullApplicationFormData>;
}

export default function PolicyFormSection({ formControl }: Props) {
    const { data: session, status } = useSession();
    const [availableCarriers, setAvailableCarriers] = useState<string[]>([]);

    const selectedState = useWatch({
        control: formControl,
        name: "customer.state",
    });

    useEffect(() => {
        if (selectedState && CARRIERS_BY_STATE[selectedState]) {
            setAvailableCarriers(CARRIERS_BY_STATE[selectedState]);
        } else {
            setAvailableCarriers([]);
        }
    }, [selectedState, formControl]);

    const userRole = session?.user?.role;
    const isLoadingSession = status === 'loading';
    const canEditSensitiveFields = userRole === 'processor';

    if (isLoadingSession) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>3. Información de la Póliza</CardTitle>
                    <CardDescription>Cargando información de la sesión...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-32" /><Skeleton className="h-10 w-full" /></div>
                        <div className="space-y-2"><Skeleton className="h-4 w-28" /><Skeleton className="h-10 w-full" /></div>
                    </div>
                    <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-10 w-1/3" /></div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>3. Información de la Póliza</CardTitle>
                <CardDescription>
                    Detalles de la cobertura, costos y notas adicionales de la venta.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <FormField
                        control={formControl}
                        name="policy.insuranceCompany"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Aseguradora *</FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    disabled={availableCarriers.length === 0}
                                >
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecciona una aseguradora..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {availableCarriers.map(carrier => (
                                            <SelectItem key={carrier} value={carrier}>
                                                {carrier}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {selectedState && availableCarriers.length === 0 && (
                                    <FormDescription className="text-destructive">
                                        No hay aseguradoras disponibles para {selectedState}.
                                    </FormDescription>
                                )}
                                {!selectedState && (
                                    <FormDescription>
                                        Selecciona un estado en el paso anterior para ver las opciones.
                                    </FormDescription>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={formControl}
                        name="policy.planName"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre del Plan *</FormLabel>
                                <FormControl>
                                  <Input 
                                    placeholder="AMBETTER SUPERIOR SILVER" 
                                    {...field} 
                                    className="uppercase"
                                    onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                  />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={formControl}
                        name="policy.marketplaceId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Marketplace ID</FormLabel>
                                <FormControl>
                                    <Input placeholder="Opcional" {...field} disabled={!canEditSensitiveFields} />
                                </FormControl>
                                {!canEditSensitiveFields && <p className="text-xs text-muted-foreground pt-1">Solo editable por Procesamiento.</p>}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                
                <FormField
                    control={formControl}
                    name="policy.effectiveDate"
                    render={({ field }) => (
                        <FormItem className="flex flex-col pt-2">
                            <FormLabel className="mb-1">Fecha Efectiva * (MM/DD/AAAA)</FormLabel>
                            <FormControl>
                                <FormDateInput field={field} />
                            </FormControl>
                            {!canEditSensitiveFields && <p className="text-xs text-muted-foreground pt-1">Solo editable por Procesamiento.</p>}
                            <FormMessage />
                        </FormItem>
                    )}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                        control={formControl}
                        name="policy.monthlyPremium"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Prima Mensual ($) *</FormLabel>
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
                            <FormControl>
                              <Textarea 
                                placeholder="AÑADE CUALQUIER NOTA RELEVANTE SOBRE LA VENTA..." 
                                {...field} 
                                className="uppercase"
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            </CardContent>
        </Card>
    );
}