/**
 * Real-world schema heuristic tests.
 *
 * Derived from actual open-source schemas:
 * - Prisma docs blog schema (User, Post, Profile, Category)
 * - dbt jaffle_shop (customers, orders, payments)
 * - Common SaaS / e-commerce / HR / healthcare / finance patterns
 *
 * Goal: validate that inferFieldRole produces sensible defaults for
 * fields developers actually create in the wild.
 */
import { describe, it, expect } from 'vitest';
import { inferFieldRole, inferAggregation, humanizeFieldName } from '../src/heuristics.js';
import type { FieldDataType, FieldRole } from '../src/index.js';

// ─── Helper ──────────────────────────────────────────────────

/** Assert a batch of (fieldName, dataType) → expectedRole */
function expectRoles(cases: [string, FieldDataType, FieldRole][]) {
  for (const [name, dataType, expected] of cases) {
    const actual = inferFieldRole(name, dataType);
    expect(actual, `${name} (${dataType}) → expected ${expected}, got ${actual}`).toBe(expected);
  }
}

// ─── Prisma Blog Schema (from Prisma docs) ──────────────────

describe('Real-world: Prisma blog schema', () => {
  // model User { id Int @id; email String @unique; name String?; role Role @default(USER) }
  // model Post { id Int @id; createdAt DateTime; updatedAt DateTime; title String; published Boolean; authorId Int }
  // model Profile { id Int @id; bio String; userId Int @unique }
  // model Category { id Int @id; name String }

  it('User model fields', () => {
    expectRoles([
      ['id', 'integer', 'key'],
      ['email', 'string', 'dimension'],
      ['name', 'string', 'dimension'],
      ['role', 'string', 'dimension'],
    ]);
  });

  it('Post model fields', () => {
    expectRoles([
      ['id', 'integer', 'key'],
      ['createdAt', 'datetime', 'time'],
      ['updatedAt', 'datetime', 'time'],
      ['title', 'string', 'dimension'],
      ['published', 'boolean', 'dimension'],
      ['authorId', 'integer', 'key'],
    ]);
  });

  it('Profile model fields', () => {
    expectRoles([
      ['id', 'integer', 'key'],
      ['bio', 'string', 'dimension'],
      ['userId', 'integer', 'key'],
    ]);
  });

  it('Category model fields', () => {
    expectRoles([
      ['id', 'integer', 'key'],
      ['name', 'string', 'dimension'],
    ]);
  });
});

// ─── dbt jaffle_shop (canonical dbt example) ────────────────

describe('Real-world: dbt jaffle_shop', () => {
  // customers: customer_id, first_name, last_name, first_order, most_recent_order, number_of_orders, total_order_amount
  // orders: order_id, customer_id, order_date, status, amount, credit_card_amount, coupon_amount, bank_transfer_amount, gift_card_amount

  it('customers model fields', () => {
    expectRoles([
      ['customer_id', 'integer', 'key'],
      ['first_name', 'string', 'dimension'],
      ['last_name', 'string', 'dimension'],
      ['first_order', 'date', 'time'],
      ['most_recent_order', 'date', 'time'],
      ['number_of_orders', 'integer', 'measure'],
      ['total_order_amount', 'number', 'measure'],
    ]);
  });

  it('orders model fields', () => {
    expectRoles([
      ['order_id', 'integer', 'key'],
      ['customer_id', 'integer', 'key'],
      ['order_date', 'date', 'time'],
      ['status', 'string', 'dimension'],
      ['amount', 'number', 'measure'],
      ['credit_card_amount', 'number', 'measure'],
      ['coupon_amount', 'number', 'measure'],
      ['bank_transfer_amount', 'number', 'measure'],
      ['gift_card_amount', 'number', 'measure'],
    ]);
  });

  it('jaffle_shop aggregation defaults', () => {
    expect(inferAggregation('measure', 'number')).toBe('sum');   // amount
    expect(inferAggregation('measure', 'integer')).toBe('sum');  // number_of_orders
    expect(inferAggregation('time', 'date')).toBe('none');       // order_date
    expect(inferAggregation('dimension', 'string')).toBeUndefined(); // status
    expect(inferAggregation('key', 'integer')).toBeUndefined();  // customer_id
  });

  it('jaffle_shop humanized labels', () => {
    expect(humanizeFieldName('customer_id')).toBe('Customer Id');
    expect(humanizeFieldName('first_name')).toBe('First Name');
    expect(humanizeFieldName('most_recent_order')).toBe('Most Recent Order');
    expect(humanizeFieldName('total_order_amount')).toBe('Total Order Amount');
    expect(humanizeFieldName('credit_card_amount')).toBe('Credit Card Amount');
    expect(humanizeFieldName('bank_transfer_amount')).toBe('Bank Transfer Amount');
  });
});

