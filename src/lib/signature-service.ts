// lib/signature-service.ts - Servicio principal de firma electrónica

import { db } from '@/lib/db';
import { signatureDocuments, documentSigners, documentFields, documentAuditLog } from '@/db/schema';
import { customers, users, policies } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { generateSecureToken, sendSignatureEmail } from '@/lib/signature-utils';
// --- MODIFICADO: Importar la nueva función y quitar la que ya no se usa ---
import { getPresignedUrlForDownload, getObjectBuffer, uploadObjectBuffer } from '@/lib/s3';
import { AORPDFGenerator } from '@/lib/aor-pdf-generator';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface CreateSignatureDocumentData {
  title: string;
  customerId: string;
  policyId: string;
  createdById: string;
  signers: Array<{
    name: string;
    email: string;
    role?: string;
  }>;
  expiresInDays?: number;
}

interface AORGenerationData {
  customerId: string;
  policyId: string;
  policyData: {
    insuranceCompany: string;
    planName: string;
    marketplaceId?: string;
    effectiveDate?: string;
    monthlyPremium?: string;
  };
  createdByAgentId: string;
}

export class SignatureService {

  /**
   * Crea un documento para firma electrónica
   */
  static async createSignatureDocument(
    pdfBuffer: Buffer,
    fileName: string,
    data: CreateSignatureDocumentData
  ) {
    try {
      // 1. Subir PDF original a S3 (usando la nueva función directa)
      const s3Key = `signature-docs/${Date.now()}-${fileName}`;
      await uploadObjectBuffer(s3Key, pdfBuffer, 'application/pdf');


      // 2. Crear documento en la base de datos
      const publicToken = generateSecureToken(32);
      const expiresAt = data.expiresInDays
        ? new Date(Date.now() + (data.expiresInDays * 24 * 60 * 60 * 1000))
        : new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)); // 30 días por defecto

      const [document] = await db.insert(signatureDocuments).values({
        title: data.title,
        originalFileName: fileName,
        s3Key,
        customerId: data.customerId,
        policyId: data.policyId,
        createdById: data.createdById,
        publicToken,
        expiresAt,
      }).returning();

      // 3. Crear firmantes
      const signers = await Promise.all(
        data.signers.map(async (signerData) => {
          const signerToken = generateSecureToken(32);
          const [signer] = await db.insert(documentSigners).values({
            documentId: document.id,
            name: signerData.name,
            email: signerData.email,
            role: signerData.role || 'signer',
            signerToken,
          }).returning();
          return signer;
        })
      );

      // 4. Crear campos de firma automáticamente usando el PDF
      await this.createSignatureFields(document.id, signers);

      // 5. Crear log de auditoría
      await db.insert(documentAuditLog).values({
        documentId: document.id,
        action: 'document_created',
        details: {
          title: data.title,
          signerCount: signers.length,
          createdBy: data.createdById
        },
      });

