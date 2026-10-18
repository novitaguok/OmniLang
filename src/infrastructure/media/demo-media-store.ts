import { randomUUID } from 'node:crypto';

import type { MediaStore, StoredMedia } from '../../application/ports/media-store.js';
import type { ProductPhotoInput } from '../../application/ports/vision-cataloger.js';

/**
 * Demo-mode media store: no cloud credentials required. Photos are accepted
 * but represented by deterministic placeholder URLs so the full flow can be
 * exercised end to end.
 */
export class DemoMediaStore implements MediaStore {
  constructor(private readonly baseUrl = 'https://demo.omnilang.dev') {}

  async save(_photo: ProductPhotoInput): Promise<StoredMedia> {
    return { url: `${this.baseUrl}/media/${randomUUID()}.jpg` };
  }
}
