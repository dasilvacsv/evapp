import axios from "axios";

// --- API Configuration ---
// API para la tasa oficial del Dólar (BCV)
const DOLARAPI_USD_API = "https://ve.dolarapi.com/v1/dolares/oficial";
// API para obtener la tasa de cambio de Euro a Dólar
const FRANKFURTER_EUR_USD_API = "https://api.frankfurter.app/latest?from=EUR&to=USD";


// --- Interfaces and Constants ---
interface RateInfo {
  rate: number;
  lastUpdate: string;
  isError?: boolean;
}

// Caché para las tasas para evitar llamadas frecuentes a la API
let bcvRateCache: { usd: RateInfo | null; eur: RateInfo | null } = { usd: null, eur: null };
let lastFetchTime: number | null = null;
const CACHE_DURATION_MS = 3600000; // 1 hora
const FALLBACK_USD_RATE = 36.42; // Tasa de respaldo para USD
const FALLBACK_EUR_USD_RATE = 1.08; // Tasa de respaldo para la conversión de EUR a USD
const FALLBACK_EUR_RATE = FALLBACK_USD_RATE * FALLBACK_EUR_USD_RATE; // Tasa de respaldo para EUR en VES

/**
 * Obtiene las tasas de cambio actuales para USD y EUR.
 * La tasa del Euro se calcula haciendo una conversión cruzada:
 * 1. Se obtiene la tasa EUR -> USD.
 * 2. Se obtiene la tasa USD -> VES (BCV).
 * 3. Se multiplican ambas tasas para obtener EUR -> VES.
 */
export async function fetchBCVRates() {
  // 1. Revisa si existe un caché válido para evitar llamadas innecesarias
  if (
    bcvRateCache.usd &&
    bcvRateCache.eur &&
    lastFetchTime &&
    Date.now() - lastFetchTime < CACHE_DURATION_MS
  ) {
    console.log("Usando tasas BCV desde el caché.");
    return bcvRateCache;
  }

  console.log("Buscando tasas de cambio actualizadas para USD y EUR...");

  try {
    // 2. Realiza llamadas concurrentes a las APIs para obtener ambas tasas
    const [usdToVesResult, eurToUsdResult] = await Promise.allSettled([
      axios.get(DOLARAPI_USD_API, { timeout: 10000 }),
      axios.get(FRANKFURTER_EUR_USD_API, { timeout: 10000 }),
    ]);

    let usdRateInfo: RateInfo;
    let eurRateInfo: RateInfo;
    let currentUsdToVesRate = FALLBACK_USD_RATE;
    let lastUpdateTimestamp = new Date().toISOString();

    // 3. Procesa la respuesta de USD -> VES de ve.dolarapi.com
    if (usdToVesResult.status === "fulfilled" && usdToVesResult.value.data?.promedio) {
      currentUsdToVesRate = usdToVesResult.value.data.promedio;
      lastUpdateTimestamp = usdToVesResult.value.data.fechaActualizacion || lastUpdateTimestamp;
      usdRateInfo = {
        rate: currentUsdToVesRate,
        lastUpdate: lastUpdateTimestamp,
        isError: false,
      };
      console.log(`Tasa USD obtenida exitosamente: ${usdRateInfo.rate}`);
    } else {
      console.error("Error al obtener la tasa USD de DolarAPI:", usdToVesResult.status === 'rejected' ? usdToVesResult.reason : "Estructura de datos inválida");
      usdRateInfo = {
        rate: FALLBACK_USD_RATE,
        lastUpdate: "No disponible",
        isError: true,
      };
    }

    // 4. Procesa la respuesta de EUR -> USD y calcula la tasa EUR -> VES
    if (eurToUsdResult.status === "fulfilled" && eurToUsdResult.value.data?.rates?.USD) {
      const eurToUsdRate = eurToUsdResult.value.data.rates.USD;
      const calculatedEurRate = eurToUsdRate * currentUsdToVesRate; // Cálculo cruzado
      eurRateInfo = {
        rate: calculatedEurRate,
        lastUpdate: lastUpdateTimestamp, // Usa la misma fecha de actualización que el BCV
        isError: false,
      };
      console.log(`Tasa EUR -> USD obtenida: ${eurToUsdRate}. Tasa EUR -> VES calculada: ${eurRateInfo.rate}`);
    } else {
      console.error("Error al obtener la tasa EUR de Frankfurter:", eurToUsdResult.status === 'rejected' ? eurToUsdResult.reason : "Estructura de datos inválida");
      eurRateInfo = {
        rate: currentUsdToVesRate * FALLBACK_EUR_USD_RATE, // Usa el fallback pero con la tasa de USD actual si está disponible
        lastUpdate: "No disponible",
        isError: true,
      };
    }

    // 5. Actualiza el caché con las nuevas tasas
    bcvRateCache = { usd: usdRateInfo, eur: eurRateInfo };
    lastFetchTime = Date.now();

    return bcvRateCache;

  } catch (error) {
    console.error("Ocurrió un error general durante el proceso de obtención de tasas:", error);
    // En caso de una falla catastrófica, retorna tasas de respaldo para ambas
    bcvRateCache = {
      usd: { rate: FALLBACK_USD_RATE, lastUpdate: "No disponible", isError: true },
      eur: { rate: FALLBACK_EUR_RATE, lastUpdate: "No disponible", isError: true },
    };
    lastFetchTime = Date.now();
    return bcvRateCache;
  }
}

