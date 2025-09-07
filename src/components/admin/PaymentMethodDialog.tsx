"use client";

import { useState, useEffect, useRef, ChangeEvent } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Loader2, AlertCircle, Info, Upload, X } from "lucide-react";

// Componentes de shadcn/ui
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Interfaz del Método de Pago
interface PaymentMethod {
  id?: string;
  title?: string;
  iconUrl?: string | null;
  isActive?: boolean;
  triggersApiVerification?: boolean;
  accountHolderName?: string | null;
  rif?: string | null;
  phoneNumber?: string | null;
  bankName?: string | null;
  accountNumber?: string | null;
  email?: string | null;
  walletAddress?: string | null;
  network?: string | null;
  binancePayId?: string | null;
}

// VALORES INICIALES PARA UN MÉTODO NUEVO
const initialState: Omit<PaymentMethod, "id"> = {
  title: "",
  iconUrl: null,
  isActive: true,
  triggersApiVerification: false,
  accountHolderName: "",
  rif: "",
  phoneNumber: "",
  bankName: "",
  accountNumber: "",
  email: "",
  walletAddress: "",
  network: "",
  binancePayId: "",
};

interface PaymentMethodDialogProps {
  action: (
    prevState: any,
    formData: FormData
  ) => Promise<{ success: boolean; message: string }>;
  method?: PaymentMethod;
  triggerButton: React.ReactNode;
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {isEditing ? "Guardar Cambios" : "Crear Método"}
    </Button>
  );
}

