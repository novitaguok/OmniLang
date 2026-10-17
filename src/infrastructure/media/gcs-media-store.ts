import { Storage } from '@google-cloud/storage';
import { randomUUID } from 'node:crypto';

import type { MediaStore, StoredMedia } from '../../application/ports/media-store.js';
import type { ProductPhotoInput } from '../../application/ports/vision-cataloger.js';
import { InfrastructureError } from '../errors.js';

/**
 * Cloud Storage adapter. Product photos are stored under a dated path and
 * served from the public bucket URL for the global catalog.
 */
export class GcsMediaStore implements MediaStore {
  constructor(
    private readonly bucketName: string,
    storage: Storage,
  ) {
    this.bucket = storage.bucket(bucketName);
  }

  private readonly bucket: ReturnType<Storage['bucket']>;

  async save(photo: ProductPhotoInput): Promise<StoredMedia> {
    const extension = extensionFor(photo.mimeType);
    const objectPath = `products/${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`;
    const file = this.bucket.file(objectPath);

    try {
      await file.save(photo.data, { contentType: photo.mimeType, resumable: false });
      await file.makePublic();
    } catch (error) {
      throw new InfrastructureError(`Failed to store product photo in gs://${this.bucketName}`, error);
    }

    return { url: `https://storage.googleapis.com/${this.bucketName}/${encodeURIComponent(objectPath)}` };
  }
}

function extensionFor(mimeType: string): string {
  switch (mimeType) {
    case 'image/jpeg':
    case 'image/jpg':
      return '.jpg';
    case 'image/png':
      return '.png';
    case 'image/webp':
      return '.webp';
    case 'image/gif':
      return '.gif';
    default:
      return '';
  }
}