      return {
        document,
        signers,
        publicUrl: `${process.env.NEXTAUTH_URL}/sign/${publicToken}`,
      };

    } catch (error) {
      console.error('Error creando documento de firma:', error);
      throw new Error(`No se pudo crear el documento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Crea campos de firma automáticamente para un documento
   */
  private static async createSignatureFields(documentId: string, signers: any[]) {
    const fields = [];

    // Para cada firmante, crear campos predeterminados
    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];
      const baseY = 600 - (i * 150); // Espaciar campos verticalmente

      // Campo de firma
      fields.push({
        documentId,
        signerId: signer.id,
        type: 'signature' as const,
        label: `Firma - ${signer.name}`,
        page: 1,
        x: 100,
        y: baseY,
        width: 200,
        height: 60,
        required: true,
      });

      // Campo de fecha
      fields.push({
        documentId,
        signerId: signer.id,
        type: 'date' as const,
        label: `Fecha - ${signer.name}`,
        page: 1,
        x: 320,
        y: baseY + 20,
        width: 120,
        height: 25,
        required: true,
      });

      // Campo de nombre
      fields.push({
        documentId,
        signerId: signer.id,
        type: 'name' as const,
        label: `Nombre - ${signer.name}`,
        page: 1,
        x: 100,
        y: baseY + 70,
        width: 200,
        height: 25,
        required: true,
      });
    }

    if (fields.length > 0) {
      await db.insert(documentFields).values(fields);
    }
  }

  /**
   * Envía documento para firma
   */
  static async sendDocumentForSigning(documentId: string) {
    try {
      const document = await db.query.signatureDocuments.findFirst({
        where: eq(signatureDocuments.id, documentId),
        with: {
          signers: true,
          customer: true,
        },
      });

      if (!document) {
        throw new Error('Documento no encontrado');
      }

      // Enviar email a cada firmante
      const emailPromises = document.signers.map(signer =>
        sendSignatureEmail({
          to: signer.email,
          signerName: signer.name,
          documentTitle: document.title,
          signingUrl: `${process.env.NEXTAUTH_URL}/sign/${signer.signerToken}`,
          customerName: document.customer?.fullName || 'Cliente',
        })
      );

      await Promise.all(emailPromises);

      // Actualizar estado del documento
      await db.update(signatureDocuments)
        .set({
          status: 'sent',
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(signatureDocuments.id, documentId));

      // Log de auditoría
      await db.insert(documentAuditLog).values({
        documentId: document.id,
        action: 'document_sent',
        details: {
          sentTo: document.signers.map(s => s.email),
          sentAt: new Date().toISOString(),
        },
      });

      return { success: true, message: 'Documento enviado para firma' };

    } catch (error) {
      console.error('Error enviando documento:', error);
      throw new Error(`No se pudo enviar el documento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene un documento por token público
   */
  static async getDocumentByToken(token: string) {
    try {
      const document = await db.query.signatureDocuments.findFirst({
        where: eq(signatureDocuments.publicToken, token),
        with: {
          signers: {
            with: {
              fields: true,
            }
          },
          customer: true,
          createdBy: true,
        },
      });

      if (!document) {
        return null;
      }

      // Verificar si el documento ha expirado
      if (document.expiresAt && new Date() > document.expiresAt) {
        return { ...document, expired: true };
      }

      return document;

    } catch (error) {
      console.error('Error obteniendo documento por token:', error);
      return null;
    }
  }

  /**
   * Obtiene un firmante por token
   */
  static async getSignerByToken(token: string) {
    try {
      const signer = await db.query.documentSigners.findFirst({
        where: eq(documentSigners.signerToken, token),
        with: {
          document: {
            with: {
              customer: true,
            }
          },
          fields: true,
        },
      });

      if (!signer) {
        return null;
      }

      // Verificar si el documento ha expirado
      if (signer.document.expiresAt && new Date() > signer.document.expiresAt) {
        return { ...signer, expired: true };
      }

      return signer;

    } catch (error) {
      console.error('Error obteniendo firmante por token:', error);
      return null;
    }
  }

  /**
   * Marca un documento como visualizado
   */
  static async markDocumentAsViewed(signerToken: string, ipAddress?: string, userAgent?: string) {
    try {
      const signer = await this.getSignerByToken(signerToken);

      if (!signer || signer.status !== 'pending') {
        return { success: false, message: 'Firmante no encontrado o ya procesado' };
      }

      await db.update(documentSigners)
        .set({
          status: 'viewed',
          viewedAt: new Date(),
          ipAddress,
          userAgent,
          updatedAt: new Date(),
        })
        .where(eq(documentSigners.signerToken, signerToken));

      // Log de auditoría
      await db.insert(documentAuditLog).values({
        documentId: signer.document.id,
        signerId: signer.id,
        action: 'document_viewed',
        details: { viewedAt: new Date().toISOString() },
        ipAddress,
        userAgent,
      });

      return { success: true };

    } catch (error) {
      console.error('Error marcando documento como visto:', error);
      return { success: false, message: 'Error interno' };
    }
  }
  
  /**
   * --- NUEVO: Proporciona una URL de descarga para un documento firmado ---
   * Se usará tanto para el cliente como para el panel de administración.
   * @param documentId El ID del documento de firma.
   * @param checkStatus Si es true, solo devuelve la URL si el estado es 'completed'.
   */
  static async getSignedDocumentUrl(documentId: string, checkStatus: boolean = true) {
    const document = await db.query.signatureDocuments.findFirst({
        where: eq(signatureDocuments.id, documentId),
        columns: { status: true, signedS3Key: true },
    });

    if (!document) {
        return { success: false, message: 'Documento no encontrado.' };
    }

    if (checkStatus && document.status !== 'completed') {
        return { success: false, message: 'El documento aún no ha sido completado por todos los firmantes.' };
    }

    if (!document.signedS3Key) {
        return { success: false, message: 'El archivo firmado no está disponible. Por favor, intente de nuevo en unos momentos.' };
    }
    
    try {
        const downloadUrl = await getPresignedUrlForDownload(document.signedS3Key);
        return { success: true, url: downloadUrl };
    } catch (error) {
        console.error('Error generando URL de descarga:', error);
        return { success: false, message: 'Error al generar el enlace de descarga.' };
    }
  }

  /**
   * Procesa la firma de un documento
   */
  static async signDocument(
    signerToken: string,
    fieldValues: Record<string, string>,
    signatureImageBase64?: string,
    ipAddress?: string,
    userAgent?: string
  ) {
    try {
      const signer = await this.getSignerByToken(signerToken);

      if (!signer) {
        return { success: false, message: 'Firmante no encontrado' };
      }

      if (signer.document.expiresAt && new Date() > signer.document.expiresAt) {
        return { success: false, message: 'El documento ha expirado' };
      }

      if (signer.status === 'signed') {
        return { success: false, message: 'Ya ha firmado este documento' };
      }

      // Subir imagen de firma si se proporciona
      let signatureImageS3Key = null;
      if (signatureImageBase64) {
        signatureImageS3Key = await this.uploadSignatureImage(signatureImageBase64, signer.id);
      }

      // Actualizar campos con los valores proporcionados
      const updatePromises = signer.fields.map(field => {
        const value = fieldValues[field.id] || '';
        return db.update(documentFields)
          .set({
            value,
            signedAt: new Date(),
          })
          .where(eq(documentFields.id, field.id));
      });

      await Promise.all(updatePromises);

      // Actualizar estado del firmante
      await db.update(documentSigners)
        .set({
          status: 'signed',
          signedAt: new Date(),
          signatureImageS3Key,
          ipAddress,
          userAgent,
          updatedAt: new Date(),
        })
        .where(eq(documentSigners.id, signer.id));
        
      // --- MODIFICADO: Llama a `checkDocumentCompletion` después de la transacción ---
      const documentId = signer.document.id;

      // Log de auditoría
      await db.insert(documentAuditLog).values({
        documentId: documentId,
        signerId: signer.id,
        action: 'document_signed',
        details: { 
          signedAt: new Date().toISOString(),
          fieldsCount: Object.keys(fieldValues).length,
        },
        ipAddress,
        userAgent,
      });

      // --- Se llama fuera de la transacción principal para evitar bloqueos ---
      // Esta función ahora es asíncrona y no bloquea la respuesta al usuario.
      this.checkDocumentCompletion(documentId).catch(err => {
        console.error(`Error en el proceso de completado en segundo plano para el documento ${documentId}:`, err);
      });

      return { success: true, message: 'Documento firmado exitosamente' };

    } catch (error) {
      console.error('Error firmando documento:', error);
      return { success: false, message: 'Error interno al firmar' };
    }
  }

  /**
   * Verifica si el documento está completado
   */
  private static async checkDocumentCompletion(documentId: string) {
    try {
      const document = await db.query.signatureDocuments.findFirst({
        where: eq(signatureDocuments.id, documentId),
        with: {
          signers: true,
          policy: true,
        },
      });

      if (!document) return;

      const allSigned = document.signers.every(signer =>
        signer.status === 'signed' || signer.role === 'viewer'
      );

      if (allSigned && document.status !== 'completed') {
        // --- MODIFICADO: Llamada a la función real de generación de PDF ---
        console.log(`Todos han firmado el documento ${document.id}. Generando PDF final...`);
        await this.generateSignedPDF(document.id);

        // Actualizar estado del documento
        await db.update(signatureDocuments)
          .set({
            status: 'completed',
            completedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(signatureDocuments.id, documentId));

        // Actualizar estado de la póliza si es un AOR
        if (document.policy && document.title.includes('AOR')) {
          await db.update(policies)
            .set({
              status: 'info_captured',
              updatedAt: new Date(),
            })
            .where(eq(policies.id, document.policy.id));
        }

        // Log de auditoría
        await db.insert(documentAuditLog).values({
          documentId: document.id,
          action: 'document_completed',
          details: {
            completedAt: new Date().toISOString(),
            allSignersCount: document.signers.length,
          },
        });
      }

    } catch (error) {
      console.error('Error verificando completitud del documento:', error);
    }
  }

  /**
   * Sube imagen de firma a S3
   */
  private static async uploadSignatureImage(base64Data: string, signerId: string): Promise<string> {
    try {
      // Convertir base64 a buffer
      const base64WithoutPrefix = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
      const buffer = Buffer.from(base64WithoutPrefix, 'base64');
  
      const s3Key = `signatures/${signerId}-${Date.now()}.png`;
  
      // Usar la función de subida directa
      await uploadObjectBuffer(s3Key, buffer, 'image/png');
  
      return s3Key;
  
    } catch (error) {
      console.error('Error subiendo imagen de firma:', error);
      throw new Error('Error subiendo imagen de firma');
    }
  }
  
  /**
   * --- REIMPLEMENTADO (Y CORREGIDO): Genera el PDF final con los datos y firmas ---
   */
  private static async generateSignedPDF(documentId: string) {
    try {
        const document = await db.query.signatureDocuments.findFirst({
            where: eq(signatureDocuments.id, documentId),
            with: {
                signers: { with: { fields: true } },
            },
        });

        if (!document || !document.s3Key) {
            throw new Error('Documento o S3 Key original no encontrado.');
        }
        console.log(`[generateSignedPDF] Iniciando para doc ID: ${documentId}. Key original: ${document.s3Key}`);

        // 1. Descargar el PDF original de S3
        console.log('[generateSignedPDF] Descargando PDF original...');
        const originalPdfBuffer = await getObjectBuffer(document.s3Key);
        const pdfDoc = await PDFDocument.load(originalPdfBuffer);
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        console.log('[generateSignedPDF] PDF original cargado en memoria.');

        // 2. Recorrer y estampar todos los campos
        const allFields = document.signers.flatMap(s => s.fields);
        for (const field of allFields) {
            if (!field.value) continue;

            const page = pdfDoc.getPages()[field.page - 1];
            if (!page) continue;

            // Posición Y en pdf-lib se mide desde abajo, mientras que la nuestra es desde arriba.
            const pageHeight = page.getHeight();
            const y = pageHeight - field.y - field.height;

            switch (field.type) {
                case 'signature':
                    const signer = document.signers.find(s => s.id === field.signerId);
                    if (signer?.signatureImageS3Key) {
                        const signatureImgBuffer = await getObjectBuffer(signer.signatureImageS3Key);
                        const signatureImage = await pdfDoc.embedPng(signatureImgBuffer);
                        page.drawImage(signatureImage, {
                            x: field.x,
                            y: y,
                            width: field.width,
                            height: field.height,
                        });
                    }
                    break;

                case 'date':
                case 'name':
                case 'email':
                case 'text':
                    page.drawText(field.value, {
                        x: field.x + 5, // Pequeño padding
                        y: y + (field.height / 4), // Alinear verticalmente
                        font: helveticaFont,
                        size: 12,
                        color: rgb(0, 0, 0),
                    });
                    break;
            }
        }
        console.log('[generateSignedPDF] Todos los campos han sido estampados en el PDF.');

        // 3. Guardar el nuevo PDF en un buffer
        const signedPdfBytes = await pdfDoc.save();
        const signedPdfBuffer = Buffer.from(signedPdfBytes);
        console.log(`[generateSignedPDF] PDF firmado generado. Tamaño: ${signedPdfBuffer.length} bytes.`);

        // 4. --- CORRECCIÓN CLAVE: Usar uploadObjectBuffer para subir el PDF firmado ---
        const signedS3Key = document.s3Key.replace('.pdf', '-signed.pdf');

        console.log(`[generateSignedPDF] Subiendo PDF firmado a S3 con la clave: ${signedS3Key}...`);
        await uploadObjectBuffer(
            signedS3Key,
            signedPdfBuffer,
            'application/pdf'
        );

        // 5. Actualizar la base de datos con la nueva clave
        await db.update(signatureDocuments)
            .set({ signedS3Key: signedS3Key, updatedAt: new Date() })
            .where(eq(signatureDocuments.id, documentId));

        console.log(`✅ [generateSignedPDF] Proceso completado para el documento ${documentId}.`);
        return signedS3Key;

    } catch (error) {
        console.error(`[generateSignedPDF] Error CRÍTICO generando PDF firmado para el ID ${documentId}:`, error);
        // Es importante relanzar el error para que el proceso que lo llamó sepa que falló.
        throw error;
    }
  }


  /**
   * Crear y enviar AOR (reemplaza la funcionalidad de Documenso)
   */
  static async createAndSendAOR(data: AORGenerationData): Promise<{ id: string; signingUrl: string; }> {
    try {
      // 1. Obtener datos del cliente y agente
      const [customer, agent] = await Promise.all([
        db.query.customers.findFirst({ where: eq(customers.id, data.customerId) }),
        db.query.users.findFirst({ where: eq(users.id, data.createdByAgentId) })
      ]);

      if (!customer) throw new Error('Cliente no encontrado');
      if (!agent) throw new Error('Agente no encontrado');
      if (!customer.email) throw new Error('El cliente debe tener un email');

      // 2. Generar PDF del AOR
      console.log(`Generando PDF para ${customer.fullName}...`);
      const pdfBuffer = await AORPDFGenerator.generateAORPDF({
        customer: {
          fullName: customer.fullName,
          email: customer.email,
          phone: customer.phone || undefined,
          address: customer.address || undefined,
          ssn: customer.ssn || undefined,
          birthDate: customer.birthDate || undefined,
        },
        agent: {
          fullName: agent.name || `${agent.firstName} ${agent.lastName}`,
          email: agent.email,
        },
        policy: data.policyData,
        createdAt: new Date(),
      });

      // 3. Crear documento para firma
      const documentData = {
        title: `AOR - ${customer.fullName} - ${data.policyData.insuranceCompany}`,
        customerId: data.customerId,
        policyId: data.policyId,
        createdById: data.createdByAgentId,
        signers: [
          {
            name: customer.fullName,
            email: customer.email,
            role: 'signer',
          }
        ],
        expiresInDays: 30,
      };

      const result = await this.createSignatureDocument(
        pdfBuffer,
        `AOR_${customer.fullName.replace(/\s+/g, '_')}.pdf`,
        documentData
      );

      // 4. OMITIR envío de email y actualizar estado manualmente
      // La siguiente línea que causaba el error ha sido desactivada.
      // await this.sendDocumentForSigning(result.document.id);

      // En su lugar, actualizamos el estado del documento a 'sent' directamente.
      // Esto es importante para que el flujo de la aplicación continúe correctamente.
      await db.update(signatureDocuments)
        .set({
          status: 'sent',
          sentAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(signatureDocuments.id, result.document.id));

      console.log('✅ Proceso de AOR completado. El email NO fue enviado, pero el enlace de firma se generó.');

      // 5. Devolver el ID del documento y el enlace para firmar
      return {
        id: result.document.id,
        signingUrl: `${process.env.NEXTAUTH_URL}/sign/${result.signers[0].signerToken}`,
      };

    } catch (error) {
      console.error('Error creando documento AOR:', error);
      throw new Error(`No se pudo crear el documento AOR: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
  /**
   * Obtiene el estado de un documento
   */
  static async getDocumentStatus(documentId: string) {
    try {
      const document = await db.query.signatureDocuments.findFirst({
        where: eq(signatureDocuments.id, documentId),
        with: {
          signers: true,
        },
      });

      if (!document) {
        throw new Error('Documento no encontrado');
      }

      return {
        status: document.status,
        isCompleted: document.status === 'completed',
        isPending: document.status === 'sent' || document.status === 'partially_signed',
        signers: document.signers.map(signer => ({
          name: signer.name,
          email: signer.email,
          status: signer.status,
          signedAt: signer.signedAt,
        })),
      };

    } catch (error) {
      console.error(`Error obteniendo estado del documento ${documentId}:`, error);
      throw new Error('No se pudo obtener el estado del documento');
    }
  }
}