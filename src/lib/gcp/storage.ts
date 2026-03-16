/**
 * Google Cloud Storage client for persisting generated media (audio, images).
 *
 * Uses the official @google-cloud/storage SDK with service account credentials.
 * Requires:
 *   - GCS_BUCKET_NAME env var
 *   - GOOGLE_APPLICATION_CREDENTIALS env var pointing to service account JSON file
 *     OR GCS_CREDENTIALS env var containing the JSON string (for containerized deploys)
 */

import { Storage } from '@google-cloud/storage';

let storageClient: Storage | null = null;

function getStorage(): Storage {
  if (storageClient) return storageClient;

  // Option 1: JSON credentials as env var string (for Docker/Vercel/etc.)
  const credsJson = process.env.GCS_CREDENTIALS;
  if (credsJson) {
    const credentials = JSON.parse(credsJson);
    storageClient = new Storage({
      projectId: credentials.project_id,
      credentials,
    });
    return storageClient;
  }

  // Option 2: GOOGLE_APPLICATION_CREDENTIALS file path (local dev)
  // The SDK picks this up automatically
  storageClient = new Storage();
  return storageClient;
}

function getBucket() {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) throw new Error('GCS_BUCKET_NAME is not configured');
  return getStorage().bucket(bucketName);
}

/**
 * Upload a buffer to GCS and return the public URL.
 */
export async function uploadToGCS(
  data: Buffer,
  objectName: string,
  contentType: string,
): Promise<string> {
  const bucket = getBucket();
  const file = bucket.file(objectName);

  await file.save(data, {
    contentType,
    resumable: false,
    metadata: {
      cacheControl: 'public, max-age=31536000', // 1 year cache
    },
  });

  // Make publicly readable
  await file.makePublic();

  return `https://storage.googleapis.com/${process.env.GCS_BUCKET_NAME}/${objectName}`;
}

/**
 * Upload audio (MP3) for a research task.
 */
export async function uploadAudio(
  audioBuffer: Buffer,
  taskId: string,
): Promise<string> {
  const objectName = `audio/${taskId}/narration.mp3`;
  return uploadToGCS(audioBuffer, objectName, 'audio/mpeg');
}

/**
 * Upload an image for a research task.
 */
export async function uploadImage(
  imageBuffer: Buffer,
  taskId: string,
  filename: string,
): Promise<string> {
  const objectName = `images/${taskId}/${filename}`;
  return uploadToGCS(imageBuffer, objectName, 'image/png');
}

/**
 * Download and re-upload an external image URL to GCS for persistence.
 * Returns the GCS public URL, or the original URL if upload fails.
 */
export async function persistImageFromUrl(
  imageUrl: string,
  taskId: string,
  index: number,
): Promise<string> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return imageUrl;

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : 'jpg';
    const buffer = Buffer.from(await response.arrayBuffer());

    return await uploadToGCS(
      buffer,
      `images/${taskId}/search-${index}.${ext}`,
      contentType,
    );
  } catch {
    // If persistence fails, return original URL as fallback
    return imageUrl;
  }
}

/**
 * Check if GCS is configured.
 */
export function isGCSConfigured(): boolean {
  return !!(
    process.env.GCS_BUCKET_NAME &&
    (process.env.GCS_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS)
  );
}
