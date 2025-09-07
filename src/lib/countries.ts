// lib/countries.ts

export interface Country {
  name: string;
  flag: string;
  code: string;
  dial_code: string;
}

export const countries: Country[] = [
  { name: 'Venezuela', flag: '🇻🇪', code: 'VE', dial_code: '+58' },
  { name: 'United States', flag: '🇺🇸', code: 'US', dial_code: '+1' },
  { name: 'Colombia', flag: '🇨🇴', code: 'CO', dial_code: '+57' },
  { name: 'Spain', flag: '🇪🇸', code: 'ES', dial_code: '+34' },
  { name: 'Argentina', flag: '🇦🇷', code: 'AR', dial_code: '+54' },
  { name: 'Brazil', flag: '🇧🇷', code: 'BR', dial_code: '+55' },
  { name: 'Chile', flag: '🇨🇱', code: 'CL', dial_code: '+56' },
  { name: 'Mexico', flag: '🇲🇽', code: 'MX', dial_code: '+52' },
  { name: 'Peru', flag: '🇵🇪', code: 'PE', dial_code: '+51' },
  // ... Puedes agregar todos los países que necesites aquí
  // Busca en internet "list of country codes with flags emoji" para una lista completa
];