/**
 * Cliente da API para montar o cenário dos testes de integração (Node, sem navegador).
 *
 * Os testes de tela rodam contra o backend real: o cenário — instituição, contas,
 * curso, turma — nasce pelos mesmos endpoints públicos que a interface usa, e cada
 * execução usa um sufixo único para não colidir com a anterior.
 */

export const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@vinceart.local';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Vince#Admin2026';
export const PASSWORD = 'Senha-de-teste-2026';

type Envelope<T> = { data: T; status: { code: string } };

export class ApiSession {
  private cookies = new Map<string, string>();

  private constructor() {}

  static async login(email: string, password: string): Promise<ApiSession> {
    const session = new ApiSession();
    await session.request('POST', '/sessions', { email, password });
    return session;
  }

  static anonymous(): ApiSession {
    return new ApiSession();
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (this.cookies.size > 0) {
      headers.Cookie = [...this.cookies].map(([name, value]) => `${name}=${value}`).join('; ');
    }
    const csrf = this.cookies.get('vince_csrf');
    if (method !== 'GET' && csrf) headers['X-CSRF-Token'] = csrf;

    const response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });

    for (const line of response.headers.getSetCookie()) {
      const [pair] = line.split(';');
      const index = pair?.indexOf('=') ?? -1;
      if (!pair || index < 0) continue;
      this.cookies.set(pair.slice(0, index), pair.slice(index + 1));
    }

    if (response.status === 204) return undefined as T;
    const envelope = (await response.json()) as Envelope<T>;
    if (!response.ok) {
      throw new Error(`${method} ${path} → ${response.status} ${envelope.status?.code}`);
    }
    return envelope.data;
  }

  get<T>(path: string) {
    return this.request<T>('GET', path);
  }

  post<T>(path: string, body?: unknown) {
    return this.request<T>('POST', path, body);
  }
}

export function uniqueSuffix() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

const inAWeek = () => new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();

export type Account = { id: string; email: string; name: string };

/** Aceita um convite pela rota pública, como a tela de aceite faz. */
export async function acceptInvitation(url: string, name: string, email?: string) {
  const token = url.split('/').pop() ?? '';
  return ApiSession.anonymous().post<{ userId: string; email: string }>(
    `/invitations/${token}/acceptance`,
    { name, ...(email ? { email } : {}), password: PASSWORD },
  );
}

export async function inviteToInstitution(
  actor: ApiSession,
  institutionId: string,
  roleCode: string,
  name: string,
  suffix: string,
): Promise<Account> {
  const email = `${roleCode.toLowerCase()}.${name.split(' ')[0]?.toLowerCase()}.${suffix}@e2e.test`;
  const issued = await actor.post<{ url: string }>(`/institutions/${institutionId}/invitations`, {
    roleCode,
    targetEmail: email,
    expiresAt: inAWeek(),
  });
  const accepted = await acceptInvitation(issued.url, name);
  return { id: accepted.userId, email, name };
}

export type Scenario = {
  suffix: string;
  institution: { id: string; name: string; code: string };
  institutionAdmin: Account;
  coordinator: Account;
  professor: Account;
  otherProfessor: Account;
  course: { id: string; name: string };
  cohort: { id: string; identification: string };
  students: Account[];
};

/**
 * O cenário acadêmico mínimo: instituição com administrador, coordenador de um curso, uma
 * turma com professor e alunos que ingressaram por convite (RF-TUR-005).
 */
export async function buildScenario(): Promise<Scenario> {
  const suffix = uniqueSuffix();
  const admin = await ApiSession.login(ADMIN_EMAIL, ADMIN_PASSWORD);

  const institution = await admin.post<{ id: string; name: string; code: string }>(
    '/institutions',
    { name: `Instituição E2E ${suffix}`, code: `E2E${suffix}`.toUpperCase().slice(0, 20) },
  );

  const institutionAdmin = await inviteToInstitution(
    admin,
    institution.id,
    'INSTITUTION_ADMIN',
    'Ana Administradora',
    suffix,
  );
  const instAdmin = await ApiSession.login(institutionAdmin.email, PASSWORD);

  const coordinator = await inviteToInstitution(
    instAdmin,
    institution.id,
    'PROFESSOR',
    'Ricardo Coordenador',
    suffix,
  );
  const professor = await inviteToInstitution(
    instAdmin,
    institution.id,
    'PROFESSOR',
    'Paula Professora',
    suffix,
  );
  const otherProfessor = await inviteToInstitution(
    instAdmin,
    institution.id,
    'PROFESSOR',
    'Otávio Orientador',
    suffix,
  );

  const course = await instAdmin.post<{ id: string; name: string }>('/courses', {
    name: `Curso E2E ${suffix}`,
    identification: `C${suffix}`.slice(0, 20),
  });
  await instAdmin.post(`/courses/${course.id}/coordinator`, { userId: coordinator.id });

  const coord = await ApiSession.login(coordinator.email, PASSWORD);
  const cohort = await coord.post<{ id: string; identification: string }>(
    `/courses/${course.id}/cohorts`,
    {
      identification: `T${suffix}`.slice(0, 20),
      term: '2026/2',
      startsAt: '2026-08-01T00:00:00.000Z',
      endsAt: '2026-12-15T00:00:00.000Z',
    },
  );
  await coord.post(`/cohorts/${cohort.id}/professors/${professor.id}`);

  const prof = await ApiSession.login(professor.email, PASSWORD);
  const students: Account[] = [];
  for (const name of ['Bruna Aluna', 'Caio Aluno', 'Diana Aluna']) {
    const issued = await prof.post<{ url: string }>(`/cohorts/${cohort.id}/invitations`, {
      expiresAt: inAWeek(),
    });
    const email = `aluno.${name.split(' ')[0]?.toLowerCase()}.${suffix}@e2e.test`;
    const accepted = await acceptInvitation(issued.url ?? '', name, email);
    students.push({ id: accepted.userId, email, name });
  }

  return {
    suffix,
    institution,
    institutionAdmin,
    coordinator,
    professor,
    otherProfessor,
    course,
    cohort,
    students,
  };
}