// ─── SaaS / Multi-tenant ────────────────────────────────────

describe('Real-world: SaaS multi-tenant', () => {
  // Common SaaS tables: tenants, users, subscriptions, invoices, usage_events

  it('tenant / user fields', () => {
    expectRoles([
      ['tenant_id', 'string', 'key'],
      ['org_name', 'string', 'dimension'],
      ['plan', 'string', 'dimension'],
      ['is_trial', 'boolean', 'dimension'],
      ['signup_date', 'date', 'time'],
      ['seats', 'integer', 'measure'],
    ]);
  });

  it('subscription fields', () => {
    expectRoles([
      ['subscription_id', 'string', 'key'],
      ['tenant_id', 'string', 'key'],
      ['plan_name', 'string', 'dimension'],
      ['monthly_price', 'number', 'measure'],
      ['start_date', 'date', 'time'],
      ['end_date', 'date', 'time'],
      ['is_active', 'boolean', 'dimension'],
    ]);
  });

  it('invoice fields', () => {
    expectRoles([
      ['invoice_id', 'string', 'key'],
      ['invoice_date', 'date', 'time'],
      ['due_date', 'date', 'time'],
      ['total_amount', 'number', 'measure'],
      ['tax_amount', 'number', 'measure'],
      ['paid', 'boolean', 'dimension'],
      ['currency', 'string', 'dimension'],
    ]);
  });

  it('usage event fields', () => {
    expectRoles([
      ['event_id', 'string', 'key'],
      ['timestamp', 'datetime', 'time'],
      ['event_type', 'string', 'dimension'],
      ['user_id', 'string', 'key'],
      ['duration_ms', 'integer', 'measure'],
      ['api_calls', 'integer', 'measure'],
    ]);
  });
});

// ─── E-Commerce (expanded) ──────────────────────────────────

describe('Real-world: E-Commerce', () => {
  it('product catalog fields', () => {
    expectRoles([
      ['product_id', 'integer', 'key'],
      ['sku', 'string', 'dimension'],
      ['product_name', 'string', 'dimension'],
      ['category', 'string', 'dimension'],
      ['brand', 'string', 'dimension'],
      ['unit_price', 'number', 'measure'],
      ['unit_cost', 'number', 'measure'],
      ['weight', 'number', 'measure'],
      ['is_active', 'boolean', 'dimension'],
      ['created_at', 'datetime', 'time'],
    ]);
  });

  it('order line item fields', () => {
    expectRoles([
      ['line_item_id', 'integer', 'key'],
      ['order_id', 'integer', 'key'],
      ['product_id', 'integer', 'key'],
      ['quantity', 'integer', 'measure'],
      ['unit_price', 'number', 'measure'],
      ['discount_amount', 'number', 'measure'],
      ['line_total', 'number', 'measure'],
      ['shipped_date', 'date', 'time'],
    ]);
  });

  it('customer fields', () => {
    expectRoles([
      ['customer_id', 'integer', 'key'],
      ['first_name', 'string', 'dimension'],
      ['last_name', 'string', 'dimension'],
      ['email', 'string', 'dimension'],
      ['phone', 'string', 'dimension'],
      ['country', 'string', 'dimension'],
      ['region', 'string', 'dimension'],
      ['city', 'string', 'dimension'],
      ['registration_date', 'date', 'time'],
      ['lifetime_revenue', 'number', 'measure'],
    ]);
  });
});

