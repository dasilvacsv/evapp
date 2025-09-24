// app/api/signature/sign/route.ts - API para procesar firmas

import { NextRequest, NextResponse } from 'next/server';
import { SignatureService } from '@/lib/signature-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { signerToken, fieldValues, signatureImage } = body;

    if (!signerToken || !fieldValues) {
      return NextResponse.json(
        { success: false, message: 'Datos requeridos faltantes' },
        { status: 400 }
      );
    }

    // Obtener información de la solicitud
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const ipAddress = forwardedFor?.split(',')[0] || realIp || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Procesar la firma
    const result = await SignatureService.signDocument(
      signerToken,
      fieldValues,
      signatureImage,
      ipAddress,
      userAgent
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: result.message,
      });
    } else {
      return NextResponse.json(
        { success: false, message: result.message },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Error procesando firma:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}