// /app/api/auth/[...nextauth]/route.ts

import { handlers } from '@/lib/auth'; // Ajusta la ruta a tu archivo auth.ts si es necesario
export const { GET, POST } = handlers;