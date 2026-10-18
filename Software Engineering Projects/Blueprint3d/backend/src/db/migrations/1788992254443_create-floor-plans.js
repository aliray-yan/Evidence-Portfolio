/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('floor_plans', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    project_id: {
      type: 'uuid',
      notNull: true,
      unique: true,
      references: 'projects',
      onDelete: 'CASCADE',
    },
    blueprint_id: {
      type: 'uuid',
      references: 'blueprints',
      onDelete: 'SET NULL',
    },
    schema_version: { type: 'integer', notNull: true, default: 1 },
    unit: { type: 'text', notNull: true, default: 'm' },
    plot_width: { type: 'numeric' },
    plot_length: { type: 'numeric' },
    data: { type: 'jsonb', notNull: true },
    verified_at: { type: 'timestamptz' },
    created_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
    updated_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  // project_id's UNIQUE constraint above already gives it an index, so no
  // separate btree index on project_id is added here.
  pgm.createIndex('floor_plans', 'data', { method: 'gin' });

  pgm.createTrigger('floor_plans', 'trg_floor_plans_updated_at', {
    when: 'BEFORE',
    operation: 'UPDATE',
    level: 'ROW',
    function: 'set_updated_at',
  });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTrigger('floor_plans', 'trg_floor_plans_updated_at');
  pgm.dropTable('floor_plans');
};
