// (admin)/customers/lib/carriers-data.ts

/**
 * Este objeto mapea la abreviatura de cada estado de EE. UU. a una lista
 * de las aseguradoras disponibles, extraídas de tu archivo de datos.
 * La lista de aseguradoras para cada estado está ordenada alfabéticamente.
 */
export const CARRIERS_BY_STATE: Record<string, string[]> = {
    "AL": ["AMBETTER", "UNITED"],
    "AR": ["AMBETTER"],
    "AZ": ["AETNA", "AMBETTER", "CIGNA", "OSCAR", "UNITED"],
    "CA": ["AETNA", "ANTHEM", "KEISER", "MOLINA"],
    "CO": ["ANTHEM", "CIGNA", "KEISER", "UNITED"],
    "CT": ["ANTHEM"],
    "DE": ["AETNA", "AMBETTER", "AMERIHEALTH CARITAS"],
    "FL": ["AETNA", "AMBETTER", "AMERIHEALTH CARITAS", "CIGNA", "MOLINA", "OSCAR", "UNITED", "WELLPOINT"],
    "GA": ["AETNA", "AMBETTER", "ANTHEM", "CARESOURCE", "CIGNA", "KEISER", "OSCAR", "UNITED"],
    "IA": ["AMBETTER", "OSCAR", "UNITED"],
    "ID": ["MOLINA"],
    "IL": ["AETNA", "AMBETTER", "BLUECROSS", "CIGNA", "OSCAR", "UNITED"],
    "IN": ["AETNA", "AMBETTER", "ANTHEM", "CARESOURCE", "CIGNA", "UNITED"],
    "KS": ["AETNA", "AMBETTER", "MEDICA", "OSCAR", "UNITED"],
    "KY": ["ANTHEM", "CARESOURCE", "MOLINA", "WELLCARE"],
    "LA": ["AMBETTER", "UNITED"],
    "MD": ["AETNA", "KEISER", "UNITED", "WELLPOINT"],
    "ME": ["ANTHEM"],
    "MI": ["AMBETTER", "BLUECROSS", "MOLINA", "OSCAR", "UNITED"],
    "MN": ["MEDICA"],
    "MO": ["AETNA", "AMBETTER", "ANTHEM", "MEDICA", "OSCAR", "UNITED"],
    "MS": ["CIGNA", "MOLINA", "UNITED"],
    "MT": ["BLUECROSS"],
    "NC": ["AETNA", "AMBETTER", "AMERIHEALTH CARITAS", "CARESOURCE", "CIGNA", "OSCAR", "UNITED"],
    "NE": ["AMBETTER", "MEDICA", "OSCAR", "UNITED"],
    "NH": ["AMBETTER", "ANTHEM"],
    "NJ": ["AETNA", "OSCAR", "UNITED", "WELLCARE"],
    "NM": ["BLUECROSS", "MOLINA"],
    "OH": ["AETNA", "AMBETTER", "ANTHEM", "CARESOURCE", "MOLINA", "OSCAR", "UNITED"],
    "OK": ["AMBETTER", "BLUECROSS", "MEDICA", "OSCAR", "UNITED"],
    "SC": ["AMBETTER", "BLUECROSS", "CARESOURCE", "MOLINA"],
    "TN": ["AETNA", "AMBETTER", "BLUECROSS", "CIGNA", "OSCAR", "UNITED"],
    "TX": ["AETNA", "AMBETTER", "BLUECROSS", "CIGNA", "MOLINA", "OSCAR", "UNITED"],
    "UT": ["MOLINA", "UNITED"],
    "VA": ["AETNA", "ANTHEM", "CARESOURCE", "UNITED"],
    "WI": ["MOLINA", "OSCAR", "UNITED"]
};