// lib/s3.ts

import { 
  S3Client, 
  DeleteObjectCommand, 
  GetObjectCommand
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// Configuración del cliente S3
const s3Client = new S3Client({
  region: process.env.S3_REGION || "us-east-1",
  endpoint: `https://${process.env.S3_ENDPOINT}:${process.env.S3_PORT || 443}`,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
  forcePathStyle: true,
});

const BUCKET_NAME = process.env.S3_BUCKET || "default";
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

/**
 * Genera una URL prefirmada para que el navegador pueda subir un archivo directamente a S3.
 * Esto es más seguro y eficiente que pasar el archivo por nuestro servidor.
 * @returns Un objeto con la URL y los campos necesarios para el POST del formulario.
 */
export async function createPresignedPostForUpload({ userId, fileName, fileType }: { userId: string, fileName: string, fileType: string }) {
  try {
    // Genera una clave única para el archivo para evitar sobreescrituras
    const key = `uploads/${userId}/${randomUUID()}-${fileName}`;

    const { url, fields } = await createPresignedPost(s3Client, {
      Bucket: BUCKET_NAME,
      Key: key,
      // Condiciones de seguridad para la subida
      Conditions: [
        ["content-length-range", 0, MAX_FILE_SIZE_BYTES], // Límite de tamaño de archivo
        ["eq", "$Content-Type", fileType], // El tipo de archivo debe coincidir
      ],
      Fields: {
        'Content-Type': fileType,
      },
      Expires: 600, // La URL es válida por 10 minutos
    });

    // Devolvemos todo lo necesario para que el frontend construya la petición
    return { success: true, data: { url, fields, key } };
  } catch (error) {
    console.error("Error creating presigned post:", error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * CAMBIO: Renombrado de 'getPresignedUrl' a 'getPresignedUrlForDownload' para mayor claridad.
 * Genera una URL prefirmada y temporal para DESCARGAR un archivo desde S3.
 * Esto permite al frontend mostrar imágenes o proporcionar enlaces de descarga seguros.
 */
export async function getPresignedUrlForDownload(key: string, expiresIn = 3600): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  // getSignedUrl crea la URL segura con una firma y tiempo de expiración.
  return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Elimina un archivo de S3.
 * Útil si el usuario decide quitar un documento antes de guardar el formulario.
 */
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  await s3Client.send(command);
}