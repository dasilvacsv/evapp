// src/components/BuyTicketsForm.tsx
"use client";

// Importaciones de React y librerías externas
import { useState, useMemo, ChangeEvent, useEffect, useRef } from 'react';
import ReCAPTCHA from "react-google-recaptcha";

// Importaciones de componentes de UI y acciones del servidor
import { Checkbox } from "@/components/ui/checkbox";
import { TermsModal } from '@/components/TermsModal';
import { buyTicketsAction, reserveTicketsAction } from '@/lib/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { PaymentDetailsDisplay } from './PaymentDetailsDisplay';
import { CountryCodeSelector } from '@/components/ui/CountryCodeSelector';

// Importaciones de utilidades e íconos
import { getBCVRates } from '@/lib/exchangeRates';
import Image from 'next/image';
import { Loader2, X, Ticket, CheckCircle, UploadCloud, User, AtSign, Phone, FileText, Minus, Plus, Check } from 'lucide-react';

// Definición de Interfaces
interface PaymentMethod {
  id: string;
  title: string;
  triggersApiVerification?: boolean;
  iconUrl?: string | null;
  bankName?: string | null;
  rif?: string | null;
  phoneNumber?: string | null;
  accountHolderName?: string | null;
  accountNumber?: string | null;
  email?: string | null;
  walletAddress?: string | null;
  network?: string | null;
  binancePayId?: string | null;
}

interface BuyTicketsFormProps {
  raffle: {
    id: string;
    name: string;
    price: string;
    currency: 'USD' | 'VES';
    status: string;
  };
  paymentMethods: PaymentMethod[];
}

// Constantes y Estado Inicial
const initialState = { success: false, message: '' };
const TICKET_AMOUNTS = [2, 5, 10, 15, 20, 25];

// Función de utilidad para formatear moneda
const formatCurrency = (amount: number, currency: 'USD' | 'VES', locale: string = 'es-VE') => {
  const formattedNumber = new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return currency === 'USD' ? `$${formattedNumber}` : `${formattedNumber} Bs`;
};

