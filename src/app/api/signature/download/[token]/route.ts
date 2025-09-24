// app/api/signature/download/[token]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { SignatureService } from '@/lib/signature-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;
    if (!token) {
      return NextResponse.json({ success: false, message: 'Token requerido' }, { status: 400 });
    }

    // Primero, intenta obtener el firmante por su token.
    const signer = await SignatureService.getSignerByToken(token);
    if (!signer) {
        return NextResponse.json({ success: false, message: 'Enlace no válido.' }, { status: 404 });
    }

    const documentId = signer.document.id;
    const result = await SignatureService.getSignedDocumentUrl(documentId);

    if (result.success) {
      return NextResponse.json(result);
    }

    // Si el documento aún no está listo, devolvemos un estado especial para que el frontend pueda reintentar.
    if (result.message.includes('aún no ha sido completado')) {
        return NextResponse.json({ success: false, status: 'pending_completion', message: result.message }, { status: 202 });
    }
    if (result.message.includes('no está disponible')) {
        return NextResponse.json({ success: false, status: 'processing', message: result.message }, { status: 202 });
    }

    return NextResponse.json({ success: false, message: result.message }, { status: 400 });

  } catch (error) {
    console.error('Error en API de descarga:', error);
    return NextResponse.json({ success: false, message: 'Error interno del servidor' }, { status: 500 });
  }
}