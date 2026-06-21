import { HttpError } from '@chatapp/common';

import { env } from '@/config/env';

export async function assertConversationParticipant(
  conversationId: string,
  userId: string,
): Promise<void> {
  if (!env.CHAT_SERVICE_URL) {
    throw new HttpError(503, 'Chat service is not configured');
  }

  const url = `${env.CHAT_SERVICE_URL.replace(/\/$/, '')}/conversations/${conversationId}`;
  const res = await fetch(url, {
    headers: {
      'x-internal-token': env.INTERNAL_API_TOKEN,
      'x-user-id': userId,
    },
  });

  if (res.status === 403 || res.status === 404) {
    throw new HttpError(403, 'Not a participant of this conversation');
  }
  if (!res.ok) {
    throw new HttpError(502, 'Failed to verify conversation access');
  }
}
