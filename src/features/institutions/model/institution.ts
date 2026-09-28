export type InstitutionStatus = 'active' | 'inactive';

export type InstitutionAdmin = {
  initials: string;
  name: string;
  tone: 'light' | 'primary' | 'dark';
};

export type Institution = {
  id: string;
  name: string;
  city: string;
  state: string;
  status: InstitutionStatus;
  createdAt: string;
  admins: InstitutionAdmin[];
};

export const initialInstitutions: Institution[] = [
  {
    id: 'frt',
    name: 'Faculdade Regional de Tecnologia',
    city: 'São Paulo',
    state: 'SP',
    status: 'active',
    createdAt: '15 Out, 2023',
    admins: [
      { initials: 'AS', name: 'Ana Silva', tone: 'light' },
      { initials: 'CN', name: 'Carolina Nunes', tone: 'primary' },
      { initials: '+2', name: 'Mais dois administradores', tone: 'light' },
    ],
  },
  {
    id: 'uec',
    name: 'Universidade Estadual de Ciências',
    city: 'Rio de Janeiro',
    state: 'RJ',
    status: 'active',
    createdAt: '02 Set, 2023',
    admins: [{ initials: 'MC', name: 'Marcos Costa', tone: 'dark' }],
  },
  {
    id: 'ipa',
    name: 'Instituto de Pesquisa Avançada',
    city: 'Belo Horizonte',
    state: 'MG',
    status: 'inactive',
    createdAt: '12 Ago, 2022',
    admins: [],
  },
];
