export type InstitutionStatus = 'active' | 'inactive';

export type InstitutionAdmin = {
  id: string;
  email: string;
  initials: string;
  name: string;
  tone: 'light' | 'primary' | 'dark';
};

export type Institution = {
  id: string;
  name: string;
  acronym: string;
  legalId: string;
  domain: string;
  supportEmail: string;
  city: string;
  state: string;
  status: InstitutionStatus;
  createdAt: string;
  coursesActive: number;
  admins: InstitutionAdmin[];
};

export function makeInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export const initialInstitutions: Institution[] = [
  {
    id: 'frt',
    name: 'Faculdade Regional de Tecnologia',
    acronym: 'FRT',
    legalId: '12.245.778/0001-18',
    domain: 'frt.edu.br',
    supportEmail: 'suporte@frt.edu.br',
    city: 'São Paulo',
    state: 'SP',
    status: 'active',
    createdAt: '15 Out, 2023',
    coursesActive: 18,
    admins: [
      {
        id: 'ana-silva',
        initials: 'AS',
        name: 'Ana Silva',
        email: 'ana.silva@frt.edu.br',
        tone: 'light',
      },
      {
        id: 'carolina-nunes',
        initials: 'CN',
        name: 'Carolina Nunes',
        email: 'carolina.nunes@frt.edu.br',
        tone: 'primary',
      },
      {
        id: 'marcelo-rocha',
        initials: 'MR',
        name: 'Marcelo Rocha',
        email: 'marcelo.rocha@frt.edu.br',
        tone: 'dark',
      },
    ],
  },
  {
    id: 'uec',
    name: 'Universidade Estadual de Ciências',
    acronym: 'UEC',
    legalId: '08.491.337/0001-90',
    domain: 'uec.br',
    supportEmail: 'portal@uec.br',
    city: 'Rio de Janeiro',
    state: 'RJ',
    status: 'active',
    createdAt: '02 Set, 2023',
    coursesActive: 31,
    admins: [
      {
        id: 'marcos-costa',
        initials: 'MC',
        name: 'Marcos Costa',
        email: 'marcos.costa@uec.br',
        tone: 'dark',
      },
    ],
  },
  {
    id: 'ipa',
    name: 'Instituto de Pesquisa Avançada',
    acronym: 'IPA',
    legalId: '43.889.102/0001-71',
    domain: 'ipa.edu.br',
    supportEmail: 'atendimento@ipa.edu.br',
    city: 'Belo Horizonte',
    state: 'MG',
    status: 'inactive',
    createdAt: '12 Ago, 2022',
    coursesActive: 7,
    admins: [],
  },
];
