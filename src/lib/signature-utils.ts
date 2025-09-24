// lib/signature-utils.ts - Utilidades para el sistema de firma

import crypto from 'crypto';
import nodemailer from 'nodemailer';

/**
 * Genera un token seguro para acceso a documentos
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Configuración del transportador de email
 */
const createEmailTransporter = () => {
  // Configurar según tu proveedor de email
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

interface SendSignatureEmailData {
  to: string;
  signerName: string;
  documentTitle: string;
  signingUrl: string;
  customerName: string;
}

/**
 * Envía email de invitación para firma
 */
export async function sendSignatureEmail(data: SendSignatureEmailData): Promise<void> {
  try {
    const transporter = createEmailTransporter();

    const emailTemplate = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Documento para Firma Electrónica</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            max-width: 600px; 
            margin: 0 auto; 
            padding: 20px; 
        }
        .header { 
            background: #1a365d; 
            color: white; 
            padding: 20px; 
            border-radius: 8px; 
            text-align: center; 
        }
        .content { 
            padding: 30px 0; 
        }
        .button { 
            display: inline-block; 
            background: #3182ce; 
            color: white; 
            padding: 15px 30px; 
            text-decoration: none; 
            border-radius: 5px; 
            font-weight: bold; 
            text-align: center;
            margin: 20px 0;
        }
        .button:hover { 
            background: #2c5282; 
        }
        .footer { 
            border-top: 1px solid #eee; 
            padding-top: 20px; 
            font-size: 12px; 
            color: #666; 
        }
        .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🖊️ Firma Electrónica Requerida</h1>
        <p>MULTISERVICE JAD 5000 C.A.</p>
    </div>

    <div class="content">
        <h2>Hola ${data.signerName},</h2>
        
        <p>Se requiere su firma electrónica para completar el siguiente documento:</p>
        
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <strong>📋 Documento:</strong> ${data.documentTitle}<br>
            <strong>👤 Cliente:</strong> ${data.customerName}<br>
            <strong>📅 Fecha de envío:</strong> ${new Date().toLocaleDateString('es-ES')}
        </div>

        <p>Para revisar y firmar el documento, haga clic en el siguiente botón:</p>

        <div style="text-align: center;">
            <a href="${data.signingUrl}" class="button">
                ✍️ FIRMAR DOCUMENTO
            </a>
        </div>

        <div class="warning">
            <strong>⚠️ Importante:</strong>
            <ul>
                <li>Este enlace es único y personal. No lo comparta con terceros.</li>
                <li>El documento expirará en 30 días si no se firma.</li>
                <li>Su firma electrónica tiene la misma validez legal que una firma manuscrita.</li>
                <li>Asegúrese de completar todos los campos requeridos.</li>
            </ul>
        </div>

        <p>Si tiene alguna pregunta sobre este documento, por favor contacte a su agente de seguros.</p>

        <p>Gracias por su tiempo y colaboración.</p>
    </div>

    <div class="footer">
        <p><strong>MULTISERVICE JAD 5000 C.A.</strong></p>
        <p>
            📧 multiservicejad5000@gmail.com<br>
            📞 0212-7617671 / 0212-7635224 / 0412-0210824<br>
            🆔 RIF: J-40411244-8
        </p>
        <p style="margin-top: 15px; font-size: 11px;">
            Este correo fue enviado automáticamente. Por favor no responda a esta dirección de correo.
        </p>
    </div>
</body>
</html>
    `;

    const mailOptions = {
      from: `"MULTISERVICE JAD 5000" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: data.to,
      subject: `🖊️ Firma Requerida: ${data.documentTitle}`,
      html: emailTemplate,
      text: `
Hola ${data.signerName},

Se requiere su firma electrónica para el documento: ${data.documentTitle}

Para firmar, visite: ${data.signingUrl}

Este enlace expirará en 30 días.

Gracias,
MULTISERVICE JAD 5000 C.A.
      `.trim(),
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email de firma enviado a ${data.to}`);

  } catch (error) {
    console.error('Error enviando email de firma:', error);
    throw new Error('No se pudo enviar el email de firma');
  }
}

/**
 * Valida el formato de un email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Genera un hash para verificar la integridad del documento
 */
export function generateDocumentHash(content: Buffer): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Formatea fecha para mostrar en la interfaz
 */
export function formatSignatureDate(date: Date): string {
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/**
 * Valida que una firma base64 sea válida
 */
export function isValidSignatureImage(base64: string): boolean {
  try {
    if (!base64.startsWith('data:image/')) return false;
    const base64Data = base64.split(',')[1];
    Buffer.from(base64Data, 'base64');
    return true;
  } catch {
    return false;
  }
}