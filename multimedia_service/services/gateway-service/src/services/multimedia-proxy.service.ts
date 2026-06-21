import { HttpError, USER_ID_HEADER } from '@chatapp/common';
import axios, { AxiosRequestConfig } from 'axios';
import FormData from 'form-data';

import { env } from '@/config/env';

const createClient = () => {
  const config: AxiosRequestConfig = {
    baseURL: env.MULTIMEDIA_SERVICE_URL,
    timeout: 120_000,
    headers: {
      'X-Internal-Token': env.INTERNAL_API_TOKEN,
    },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  };

  return axios.create(config);
};

const client = createClient();

const resolvedMessage = (status: number, data: unknown): string => {
  if (typeof data === 'object' && data && 'message' in data) {
    const message = (data as Record<string, unknown>).message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message;
    }
  }

  return status >= 500
    ? 'Multimedia service is unavailable'
    : 'An error occurred while processing the request';
};

const handleAxiosError = (error: unknown): never => {
  if (!axios.isAxiosError(error) || !error.response) {
    throw new HttpError(500, 'Multimedia service is unavailable');
  }

  const { status, data } = error.response as { status: number; data: unknown };

  throw new HttpError(status, resolvedMessage(status, data));
};

export interface MediaMetaDto {
  id: string;
  conversationId: string;
  mimeType: string;
  size: number;
  originalFilename: string;
  ownerUserId: string | null;
  createdAt: string;
}

export interface MediaMetaResponse {
  data: MediaMetaDto;
}

export const multimediaProxyService = {
  async uploadMedia(
    userId: string,
    conversationId: string,
    file: { buffer: Buffer; mimetype: string; originalname: string },
  ): Promise<MediaMetaDto> {
    try {
      const body = new FormData();
      body.append('file', file.buffer, {
        filename: file.originalname,
        contentType: file.mimetype,
      });

      const response = await client.post<MediaMetaResponse>('/media', body, {
        headers: {
          ...body.getHeaders(),
          [USER_ID_HEADER]: userId,
          'x-conversation-id': conversationId,
        },
      });
      return response.data.data;
    } catch (error) {
      return handleAxiosError(error);
    }
  },

  async getMediaInfo(userId: string, id: string): Promise<MediaMetaDto> {
    try {
      const response = await client.get<MediaMetaResponse>(`/media/${id}/info`, {
        headers: { [USER_ID_HEADER]: userId },
      });
      return response.data.data;
    } catch (error) {
      return handleAxiosError(error);
    }
  },

  async getMediaStream(userId: string, id: string) {
    try {
      return await client.get(`/media/${id}`, {
        responseType: 'stream',
        headers: { [USER_ID_HEADER]: userId },
        validateStatus: (s) => s >= 200 && s < 300,
      });
    } catch (error) {
      return handleAxiosError(error);
    }
  },
};
