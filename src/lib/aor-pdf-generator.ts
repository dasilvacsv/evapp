// lib/aor-pdf-generator.ts - Generador de PDFs AOR actualizado

import * as ReactPDF from '@react-pdf/renderer';
import { AORTemplate } from './aor-pdf-template';

interface AORData {
  customer: {
    fullName: string;
    email?: string;
    phone?: string;
    address?: string;
    ssn?: string;
    birthDate?: string;
  };
  agent: {
    fullName: string;
    email?: string;
    licenseNumber?: string;
  };
  policy: {
    insuranceCompany: string;
    planName: string;
    marketplaceId?: string;
    effectiveDate?: string;
    monthlyPremium?: string;
  };
  createdAt: Date;
}

export class AORPDFGenerator {
  
  /**
   * Genera un PDF de AOR para firma electrónica
   */
  static async generateAORPDF(data: AORData): Promise<Buffer> {
    try {
      console.log(`Generando PDF AOR para ${data.customer.fullName}...`);
      
      // Generar el PDF usando React-PDF
      const pdfStream = await ReactPDF.renderToStream(AORTemplate({ data }));

      // Convertir el stream a buffer
      const pdfBuffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Uint8Array[] = [];
        
        pdfStream.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        pdfStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          resolve(buffer);
        });
        
        pdfStream.on('error', (error) => {
          console.error('Error en el stream del PDF:', error);
          reject(error);
        });
      });

      console.log(`✅ PDF AOR generado exitosamente. Tamaño: ${pdfBuffer.length} bytes`);
      return pdfBuffer;

    } catch (error) {
      console.error('Error generando PDF AOR:', error);
      throw new Error(`No se pudo generar el PDF AOR: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Genera un PDF con campos de firma posicionados
   */
  static async generateAORWithSignatureFields(data: AORData): Promise<Buffer> {
    try {
      // Aquí podrías usar una librería como pdf-lib para agregar campos interactivos
      // Por ahora, usamos la versión estática
      return await this.generateAORPDF(data);
      
    } catch (error) {
      console.error('Error generando PDF con campos de firma:', error);
      throw error;
    }
  }
}