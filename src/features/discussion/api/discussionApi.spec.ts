import { beforeEach, describe, expect, it } from 'vitest';

import { groupThreads } from '../model/discussion';

import {
  deleteMessage,
  listMessages,
  listNotifications,
  markNotificationRead,
  postMessage,
} from './discussionApi';

const ADVISOR = 'user-almeida';
const STUDENT = 'user-joao';

beforeEach(() => {
  window.localStorage.clear();
});

describe('discussão da equipe (RF-DSC-001 e 002)', () => {
  it('não é alcançada por quem não tem vínculo com a equipe', async () => {
    await expect(listMessages('user-ricardo')).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
  });

  it('recusa mensagem vazia', async () => {
    await expect(postMessage({ actorId: STUDENT, body: '   ' })).rejects.toMatchObject({
      code: 'VALIDATION_FAILED',
    });
  });

  it('agrupa a resposta a uma resposta sob a mesma mensagem raiz', async () => {
    const reply = await postMessage({ actorId: STUDENT, body: 'Certo.', parentId: 'message-4' });
    const thread = groupThreads(await listMessages(STUDENT)).find(
      (item) => item.root.id === 'message-3',
    );

    expect(reply.parentId).toBe('message-3');
    expect(thread?.replies.map((message) => message.id)).toEqual(['message-4', reply.id]);
  });

  it('mantém o registro de que houve exclusão, e só o autor exclui', async () => {
    await expect(deleteMessage(STUDENT, 'message-1')).rejects.toMatchObject({
      code: 'PERMISSION_DENIED',
    });

    await deleteMessage(ADVISOR, 'message-1');
    const message = (await listMessages(STUDENT)).find((item) => item.id === 'message-1');

    expect(message).toMatchObject({ body: '', deleted: true });
  });
});

describe('notificações (RF-DSC-005 e 006)', () => {
  it('avisa os demais participantes e não quem publicou', async () => {
    const before = (await listNotifications(STUDENT)).length;

    await postMessage({ actorId: STUDENT, body: 'Atualizamos a metodologia.' });

    expect(await listNotifications(STUDENT)).toHaveLength(before);
    expect((await listNotifications(ADVISOR))[0]).toMatchObject({
      read: false,
      type: 'MESSAGE_POSTED',
    });
  });

  it('não alcança notificação endereçada a outro usuário', async () => {
    await expect(markNotificationRead(STUDENT, 'notification-1')).rejects.toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
    });
  });
});