// ─── HR / People Analytics ──────────────────────────────────

describe('Real-world: HR / People Analytics', () => {
  it('employee fields', () => {
    expectRoles([
      ['employee_id', 'integer', 'key'],
      ['first_name', 'string', 'dimension'],
      ['last_name', 'string', 'dimension'],
      ['department', 'string', 'dimension'],
      ['job_title', 'string', 'dimension'],
      ['hire_date', 'date', 'time'],
      ['termination_date', 'date', 'time'],
      ['salary', 'number', 'measure'],
      ['bonus', 'number', 'measure'],
      ['is_manager', 'boolean', 'dimension'],
      ['manager_id', 'integer', 'key'],
    ]);
  });

  it('timesheet fields', () => {
    expectRoles([
      ['timesheet_id', 'integer', 'key'],
      ['employee_id', 'integer', 'key'],
      ['work_date', 'date', 'time'],
      ['hours_worked', 'number', 'measure'],
      ['overtime_hours', 'number', 'measure'],
      ['project', 'string', 'dimension'],
    ]);
  });
});

// ─── Finance / Accounting ───────────────────────────────────

describe('Real-world: Finance / Accounting', () => {
  it('transaction fields', () => {
    expectRoles([
      ['transaction_id', 'string', 'key'],
      ['account_id', 'string', 'key'],
      ['transaction_date', 'date', 'time'],
      ['posted_at', 'datetime', 'time'],
      ['amount', 'number', 'measure'],
      ['balance', 'number', 'measure'],
      ['debit', 'number', 'measure'],
      ['credit', 'number', 'measure'],
      ['category', 'string', 'dimension'],
      ['description', 'string', 'dimension'],
      ['is_reconciled', 'boolean', 'dimension'],
    ]);
  });

  it('account fields', () => {
    expectRoles([
      ['account_id', 'string', 'key'],
      ['account_name', 'string', 'dimension'],
      ['account_type', 'string', 'dimension'],
      ['currency', 'string', 'dimension'],
      ['opened_date', 'date', 'time'],
      ['current_balance', 'number', 'measure'],
    ]);
  });
});

// ─── Healthcare / Clinical ──────────────────────────────────

describe('Real-world: Healthcare / Clinical', () => {
  it('patient fields', () => {
    expectRoles([
      ['patient_id', 'string', 'key'],
      ['first_name', 'string', 'dimension'],
      ['last_name', 'string', 'dimension'],
      ['date_of_birth', 'date', 'time'],
      ['gender', 'string', 'dimension'],
      ['blood_type', 'string', 'dimension'],
      ['is_active', 'boolean', 'dimension'],
    ]);
  });

  it('encounter / visit fields', () => {
    expectRoles([
      ['encounter_id', 'string', 'key'],
      ['patient_id', 'string', 'key'],
      ['provider_id', 'string', 'key'],
      ['admit_date', 'date', 'time'],
      ['discharge_date', 'date', 'time'],
      ['diagnosis_code', 'string', 'dimension'],
      ['total_cost', 'number', 'measure'],
      ['length_of_stay', 'integer', 'measure'],
    ]);
  });

  it('lab result fields', () => {
    expectRoles([
      ['result_id', 'string', 'key'],
      ['patient_id', 'string', 'key'],
      ['test_name', 'string', 'dimension'],
      ['result_value', 'number', 'measure'],
      ['result_date', 'date', 'time'],
      ['is_abnormal', 'boolean', 'dimension'],
    ]);
  });
});

// ─── IoT / Telemetry ────────────────────────────────────────

