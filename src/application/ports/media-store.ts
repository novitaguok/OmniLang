import type { ProductPhotoInput } from './vision-cataloger.js';

export interface StoredMedia {
  readonly url: string;
}

/** Port: persists raw product photos and returns a publicly reachable URL. */
export interface MediaStore {
  save(photo: ProductPhotoInput): Promise<StoredMedia>;
}
