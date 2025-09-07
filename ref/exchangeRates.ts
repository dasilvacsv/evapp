import axios from "axios"

// API endpoint for Venezuelan exchange rates
const EXCHANGE_RATE_API = "https://pydolarve.org/api/v1/dollar?page=alcambio&format_date=default&rounded_price=false"

interface RateInfo {
  rate: number
  lastUpdate: string
  isError?: boolean
}

// Cache for BCV rate to avoid frequent API calls
const bcvRateCache: RateInfo | null = null
const lastFetchTime: number | null = null
const CACHE_DURATION_MS = 3600000 // 1 hour
const FALLBACK_RATE = 36.42 // Fallback rate in case API fails

/**
 * Fetches the current BCV exchange rate
 */
export async function fetchBCVRate() {
  try {
    console.log("Fetching BCV exchange rate...")

    const response = await axios.get(EXCHANGE_RATE_API, {
      headers: {
        "Content-Type": "application/json",
      },
    })

    // Extract just the BCV rate from the API response
    const bcvRate = response.data.monitors.bcv.price
    const lastUpdate = response.data.monitors.bcv.last_update

    console.log(`Successfully fetched BCV rate: ${bcvRate}`)
    return {
      rate: bcvRate,
      lastUpdate: lastUpdate || new Date().toISOString(),
    }
  } catch (error) {
    console.error("Error fetching BCV rate:", error)
    // Return fallback rate if API fails
    return {
      rate: FALLBACK_RATE,
      lastUpdate: "No disponible",
      isError: true,
    }
  }
}

/**
 * Get BCV rate with caching to avoid excessive API calls
 */
export async function getBCVRate(): Promise<{ rate: number; lastUpdate: string; isError: boolean }> {
  try {
    // Try to fetch from BCV API
    const response = await fetch("https://api.exchangerate-api.com/v4/latest/USD", {
      next: { revalidate: 3600 }, // Revalidate every hour
    })

    if (!response.ok) {
      throw new Error("Failed to fetch BCV rate")
    }

    const data = await response.json()

    // Extract the VES (Venezuelan Bolivar) rate
    const rate = data?.rates?.VES || 35.0 // Default to 35 if not available

    return {
      rate,
      lastUpdate: new Date().toISOString(),
      isError: false,
    }
  } catch (error) {
    console.error("Error fetching BCV rate:", error)
    // Return a default rate if the API fails
    return {
      rate: 35.0,
      lastUpdate: new Date().toISOString(),
      isError: true,
    }
  }
}

/**
 * Formats a USD amount to VES using the current BCV rate
 */
export async function formatUsdToVes(usdAmount: number) {
  try {
    // Get the current BCV rate
    const rateInfo = await getBCVRate()
    const bcvRate = rateInfo.rate

    // Calculate amount in VES
    const vesAmount = usdAmount * bcvRate

    // Format with thousand separators and 2 decimal places
    const formattedVES = new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(vesAmount)

    return {
      rate: bcvRate,
      vesAmount: vesAmount,
      formattedVES: formattedVES,
      lastUpdate: rateInfo.lastUpdate,
    }
  } catch (error) {
    console.error("Error formatting USD to VES:", error)

    // Use fallback rate if error occurs
    const vesAmount = usdAmount * FALLBACK_RATE
    const formattedVES = new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(vesAmount)

    return {
      rate: FALLBACK_RATE,
      vesAmount: vesAmount,
      formattedVES: formattedVES,
      lastUpdate: "No disponible",
    }
  }
}

// FIXED: formatSaleCurrency function to properly handle BS formatting
export function formatSaleCurrency(amount: number, currencyType: "USD" | "BS" = "USD", conversionRate = 1) {
  // Validar y convertir parámetros
  const numericAmount = Number(amount) || 0
  const numericRate = Number(conversionRate) || 1

  if (currencyType === "BS") {
    const total = numericAmount * numericRate
    // Format for BS without USD symbol
    const formatted = new Intl.NumberFormat("es-VE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(total)
    
    return `${formatted} Bs`
  }

  // For USD, use proper currency formatting
  const formatter = new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return formatter.format(numericAmount)
}

// Convert between currencies
export function convertCurrency(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  conversionRate: number,
): number {
  if (fromCurrency === toCurrency) return amount

  if (fromCurrency === "USD" && toCurrency === "BS") {
    return amount * conversionRate
  } else if (fromCurrency === "BS" && toCurrency === "USD") {
    return amount / conversionRate
  }

  return amount
}