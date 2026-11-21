import { describe, expect, it } from 'vitest';

import { makeInitials, validateInstitution } from './institution';

const valid = {
  name: 'Faculdade Regional de Tecnologia',
  acronym: 'FRT',
  legalId: '12.245.778/0001-18',
  domain: 'frt.edu.br',
  supportEmail: 'suporte@frt.edu.br',
  city: 'São Paulo',
  state: 'SP',
};

describe('institution identification', () => {
  it('accepts a complete identification and subdomains', () => {
    expect(validateInstitution(valid)).toBeNull();
    expect(validateInstitution({ ...valid, domain: 'campus.frt.edu.br' })).toBeNull();
  });

  it('rejects blank values and incomplete state codes', () => {
    expect(validateInstitution({ ...valid, name: '   ' })).toBeTruthy();
    expect(validateInstitution({ ...valid, state: 'S' })).toBeTruthy();
    expect(validateInstitution({ ...valid, state: '11' })).toBeTruthy();
  });

  it('requires a hostname without protocols, paths or invalid labels', () => {
    for (const domain of [
      'https://frt.edu.br',
      'frt.edu.br/campus',
      'frt',
      '-frt.edu.br',
      'frt..edu.br',
    ]) {
      expect(validateInstitution({ ...valid, domain })).toBeTruthy();
    }
  });

  it('accepts an identification without the optional fields', () => {
    expect(
      validateInstitution({
        ...valid,
        legalId: '',
        domain: '',
        supportEmail: '',
        city: '',
        state: '',
      }),
    ).toBeNull();
  });

  it('makes initials from trimmed, separated names', () => {
    expect(makeInitials('  Ana   Silva ')).toBe('AS');
    expect(makeInitials('')).toBe('');
  });
});
