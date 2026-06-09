import { describe, expect, it } from 'vitest';
import { applyCumulativeLineSeries } from '../src/charts/ComboChartWidget';

describe('applyCumulativeLineSeries', () => {
  it('computes a running total line from cumulativeFromField', () => {
    const data = [
      { created_date: '2026-01-01', signups: 2 },
      { created_date: '2026-01-02', signups: 3 },
      { created_date: '2026-01-03', signups: 1 },
    ];

    const result = applyCumulativeLineSeries(
      data,
      {
        cumulativeFromField: 'signups',
        lineField: 'cumulative_users',
      },
      ['signups'],
      [],
    );

    expect(result.lineFields).toEqual(['cumulative_users']);
    expect(result.data).toEqual([
      { created_date: '2026-01-01', signups: 2, cumulative_users: 2 },
      { created_date: '2026-01-02', signups: 3, cumulative_users: 5 },
      { created_date: '2026-01-03', signups: 1, cumulative_users: 6 },
    ]);
  });
});
