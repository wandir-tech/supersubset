import { describe, expect, it } from 'vitest';
import { resolveYFields } from '../src/base/resolve-field-keys';

describe('resolveYFields', () => {
  it('prefers yField alias when yFields holds mart field ids from dataBinding', () => {
    expect(
      resolveYFields({ yField: 'count', yFields: ['event_id'] }, [
        { fieldId: 'event_date', label: 'Date', dataType: 'date' },
        { fieldId: 'count', label: 'Count', dataType: 'integer' },
      ]),
    ).toEqual(['count']);
  });

  it('falls back to yField when yFields is missing', () => {
    expect(resolveYFields({ yField: 'count' }, undefined)).toEqual(['count']);
  });

  it('falls back to query columns when neither yFields nor yField is set', () => {
    expect(
      resolveYFields({}, [
        { fieldId: 'event_date', label: 'Date', dataType: 'date' },
        { fieldId: 'count', label: 'Count', dataType: 'integer' },
      ]),
    ).toEqual(['count']);
  });
});
