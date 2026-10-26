import { describe, expect, it } from 'vitest';

import { initialInstitutions, makeInitials, validateInstitution } from './institution';

const institution = initialInstitutions[0]!;
const valid = {
  name: institution.name,
  acronym: institution.acronym,
  legalId: institution.legalId,
  domain: institution.domain,
  supportEmail: institution.supportEmail,
  city: institution.city,
  state: institution.state,
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

  it('makes initials from trimmed, separated names', () => {
    expect(makeInitials('  Ana   Silva ')).toBe('AS');
    expect(makeInitials('')).toBe('');
  });
});
