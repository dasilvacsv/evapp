// app/api/signature/signer/[token]/route.ts - API para obtener datos del firmante

import { NextRequest, NextResponse } from 'next/server';
import { SignatureService } from '@/lib/signature-service';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const token = params.token;

    if (!token) {
      return NextResponse.json(
        { success: false, message: 'Token requerido' },
        { status: 400 }
      );
    }

    const signer = await SignatureService.getSignerByToken(token);

    if (!signer) {
      return NextResponse.json(
        { success: false, message: 'Firmante no encontrado o enlace inválido' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      signer,
    });

  } catch (error) {
    console.error('Error obteniendo firmante:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}