describe('Real-world: IoT / Telemetry', () => {
  it('sensor reading fields', () => {
    expectRoles([
      ['reading_id', 'string', 'key'],
      ['device_id', 'string', 'key'],
      ['sensor_type', 'string', 'dimension'],
      ['timestamp', 'datetime', 'time'],
      ['temperature', 'number', 'measure'],
      ['humidity', 'number', 'measure'],
      ['pressure', 'number', 'measure'],
      ['battery_level', 'number', 'measure'],
      ['is_online', 'boolean', 'dimension'],
      ['location', 'string', 'dimension'],
    ]);
  });
});

// ─── Known Limitations (documented, overridable) ────────────

describe('Known heuristic limitations (override expected)', () => {
  // These fields are numeric but NOT additive measures.
  // The heuristic defaults to 'measure' for any numeric field
  // that doesn't match a key pattern. This is intentional —
  // the user overrides via the designer or JSON adapter.

  it('numeric non-measures default to measure (override expected)', () => {
    // These would ideally be 'dimension' but heuristics can't distinguish
    expect(inferFieldRole('age', 'integer')).toBe('measure');
    expect(inferFieldRole('zip_code', 'integer')).toBe('measure');
    expect(inferFieldRole('year', 'integer')).toBe('measure');
    expect(inferFieldRole('latitude', 'number')).toBe('measure');
    expect(inferFieldRole('longitude', 'number')).toBe('measure');
    expect(inferFieldRole('rating', 'number')).toBe('measure');
    expect(inferFieldRole('percentage', 'number')).toBe('measure');
  });
});

// ─── Edge Cases & Tricky Names ──────────────────────────────

describe('Real-world: edge cases and tricky field names', () => {
  it('UUID string primary keys are still keys', () => {
    expect(inferFieldRole('id', 'string')).toBe('key');
  });

  it('camelCase FK references', () => {
    expectRoles([
      ['authorId', 'integer', 'key'],
      ['categoryId', 'integer', 'key'],
      ['parentId', 'integer', 'key'],
      ['companyId', 'string', 'key'],
    ]);
  });

  it('compound field names with measure words', () => {
    expectRoles([
      ['gross_revenue', 'number', 'measure'],
      ['net_cost', 'number', 'measure'],
      ['avg_price', 'number', 'measure'],
      ['total_qty', 'integer', 'measure'],
    ]);
  });

  it('status-like string fields → dimension', () => {
    expectRoles([
      ['status', 'string', 'dimension'],
      ['state', 'string', 'dimension'],
      ['type', 'string', 'dimension'],
      ['level', 'string', 'dimension'],
      ['priority', 'string', 'dimension'],
      ['channel', 'string', 'dimension'],
      ['source', 'string', 'dimension'],
    ]);
  });

  it('boolean flags → dimension', () => {
    expectRoles([
      ['is_deleted', 'boolean', 'dimension'],
      ['has_shipped', 'boolean', 'dimension'],
      ['enabled', 'boolean', 'dimension'],
      ['verified', 'boolean', 'dimension'],
    ]);
  });

  it('json/unknown types → unknown role', () => {
    expectRoles([
      ['metadata', 'json', 'unknown'],
      ['payload', 'json', 'unknown'],
      ['raw_data', 'unknown', 'unknown'],
      ['config', 'json', 'unknown'],
    ]);
  });

  it('humanizeFieldName handles real-world patterns', () => {
    expect(humanizeFieldName('date_of_birth')).toBe('Date Of Birth');
    expect(humanizeFieldName('length_of_stay')).toBe('Length Of Stay');
    expect(humanizeFieldName('gross_revenue')).toBe('Gross Revenue');
    expect(humanizeFieldName('isActive')).toBe('Is Active');
    expect(humanizeFieldName('diagnosis_code')).toBe('Diagnosis Code');
    expect(humanizeFieldName('battery_level')).toBe('Battery Level');
    expect(humanizeFieldName('creditCardAmount')).toBe('Credit Card Amount');
  });
});
