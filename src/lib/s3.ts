import { 
  S3Client, 
  PutObjectCommand, 
  GetObjectCommand,
  DeleteObjectCommand // <-- ¡NUEVA IMPORTACIÓN!
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize the S3 client with MinIO configuration
const s3Client = new S3Client({
  region: "us-east-1", // This can be any value for MinIO
  endpoint: `https://${process.env.S3_ENDPOINT}:${process.env.S3_PORT || 443}`,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "",
    secretAccessKey: process.env.S3_SECRET_KEY || "",
  },
  forcePathStyle: true, // Required for MinIO
});

// Default bucket name
const BUCKET_NAME = process.env.S3_BUCKET || "default";

/**
 * Upload a file to MinIO S3
 * @param file - The file buffer to upload
 * @param key - The key (path) where the file will be stored
 * @param contentType - The content type of the file
 * @returns The URL of the uploaded file
 */
export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Generate a URL for the uploaded file
  const url = `https://${process.env.S3_ENDPOINT}/${BUCKET_NAME}/${key}`;
  return url;
}

/**
 * Generate a presigned URL for downloading a file from S3
 * @param key - The key (path) of the file in S3
 * @param expiresIn - The number of seconds until the URL expires (default: 3600)
 * @returns The presigned URL
 */
export async function getPresignedUrl(
  key: string,
  expiresIn = 3600
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3Client, command, { expiresIn });
  return url;
}

/**
 * Delete a file from MinIO S3
 * @param key - The key (path) of the file in S3
 */
export async function deleteFromS3(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}