// --- COMPONENTE FINAL CON ESTADO CONTROLADO Y FORMULARIO ÚNICO ---
export function PaymentMethodDialog({
  action,
  method,
  triggerButton,
}: PaymentMethodDialogProps) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useFormState(action, {
    success: false,
    message: "",
  });
  const formRef = useRef<HTMLFormElement>(null);
  const isEditing = !!method;

  const [formData, setFormData] =
    useState<Omit<PaymentMethod, "id">>(initialState);

  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && method) {
      setFormData({
        title: method.title ?? "",
        iconUrl: method.iconUrl ?? null,
        isActive: method.isActive ?? true,
        triggersApiVerification: method.triggersApiVerification ?? false,
        accountHolderName: method.accountHolderName ?? "",
        rif: method.rif ?? "",
        phoneNumber: method.phoneNumber ?? "",
        bankName: method.bankName ?? "",
        accountNumber: method.accountNumber ?? "",
        email: method.email ?? "",
        walletAddress: method.walletAddress ?? "",
        network: method.network ?? "",
        binancePayId: method.binancePayId ?? "",
      });
      setIconPreview(method.iconUrl ?? null);
    } else {
      setFormData(initialState);
      setIconPreview(null);
      setIconFile(null);
    }
  }, [method, isEditing, open]);

  useEffect(() => {
    if (state.success) {
      setOpen(false);
    }
  }, [state]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleIconChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setIconFile(file);
    if (file) {
      setIconPreview(URL.createObjectURL(file));
    } else {
      setIconPreview(method?.iconUrl ?? null);
    }
  };

  const clearIcon = () => {
    setIconFile(null);
    setIconPreview(method?.iconUrl ?? null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSwitchChange = (name: keyof PaymentMethod, checked: boolean) => {
    setFormData((prev) => ({ ...prev, [name]: checked }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{triggerButton}</DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Método de Pago" : "Nuevo Método de Pago"}
          </DialogTitle>
          <DialogDescription>
            Completa la información del método. Los campos con (*) son
            obligatorios.
          </DialogDescription>
        </DialogHeader>

        <form ref={formRef} action={formAction} className="space-y-6 pt-2">
          {state.message && !state.success && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          )}
          {method?.id && <input type="hidden" name="id" value={method.id} />}
          <input
            type="hidden"
            name="isActive"
            value={String(formData.isActive)}
          />
          <input
            type="hidden"
            name="triggersApiVerification"
            value={String(formData.triggersApiVerification)}
          />

          {/* SECCIÓN GENERAL */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">
                Título del Método <span className="text-red-500">*</span>
              </Label>
              <Input
                id="title"
                name="title"
                placeholder="Ej: Pago Móvil Banesco"
                required
                value={formData.title}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon">Ícono del Método</Label>
              <div className="flex items-center gap-4">
                <div className="relative w-20 h-20 rounded-md border flex items-center justify-center bg-muted/40">
                  {iconPreview ? (
                    <img
                      src={iconPreview}
                      alt="Vista previa"
                      className="rounded-md object-contain h-full w-full"
                    />
                  ) : (
                    <Upload className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <Input
                    id="icon"
                    name="icon"
                    type="file"
                    ref={fileInputRef}
                    accept="image/png, image/jpeg, image/svg+xml, image/webp"
                    onChange={handleIconChange}
                    className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  />
                  {iconFile && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearIcon}
                      className="mt-2 text-red-500"
                    >
                      <X className="mr-2 h-4 w-4" /> Quitar imagen
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Sube una imagen (PNG, JPG, SVG). Recomendado: 128x128px.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* SECCIÓN DETALLES DE LA CUENTA */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">
              Detalles de la Cuenta (Opcional)
            </h3>
            {formData.title?.toLowerCase().includes("zinli") ? (
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico (Zinli)</Label>
                <Input
                  id="email"
                  name="email"
                  placeholder="tu_correo@example.com"
                  value={formData.email ?? ""}
                  onChange={handleChange}
                />
                <Label htmlFor="phoneNumber">Teléfono (Zinli)</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  placeholder="0412-1234567"
                  value={formData.phoneNumber ?? ""}
                  onChange={handleChange}
                />
              </div>
            ) : formData.title?.toLowerCase().includes("binance") ? (
              <div className="space-y-2">
                <Label htmlFor="walletAddress">Dirección de Wallet (Binance)</Label>
                <Input
                  id="walletAddress"
                  name="walletAddress"
                  placeholder="Txxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                  value={formData.walletAddress ?? ""}
                  onChange={handleChange}
                />
                <Label htmlFor="network">Red (Binance)</Label>
                <Input
                  id="network"
                  name="network"
                  placeholder="Ej: TRC20, BEP20, ERC20"
                  value={formData.network ?? ""}
                  onChange={handleChange}
                />
                <Label htmlFor="binancePayId">Binance Pay ID</Label>
                <Input
                  id="binancePayId"
                  name="binancePayId"
                  placeholder="Ej: 123456789"
                  value={formData.binancePayId ?? ""}
                  onChange={handleChange}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">Nombre del Titular</Label>
                  <Input
                    id="accountHolderName"
                    name="accountHolderName"
                    value={formData.accountHolderName ?? ""}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rif">Cédula / RIF</Label>
                  <Input
                    id="rif"
                    name="rif"
                    placeholder="V-12345678"
                    value={formData.rif ?? ""}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankName">Nombre del Banco</Label>
                  <Input
                    id="bankName"
                    name="bankName"
                    placeholder="Banesco"
                    value={formData.bankName ?? ""}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phoneNumber">Teléfono (Pago Móvil)</Label>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    placeholder="0412-1234567"
                    value={formData.phoneNumber ?? ""}
                    onChange={handleChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accountNumber">
                    Número de Cuenta (Transferencia)
                  </Label>
                  <Input
                    id="accountNumber"
                    name="accountNumber"
                    placeholder="0134..."
                    value={formData.accountNumber ?? ""}
                    onChange={handleChange}
                  />
                </div>
              </div>
            )}
          </div>

          <Separator />

          {/* SECCIÓN DE CONFIGURACIÓN */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-foreground">
              Configuración
            </h3>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label htmlFor="isActive-switch">Activo para clientes</Label>
                <p className="text-xs text-muted-foreground">
                  Si está activo, los clientes podrán seleccionarlo.
                </p>
              </div>
              <Switch
                id="isActive-switch"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  handleSwitchChange("isActive", checked)
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="space-y-0.5">
                <Label
                  htmlFor="triggersApiVerification-switch"
                  className="flex items-center"
                >
                  Verificación Automática
                  <TooltipProvider delayDuration={100}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="ml-2 h-4 w-4 text-muted-foreground cursor-pointer" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Activa la API para verificar pagos automáticamente.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <p className="text-xs text-muted-foreground">
                  Intenta confirmar los pagos reportados con este método.
                </p>
              </div>
              <Switch
                id="triggersApiVerification-switch"
                checked={formData.triggersApiVerification}
                onCheckedChange={(checked) =>
                  handleSwitchChange("triggersApiVerification", checked)
                }
              />
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <SubmitButton isEditing={isEditing} />
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}