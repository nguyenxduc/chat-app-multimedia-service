export interface StoredMediaMeta {
  id: string;
  conversationId: string;
  mimeType: string;
  size: number;
  originalFilename: string;
  ownerUserId: string | null;
  createdAt: string;
}
