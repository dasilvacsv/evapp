// lib/s3.ts

import { 
    S3Client, 
    DeleteObjectCommand, 
    GetObjectCommand,
    PutObjectCommand
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";
import { Readable } from "stream";

// Configuración del cliente S3
const s3Client = new S3Client({
    region: process.env.S3_REGION || "us-east-1",
    // 👇 CORRECCIÓN AQUÍ: Reconstruimos la URL completa para el endpoint
    endpoint: `https://${process.env.S3_ENDPOINT}`,
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY || "",
        secretAccessKey: process.env.S3_SECRET_KEY || "",
    },
    forcePathStyle: true,
});

const BUCKET_NAME = process.env.S3_BUCKET || "default";
const MAX_FILE_SIZE_MB = 10;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

interface PresignedPostParams {
  userId: string;
  fileName: string;
  fileType: string;
  customPath?: string;
}

/**
 * Genera una URL prefirmada para que el navegador pueda subir un archivo directamente a S3.
 */
export async function createPresignedPostForUpload({ userId, fileName, fileType, customPath }: PresignedPostParams) {
    try {
        // La lógica del 'customPath' se mantiene como la corregimos antes
        const key = customPath || `uploads/${userId}/${randomUUID()}-${fileName}`;

        const { url, fields } = await createPresignedPost(s3Client, {
            Bucket: BUCKET_NAME,
            Key: key,
            Conditions: [
                ["content-length-range", 0, MAX_FILE_SIZE_BYTES],
                ["eq", "$Content-Type", fileType],
            ],
            Fields: {
                'Content-Type': fileType,
            },
            Expires: 600,
        });

        return { success: true, data: { url, fields, key } };
    } catch (error) {
        console.error("Error creating presigned post:", error);
        return { success: false, error: (error as Error).message };
    }
}

/**
 * Genera una URL prefirmada y temporal para DESCARGAR un archivo desde S3.
 */
export async function getPresignedUrlForDownload(key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    return await getSignedUrl(s3Client, command, { expiresIn });
}

/**
 * Elimina un archivo de S3.
 */
export async function deleteFromS3(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });
    await s3Client.send(command);
}

/**
 * --- NUEVO: Descarga el contenido de un objeto de S3 como un Buffer ---
 * Esto es necesario para que el servidor pueda leer y modificar el PDF.
 */
export async function getObjectBuffer(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
    });

    try {
        const response = await s3Client.send(command);
        
        // Es una buena práctica verificar si el cuerpo del objeto existe
        if (!response.Body) {
            throw new Error(`El cuerpo del objeto S3 con clave "${key}" está vacío.`);
        }
        
        // --- CORRECCIÓN 2: Usar el tipo importado correctamente ---
        const stream = response.Body as Readable;

        const chunks: Buffer[] = [];
        // El bucle for await...of es una forma moderna y correcta de leer streams
        for await (const chunk of stream) {
            chunks.push(chunk);
        }
        return Buffer.concat(chunks);
    } catch (error) {
        console.error(`Error al obtener el objeto ${key} de S3:`, error);
        throw new Error(`No se pudo descargar el archivo de S3: ${key}`);
    }
}

// --- NUEVO: Función para subir un Buffer directamente a S3 desde el servidor ---
/**
 * Sube un Buffer a S3. Ideal para archivos generados en el backend.
 * @param key La ruta y nombre del archivo en S3 (ej: 'signatures/doc.pdf')
 * @param body El Buffer del archivo a subir.
 * @param contentType El MIME type del archivo (ej: 'application/pdf').
 * @returns El resultado del comando de subida.
 */
export async function uploadObjectBuffer(key: string, body: Buffer, contentType: string) {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: body,
        ContentType: contentType,
        ACL: 'private', // O 'public-read' si los archivos deben ser públicos
    });

    try {
        const response = await s3Client.send(command);
        console.log(`Archivo subido exitosamente a S3. Key: ${key}`);
        return response;
    } catch (error) {
        console.error(`Error subiendo el objeto ${key} a S3:`, error);
        throw new Error(`No se pudo subir el archivo a S3: ${key}`);
    }
}