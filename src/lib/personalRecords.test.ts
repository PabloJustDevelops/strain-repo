import { describe, expect, it } from 'vitest';

import { topPersonalRecords, type PersonalRecordSummary } from './personalRecords';

const prs: PersonalRecordSummary[] = [
  { exerciseId: 'a', exerciseName: 'A', oneRm: 80 },
  { exerciseId: 'b', exerciseName: 'B', oneRm: 120 },
  { exerciseId: 'c', exerciseName: 'C', oneRm: 100 },
];

describe('topPersonalRecords', () => {
  it('ordena de mayor a menor sin mutar la entrada', () => {
    const before = prs.map((p) => p.exerciseId);
    const top = topPersonalRecords(prs);

    expect(top.map((p) => p.exerciseId)).toEqual(['b', 'c', 'a']);
    expect(prs.map((p) => p.exerciseId)).toEqual(before);
  });

  it('limita el número de resultados', () => {
    expect(topPersonalRecords(prs, 2)).toHaveLength(2);
    expect(topPersonalRecords(prs, 2)[0].exerciseId).toBe('b');
  });
});