/**
 * Obtiene las tasas BCV, utilizando el caché. Esta es la función principal a llamar desde tu aplicación.
 */
export async function getBCVRates(): Promise<{ usd: RateInfo; eur: RateInfo }> {
  try {
    const rates = await fetchBCVRates();
    // La aserción no nula (!) es segura aquí porque fetchBCVRates siempre devuelve un objeto completo
    return {
      usd: rates.usd!,
      eur: rates.eur!,
    };
  } catch (error) {
    console.error("Error en getBCVRates:", error);
    // Retorna un objeto de respaldo en caso de errores inesperados
    return {
      usd: { rate: FALLBACK_USD_RATE, lastUpdate: new Date().toISOString(), isError: true },
      eur: { rate: FALLBACK_EUR_RATE, lastUpdate: new Date().toISOString(), isError: true },
    };
  }
}

/**
 * Formatea una cantidad en moneda extranjera (USD o EUR) a bolívares (VES).
 */
export async function formatForeignCurrencyToVes(amount: number, currency: "USD" | "EUR") {
  try {
    const rates = await getBCVRates();
    const rateInfo = currency === "EUR" ? rates.eur : rates.usd;
    const vesAmount = amount * rateInfo.rate;

    const formattedVES = new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(vesAmount);

    return {
      rate: rateInfo.rate,
      vesAmount,
      formattedVES,
      lastUpdate: rateInfo.lastUpdate,
      isError: rateInfo.isError || false,
    };
  } catch (error) {
    console.error(`Error formateando ${currency} a VES:`, error);
    const fallbackRate = currency === "EUR" ? FALLBACK_EUR_RATE : FALLBACK_USD_RATE;
    const vesAmount = amount * fallbackRate;
    const formattedVES = new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(vesAmount);

    return {
      rate: fallbackRate,
      vesAmount,
      formattedVES,
      lastUpdate: "No disponible",
      isError: true,
    };
  }
}

/**
 * Formatea un número en una cadena de moneda con el símbolo apropiado ($ o €).
 */
export function formatCurrencyWithSymbol(amount: number, useEuro: boolean = false) {
  const numericAmount = Number(amount) || 0;
  const currency = useEuro ? "EUR" : "USD";
  const locale = useEuro ? "es-ES" : "es-VE"; // Usa el locale de España para el Euro para la posición correcta del símbolo

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericAmount);
}

/**
 * Formatea una cantidad de moneda y proporciona su conversión a VES en un solo objeto.
 * ej., "$10.00 (364.20 Bs)"
 */
export async function formatCurrencyWithBCV(amount: number, useEuro: boolean = false) {
  const numericAmount = Number(amount) || 0;
  const currency = useEuro ? "EUR" : "USD";
  const originalFormat = formatCurrencyWithSymbol(numericAmount, useEuro);

  try {
    const conversion = await formatForeignCurrencyToVes(numericAmount, currency);

    return {
      original: originalFormat,
      converted: `${conversion.formattedVES} Bs`,
      rate: conversion.rate,
      fullDisplay: `${originalFormat} (${conversion.formattedVES} Bs)`,
      lastUpdate: conversion.lastUpdate,
      isError: conversion.isError,
    };
  } catch (error) {
    console.error("Error obteniendo la conversión BCV:", error);
    return {
      original: originalFormat,
      converted: "Error de conversión",
      rate: 0,
      fullDisplay: originalFormat, // Muestra la cantidad original incluso si la conversión falla
      lastUpdate: "No disponible",
      isError: true,
    };
  }
}

// --- Funciones Legacy para Compatibilidad con Versiones Anteriores ---

export function formatSaleCurrency(amount: number, currencyType: "USD" | "BS" = "USD", conversionRate = 1) {
  const numericAmount = Number(amount) || 0;
  const numericRate = Number(conversionRate) || 1;
  const formatter = new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  if (currencyType === "BS") {
    const total = numericAmount * numericRate;
    return formatter.format(total).replace(/\$\s?/, "").trim() + " Bs"; // Eliminación más robusta del símbolo
  }

  return formatter.format(numericAmount).replace("$", "$ ").trim();
}

export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  conversionRate: number
): number {
  if (fromCurrency === toCurrency) return amount;

  if (fromCurrency === "USD" && toCurrency === "BS") {
    return amount * conversionRate;
  } else if (fromCurrency === "BS" && toCurrency === "USD") {
    if (conversionRate === 0) return 0; // Evitar división por cero
    return amount / conversionRate;
  }

  return amount;
}
