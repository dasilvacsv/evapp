// features/auth/actions.ts
'use server'

import { signOut } from "." // Importa desde tu archivo auth/index.ts

// Esta es tu Server Action. Se ejecutará de forma segura en el servidor.
export const handleSignOut = async () => {
  await signOut({ redirectTo: "/sign-in" })
}