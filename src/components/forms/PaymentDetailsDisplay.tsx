"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, Check, Wallet, UserCircle, Landmark, Fingerprint, Phone, CreditCard, DollarSign, Globe, AtSign, QrCode, Info, Loader2 } from 'lucide-react';

// Importa la función para obtener la tasa de cambio del BCV
import { getBCVRates } from '@/lib/exchangeRates';

interface PaymentDetailsProps {
  method: {
    title: string;
    bankName?: string | null;
    rif?: string | null;
    phoneNumber?: string | null;
    accountHolderName?: string | null;
    accountNumber?: string | null;
    email?: string | null;
    walletAddress?: string | null;
    network?: string | null;
    binancePayId?: string | null;
  };
  amount?: number | null;
  currency?: 'USD' | 'VES' | 'USDT';
}

const formatAmount = (amount: number, currency: 'USD' | 'VES' | 'USDT') => {
  if (currency === 'USDT') {
    return `${amount.toFixed(2)} USDT`;
  }
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount);
};

function CopyableDetail({ label, value, icon, className = '' }: { label: string; value: string; icon: React.ReactNode; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`flex justify-between items-center py-2 border-b border-white/5 last:border-b-0 ${className}`}>
      <div className="flex items-center gap-3">
        <div className="text-amber-400 flex-shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-xs text-zinc-400">{label}</p>
          <p className="font-semibold text-white text-sm sm:text-base tracking-wider break-all">{value}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleCopy}
        className="text-zinc-400 hover:text-white hover:bg-white/10 flex-shrink-0 ml-2 rounded-full h-8 w-8"
        aria-label={`Copiar ${label}`}
      >
        {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

export function PaymentDetailsDisplay({ method, amount, currency }: PaymentDetailsProps) {
  const [allCopied, setAllCopied] = useState(false);
  const [bcvRate, setBcvRate] = useState<number | null>(null);
  const [isLoadingRate, setIsLoadingRate] = useState(true);

  const isPagoMovil = method.phoneNumber && method.rif && method.bankName;
  const isBinancePay = !!method.binancePayId;
  const isBinanceCrypto = method.walletAddress && method.network;
  const isZinli = method.phoneNumber && method.email;

  // Nuevo useEffect para obtener la tasa del BCV
  useEffect(() => {
    const fetchBcvRate = async () => {
      setIsLoadingRate(true);
      try {
        const rates = await getBCVRates();
        setBcvRate(rates.usd.rate);
      } catch (error) {
        console.error("Error fetching BCV rate:", error);
        setBcvRate(null);
      } finally {
        setIsLoadingRate(false);
      }
    };
    fetchBcvRate();
  }, []);

  const convertedAmountInVes = (amount && currency === 'USD' && bcvRate) ? (amount * bcvRate) : null;
  const amountToDisplay = isPagoMovil && currency === 'USD' ? convertedAmountInVes : amount;
  const currencyToDisplay = isPagoMovil && currency === 'USD' ? 'VES' : currency;

  const handleCopyAll = () => {
    let textToCopy = '';
    const formattedAmount = amount !== null && amount !== undefined && currency ? formatAmount(amount, currency) : null;
    const amountValue = amount ? amount.toFixed(2) : '';

    if (isPagoMovil && amountValue) {
      const bankCode = method.bankName ? method.bankName.substring(0, 4) : '';
      const rifWithoutPrefix = method.rif ? method.rif.replace(/^[VJEG]-/, '') : '';
      // Usa el monto convertido si existe, de lo contrario usa el valor original
      const amountInVes = convertedAmountInVes ? convertedAmountInVes.toFixed(2) : amountValue;
      const linesToCopy = [
        bankCode,
        rifWithoutPrefix,
        method.phoneNumber,
        amountInVes
      ];
      textToCopy = linesToCopy.join('\n'); // Cambiado a salto de línea
    } else if (isBinancePay && formattedAmount) {
      textToCopy = `Monto: ${formattedAmount}\nID de pago: ${method.binancePayId}`;
    } else if (isZinli && formattedAmount) {
      textToCopy = `Monto: ${formattedAmount}\nTeléfono: ${method.phoneNumber}\nCorreo: ${method.email}`;
    } else {
      let detailsToCopy = [];
      if (formattedAmount) detailsToCopy.push(`Monto: ${formattedAmount}`);
      if (method.accountHolderName) detailsToCopy.push(`Titular: ${method.accountHolderName}`);
      if (method.bankName) detailsToCopy.push(`Banco: ${method.bankName}`);
      if (method.accountNumber) detailsToCopy.push(`Nro. de Cuenta: ${method.accountNumber}`);
      if (method.rif) detailsToCopy.push(`RIF / Cédula: ${method.rif}`);
      if (method.phoneNumber) detailsToCopy.push(`Teléfono: ${method.phoneNumber}`);
      if (method.email) detailsToCopy.push(`Correo Electrónico: ${method.email}`);
      if (method.walletAddress) detailsToCopy.push(`Dirección de Wallet: ${method.walletAddress}`);
      if (method.network) detailsToCopy.push(`Red: ${method.network}`);
      if (method.binancePayId) detailsToCopy.push(`Binance Pay ID: ${method.binancePayId}`);
      textToCopy = detailsToCopy.join('\n').trim();
    }

    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setAllCopied(true);
      setTimeout(() => setAllCopied(false), 2000);
    }
  };

  return (
    <div className="bg-zinc-900/80 backdrop-blur-md border border-white/10 text-white rounded-2xl p-4 sm:p-6 mt-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 border-b border-white/10 pb-4">
        <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-3">
          <Wallet className="h-5 w-5 sm:h-6 sm:w-6 text-amber-400"/>
          Datos para {method.title}
        </h2>
        <p className="text-zinc-400 text-xs sm:text-sm text-right">
          Copia la información necesaria para realizar tu pago.
        </p>
      </div>
      
      <div className="bg-black/20 p-3 sm:p-4 rounded-xl border border-white/10 max-h-[50vh] overflow-y-auto">
        {/* Lógica condicional para mostrar el monto correcto */}
        {isPagoMovil && amount !== null && amount !== undefined && (
          <>
            <CopyableDetail
              label="Monto a pagar"
              value={formatAmount(amountToDisplay || 0, currencyToDisplay || 'VES')}
              icon={<DollarSign size={20}/>}
            />
            {currency === 'USD' && (
              <div className="bg-white/5 border-l-4 border-amber-400 p-3 mt-2 text-sm text-zinc-300">
                <p>Monto original: {formatAmount(amount, 'USD')}</p>
                {isLoadingRate ? (
                  <p className="flex items-center mt-1"><Loader2 className="animate-spin mr-2"/> Calculando monto en Bs...</p>
                ) : (
                  bcvRate ? (
                    <p className="mt-1">Tasa BCV: 1 USD = {formatAmount(bcvRate, 'VES')}</p>
                  ) : (
                    <p className="text-red-400 mt-1">No se pudo obtener la tasa de cambio.</p>
                  )
                )}
              </div>
            )}
          </>
        )}
        
        {/* Resto de los detalles (sin cambios) */}
        {method.accountHolderName && (
          <CopyableDetail
            label="Titular"
            value={method.accountHolderName}
            icon={<UserCircle size={20}/>}
          />
        )}
        {method.bankName && (
          <CopyableDetail
            label="Banco"
            value={method.bankName}
            icon={<Landmark size={20}/>}
          />
        )}
        {method.accountNumber && (
          <CopyableDetail
            label="Nro. de Cuenta"
            value={method.accountNumber}
            icon={<CreditCard size={20}/>}
          />
        )}
        {method.rif && (
          <CopyableDetail
            label="RIF / Cédula"
            value={method.rif}
            icon={<Fingerprint size={20}/>}
          />
        )}
        {method.phoneNumber && (
          <CopyableDetail
            label="Teléfono"
            value={method.phoneNumber}
            icon={<Phone size={20}/>}
          />
        )}
        {method.email && (
          <CopyableDetail
            label="Correo Electrónico"
            value={method.email}
            icon={<AtSign size={20}/>}
          />
        )}
        {method.walletAddress && (
          <CopyableDetail
            label="Dirección de Wallet"
            value={method.walletAddress}
            icon={<DollarSign size={20}/>}
          />
        )}
        {method.network && (
          <CopyableDetail
            label="Red"
            value={method.network}
            icon={<Globe size={20}/>}
          />
        )}
        {method.binancePayId && (
          <CopyableDetail
            label="Binance Pay ID"
            value={method.binancePayId}
            icon={<QrCode size={20}/>}
          />
        )}

        {isBinanceCrypto && currency === 'USDT' && (
          <div className="flex items-start gap-3 p-3 mt-4 bg-yellow-900/30 border border-yellow-800 rounded-lg">
            <Info className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5"/>
            <p className="text-sm text-yellow-200">
              <span className="font-bold">Importante:</span> Solo se aceptan pagos enviados en USDT. Cualquier otro tipo de criptomoneda no será procesado.
            </p>
          </div>
        )}
      </div>

      {(isPagoMovil || isBinancePay || isZinli) && (
        <div className="mt-4">
          <Button
            onClick={handleCopyAll}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-sm sm:text-base py-5"
          >
            {allCopied ? <Check className="mr-2 h-4 w-4 sm:h-5 sm:w-5" /> : <Copy className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />}
            {allCopied ? '¡Datos Copiados!' : `Copiar todo para ${method.title}`}
          </Button>
        </div>
      )}
    </div>
  );
}