import 'reflect-metadata'; // decorators need it when the Nest bootstrap chain isn't loaded

import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

import { PaginationDto } from './pagination.dto';

describe('PaginationDto', () => {
  const make = (query: Record<string, string>): PaginationDto =>
    plainToInstance(PaginationDto, query, { enableImplicitConversion: false });

  it('defaults: page 1, limit 20, skip 0', () => {
    const dto = make({});
    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.page).toBe(1);
    expect(dto.limit).toBe(20);
    expect(dto.skip).toBe(0);
  });

  it('computes skip from page/limit', () => {
    const dto = make({ page: '3', limit: '10' });
    expect(validateSync(dto)).toHaveLength(0);
    expect(dto.skip).toBe(20);
  });

  it('rejects limit > 100 and page < 1 (contract: reject, not clamp)', () => {
    expect(validateSync(make({ limit: '500' }))).not.toHaveLength(0);
    expect(validateSync(make({ page: '0' }))).not.toHaveLength(0);
  });

  it('rejects non-numeric input', () => {
    expect(validateSync(make({ page: 'abc' }))).not.toHaveLength(0);
  });
});