// Componente Principal del Formulario
export function BuyTicketsForm({ raffle, paymentMethods }: BuyTicketsFormProps) {
  // Estados del componente
  const [apiState, setApiState] = useState(initialState);
  const [isPending, setIsPending] = useState(false);
  const [ticketCount, setTicketCount] = useState<number>(2);
  const [reservedTickets, setReservedTickets] = useState<string[]>([]);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [countryCode, setCountryCode] = useState('+58');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [reservationError, setReservationError] = useState('');
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [isLoadingRates, setIsLoadingRates] = useState(true);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Referencias a elementos
  const recaptchaRef = useRef<ReCAPTCHA>(null);
  const verificationTimers = useRef<{ modalTimer: NodeJS.Timeout | null, progressTimer: NodeJS.Timer | null }>({
    modalTimer: null,
    progressTimer: null
  });

  // Datos calculados y memos
  const selectedPaymentMethod = useMemo(() =>
    paymentMethods.find(method => method.id === paymentMethodId)
  , [paymentMethodId, paymentMethods]);

  const totalAmount = useMemo(() => ticketCount * parseFloat(raffle.price), [ticketCount, raffle.price]);

  const currencyData = useMemo(() => {
    const price = parseFloat(raffle.price);
    const numTickets = reservedTickets.length > 0 ? reservedTickets.length : ticketCount;
    const total = numTickets * price;
    let totalSecondary = '';
    let secondaryCurrencySymbol = '';

    if (exchangeRate !== null) {
      const convertedTotal = raffle.currency === 'USD' ? total * exchangeRate : total / exchangeRate;
      const convertedCurrency = raffle.currency === 'USD' ? 'VES' : 'USD';
      totalSecondary = new Intl.NumberFormat('es-VE', { style: 'decimal', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(convertedTotal);
      secondaryCurrencySymbol = convertedCurrency === 'USD' ? '$' : 'Bs';
    }

    return {
      pricePerTicket: formatCurrency(price, raffle.currency),
      totalPrimary: formatCurrency(total, raffle.currency),
      totalSecondary,
      secondaryCurrencySymbol,
    };
  }, [ticketCount, reservedTickets, raffle.price, raffle.currency, exchangeRate]);

  // Efecto para obtener la tasa de cambio al cargar
  useEffect(() => {
    const fetchRates = async () => {
      setIsLoadingRates(true);
      try {
        const rates = await getBCVRates();
        if (raffle.currency === 'USD') setExchangeRate(rates.usd.rate);
        else if (raffle.currency === 'VES') setExchangeRate(1 / rates.usd.rate);
      } catch (error) {
        console.error("Error al obtener las tasas de cambio:", error);
        setExchangeRate(null);
      } finally {
        setIsLoadingRates(false);
      }
    };
    fetchRates();
  }, [raffle.currency]);

  // Manejadores de eventos
  const resetForm = () => {
    setApiState(initialState); setTicketCount(2); setReservedTickets([]);
    setPaymentMethodId(''); setBuyerName(''); setBuyerEmail('');
    setCountryCode('+58'); setBuyerPhone(''); setPaymentReference('');
    setPaymentScreenshot(null); setPreview(null); setReservationError('');
    setTermsAccepted(false); setCaptchaToken(null);
    recaptchaRef.current?.reset();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setPaymentScreenshot(file);
    setPreview(file ? URL.createObjectURL(file) : null);
  };

  const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (countryCode === '+58' && value.startsWith('0')) value = value.substring(1);
    setBuyerPhone(value);
  };

  const handleTicketCountChange = (value: number) => setTicketCount(Math.max(1, value));
  
  const handleCaptchaChange = (token: string | null) => setCaptchaToken(token);

  const handleFormSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!termsAccepted || !captchaToken) {
      setApiState({ success: false, message: !termsAccepted ? 'Debes aceptar los términos y condiciones.' : 'Por favor, completa la verificación reCAPTCHA.' });
      return;
    }

    setIsPending(true);
    setReservationError('');
    setApiState(initialState);

    try {
      // 1. Reservar tickets
      const reserveFormData = new FormData();
      reserveFormData.append('raffleId', raffle.id);
      reserveFormData.append('ticketCount', ticketCount.toString());
      const reserveResult = await reserveTicketsAction(reserveFormData);

      if (!reserveResult.success || !reserveResult.data?.reservedTickets) {
        setReservationError(reserveResult.message || 'No se pudieron apartar los tickets. Intenta con otra cantidad.');
        setIsPending(false);
        return;
      }

      // 2. Construir y enviar datos de compra
      const ticketsToBuy = reserveResult.data.reservedTickets;
      const buyFormData = new FormData();
      buyFormData.append('raffleId', raffle.id);
      buyFormData.append('reservedTickets', ticketsToBuy.join(','));
      buyFormData.append('paymentMethod', selectedPaymentMethod?.title || '');
      buyFormData.append('name', buyerName);
      buyFormData.append('email', buyerEmail);
      buyFormData.append('phone', `${countryCode.replace('+', '')}${buyerPhone}`);
      buyFormData.append('paymentReference', paymentReference);
      if (paymentScreenshot) buyFormData.append('paymentScreenshot', paymentScreenshot);
      buyFormData.append('captchaToken', captchaToken);

      const buyResult = await buyTicketsAction(buyFormData);
      setApiState(buyResult);

    } catch (error) {
      setApiState({ success: false, message: 'Ocurrió un error inesperado.' });
    } finally {
      setIsPending(false);
      recaptchaRef.current?.reset();
      setCaptchaToken(null);
    }
  };

  // Renderizado condicional para la pantalla de éxito/error
  if (apiState.success || (apiState.message && !apiState.message.toLowerCase().includes("captcha"))) {
    return (
      <CardContent className="p-0">
        <div className="p-5">
          <div className="text-center space-y-6 py-6 animate-fade-in">
            {apiState.success ? (
              <div className="p-4 rounded-lg bg-green-950/50 border border-green-400/30">
                <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                <AlertDescription className="text-xl font-bold text-green-300">¡Solicitud recibida!</AlertDescription>
                <p className="text-base text-green-400/80 mt-2">
                  Tus tickets están pendientes por confirmar. Te avisaremos por correo y WhatsApp cuando validemos el pago. ¡Mucha suerte!
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-red-950/50 border border-red-400/30">
                <X className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <AlertDescription className="text-xl font-bold text-red-300">{apiState.message}</AlertDescription>
                <p className="text-base text-red-400/80 mt-2">Por favor, verifica los datos e inténtalo de nuevo.</p>
              </div>
            )}
            <Button onClick={resetForm} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-lg py-6 text-base">
              {apiState.success ? 'Comprar más tickets' : 'Intentar de nuevo'}
            </Button>
          </div>
        </div>
      </CardContent>
    );
  }

  // Renderizado del formulario principal
  return (
    <CardContent className="p-0">
      <Dialog open={isVerifyingPayment}>
        <DialogContent className="bg-zinc-900 border-zinc-700 text-white" hideCloseButton>
            <DialogHeader>
                <DialogTitle className="text-center text-2xl font-bold text-amber-400">Verificando tu Pago</DialogTitle>
                <DialogDescription className="text-center text-zinc-400 pt-2">
                    Estamos confirmando tu pago. Esto puede tardar hasta un minuto.<br/>
                    <strong>Por favor, no cierres ni recargues esta página.</strong>
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Progress value={verificationProgress} className="w-full [&>div]:bg-amber-500" />
                <p className="text-center text-sm text-zinc-500 mt-3">
                    {verificationProgress < 90 ? 'Esperando respuesta...' : 'Casi listo...'}
                </p>
            </div>
        </DialogContent>
      </Dialog>
      
      <form onSubmit={handleFormSubmit} className="p-5 space-y-8 animate-fade-in">
        
        {/* Sección 1: Cantidad de Tickets */}
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-center text-white">1. Elige la cantidad de tickets</h3>
            {reservationError && <Alert variant="destructive" className="bg-red-950/50 border-red-400/30 text-red-300"><AlertDescription>{reservationError}</AlertDescription></Alert>}
            <div className="grid grid-cols-3 gap-3">
                {TICKET_AMOUNTS.map((q) => (
                    <div key={q} className="relative">
                        <input type="radio" id={`quantity-${q}`} name="ticketQuantity" value={q} checked={ticketCount === q} onChange={() => setTicketCount(q)} className="sr-only peer" disabled={isPending}/>
                        <label htmlFor={`quantity-${q}`} className="flex flex-col items-center justify-center p-2 h-20 rounded-lg border border-white/10 bg-black/20 cursor-pointer transition-all hover:bg-white/5 peer-checked:border-amber-400/50 peer-checked:bg-amber-950/30 peer-checked:ring-2 peer-checked:ring-amber-400/50">
                            <span className="text-2xl font-bold text-white">{q}</span>
                            <span className="text-xs text-zinc-400 uppercase">tickets</span>
                        </label>
                    </div>
                ))}
            </div>
            <div className="bg-black/20 p-4 rounded-lg border border-white/10 text-center">
                <div className="flex items-center justify-center space-x-3 mb-4">
                    <Button type="button" onClick={() => handleTicketCountChange(ticketCount - 1)} disabled={isPending || ticketCount <= 1} variant="outline" size="icon" className="h-10 w-10 text-zinc-300 border-white/10 bg-transparent hover:bg-white/5"><Minus className="h-5 w-5"/></Button>
                    <Input type="number" value={ticketCount} onChange={(e) => handleTicketCountChange(parseInt(e.target.value) || 1)} min="1" className="w-28 text-center !text-7xl h-28 bg-black/30 border-white/10 text-white rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                    <Button type="button" onClick={() => handleTicketCountChange(ticketCount + 1)} disabled={isPending} variant="outline" size="icon" className="h-10 w-10 text-zinc-300 border-white/10 bg-transparent hover:bg-white/5"><Plus className="h-5 w-5"/></Button>
                </div>
                <p className="text-zinc-400 text-sm">{ticketCount} ticket{ticketCount !== 1 ? 's' : ''} x {currencyData.pricePerTicket}</p>
                <p className="text-4xl font-extrabold text-amber-400 leading-tight mb-2">{currencyData.totalPrimary}</p>
                {isLoadingRates ? <p className="text-zinc-500 text-sm h-9 flex items-center justify-center"><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando tasa...</p> : (currencyData.totalSecondary && (
                    <p className="text-xl font-semibold text-zinc-300 mt-2 p-2 bg-white/5 rounded-md border border-white/10 flex items-center justify-center h-9">
                        <span className="text-zinc-400 text-base mr-2">≈</span> 
                        <span className="text-green-400">{currencyData.secondaryCurrencySymbol} {currencyData.totalSecondary}</span>
                    </p>
                ))}
            </div>
        </div>
        <hr className="border-t border-zinc-700" />
        
        {/* Sección 2: Método de Pago */}
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-center text-white">2. Selecciona tu método de pago</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {paymentMethods.map(method => (
                <div key={method.id} className="relative">
                    <input type="radio" id={`payment-${method.id}`} name="paymentMethod" value={method.id} checked={paymentMethodId === method.id} onChange={(e) => setPaymentMethodId(e.target.value)} className="sr-only peer" />
                    <Label htmlFor={`payment-${method.id}`} className="flex flex-col items-center justify-center p-4 h-28 rounded-lg border border-white/10 bg-black/20 cursor-pointer transition-all transform hover:bg-white/5 peer-checked:border-amber-400/50 peer-checked:bg-amber-950/30 peer-checked:ring-2 peer-checked:ring-amber-400/50">
                        <div className="absolute top-2 right-2 w-5 h-5 bg-zinc-700 rounded-full flex items-center justify-center peer-checked:bg-amber-500"><Check className="h-3 w-3 text-zinc-900 opacity-0 peer-checked:opacity-100" /></div>
                        {method.iconUrl && <Image src={method.iconUrl} alt={method.title} width={40} height={40} className="object-contain h-10"/>}
                        <span className="text-xs font-semibold text-white text-center mt-2">{method.title}</span>
                    </Label>
                </div>
                ))}
            </div>
            {selectedPaymentMethod && <PaymentDetailsDisplay method={selectedPaymentMethod} amount={totalAmount} currency={raffle.currency}/>}
        </div>
        <hr className="border-t border-zinc-700" />

        {/* Sección 3: Datos de Contacto */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-center text-white">3. Completa tus datos</h3>
          <div className="space-y-4">
            <div className="relative"><Label htmlFor="name" className="text-zinc-400">Nombre y apellido*</Label><Input id="name" value={buyerName} onChange={e => setBuyerName(e.target.value)} required className="h-12 pl-10 bg-black/30 border-white/10 text-white rounded-lg"/><User className="absolute left-3 top-9 h-5 w-5 text-zinc-500"/></div>
            <div className="relative"><Label htmlFor="email" className="text-zinc-400">Email*</Label><Input id="email" type="email" value={buyerEmail} onChange={e => setBuyerEmail(e.target.value)} required className="h-12 pl-10 bg-black/30 border-white/10 text-white rounded-lg"/><AtSign className="absolute left-3 top-9 h-5 w-5 text-zinc-500"/></div>
            <div><Label htmlFor="phone" className="text-zinc-400">Teléfono (WhatsApp)*</Label><div className="flex items-center mt-1"><CountryCodeSelector value={countryCode} onChange={setCountryCode} disabled={isPending} /><Input id="phone" type="tel" placeholder="412 1234567" value={buyerPhone} onChange={handlePhoneChange} required className="h-12 bg-black/30 border-white/10 text-white rounded-l-none focus-visible:ring-offset-0 focus-visible:ring-1" /></div></div>
            <div className="relative"><Label htmlFor="paymentReference" className="text-zinc-400">Nro. de Referencia del pago*</Label><Input id="paymentReference" value={paymentReference} onChange={e => setPaymentReference(e.target.value)} required className="h-12 pl-10 bg-black/30 border-white/10 text-white rounded-lg"/><FileText className="absolute left-3 top-9 h-5 w-5 text-zinc-500"/></div>
          </div>
        </div>
        <hr className="border-t border-zinc-700" />

        {/* Sección 4: Subir Comprobante */}
        <div className="space-y-6">
          <h3 className="text-xl font-bold text-center text-white">4. Sube el comprobante de pago*</h3>
          <label htmlFor="paymentScreenshot" className="relative flex flex-col items-center justify-center w-full min-h-[160px] border-2 border-zinc-600 border-dashed rounded-lg cursor-pointer bg-black/20 hover:bg-black/40 p-4">
            <div className="text-center text-zinc-400"><UploadCloud className="w-10 h-10 mb-3 text-amber-500 mx-auto" /><p className="font-semibold"><span className="text-amber-400">Click para subir</span> o arrastra</p><p className="text-xs mt-1">PNG, JPG, GIF (MAX. 5MB)</p></div>
            <Input id="paymentScreenshot" type="file" className="hidden" accept="image/*" onChange={handleFileChange} required />
          </label>
          {preview && (<div className="relative mt-2 w-28 h-28 mx-auto"><Image src={preview} alt="Vista previa" layout="fill" className="rounded-lg border-2 border-zinc-500 object-cover" /><button type="button" onClick={() => { setPreview(null); setPaymentScreenshot(null); }} className="absolute -top-2 -right-2 bg-zinc-800 text-white rounded-full p-1 border-2 border-zinc-500"><X className="h-4 w-4" /></button></div>)}
        </div>
        <hr className="border-t border-zinc-700" />
        
        {/* Sección 5: Aceptación de Términos y CAPTCHA */}
        <div className="space-y-6">
            <div className="flex items-start space-x-3 p-3 rounded-lg bg-black/20 border border-zinc-700">
                <Checkbox id="terms" checked={termsAccepted} onCheckedChange={(checked) => setTermsAccepted(Boolean(checked))} className="mt-1"/>
                <div className="grid gap-1.5 leading-none">
                    <label htmlFor="terms" className="text-sm font-medium text-zinc-300 peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Acepto los Términos y Condiciones*</label>
                    <p className="text-sm text-zinc-500">
                        Al marcar, confirmas que leíste y estás de acuerdo con las{' '}
                        <TermsModal>
                            <span className="underline text-amber-500 hover:text-amber-400 cursor-pointer">
                                reglas del sorteo
                            </span>
                        </TermsModal>.
                    </p>
                </div>
            </div>
            <div className="flex justify-center">
                 <ReCAPTCHA ref={recaptchaRef} sitekey={process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!} onChange={handleCaptchaChange} theme="dark" />
            </div>
            {apiState.message && apiState.message.toLowerCase().includes("captcha") && (
                <Alert variant="destructive" className="bg-red-950/50 border-red-400/30 text-red-300"><AlertDescription>{apiState.message}</AlertDescription></Alert>
            )}
        </div>
        
        {/* Botón de Envío Final */}
        <Button 
          type="submit" 
          disabled={isPending || !paymentScreenshot || !paymentMethodId || !captchaToken || !termsAccepted} 
          className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold rounded-lg py-6 text-base shadow-lg shadow-black/40 transition-all duration-300 ease-out hover:scale-105 hover:drop-shadow-[0_0_15px_theme(colors.amber.500)] disabled:opacity-50 disabled:hover:scale-100 disabled:hover:drop-shadow-none"
        >
          {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Ticket className="mr-2 h-5 w-5" />}
          Confirmar Compra
        </Button>
      </form>
    </CardContent>
  );
}