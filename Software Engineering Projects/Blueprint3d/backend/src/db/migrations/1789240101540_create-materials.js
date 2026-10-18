/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createTable('materials', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    key: { type: 'text', notNull: true, unique: true },
    label: { type: 'text', notNull: true },
    category: {
      type: 'text',
      notNull: true,
      check: "category IN ('wall', 'floor', 'ceiling', 'door', 'window', 'roof')",
    },
    color: { type: 'text' },
    texture_url: { type: 'text' },
    is_default: { type: 'boolean', notNull: true, default: false },
  });

  pgm.sql(`
    INSERT INTO materials (key, label, category, color, is_default) VALUES
      ('concrete', 'Concrete', 'wall', '#9a9a92', false),
      ('painted-wall', 'Painted Wall', 'wall', '#f2efe9', true),
      ('brick', 'Brick', 'wall', '#a4543a', false),
      ('wood', 'Wood', 'floor', '#8a5a34', true),
      ('tile', 'Tile', 'floor', '#d9d4c9', false),
      ('glass', 'Glass', 'window', '#bcd9e6', true),
      ('metal', 'Metal', 'door', '#8d8f92', false);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('materials');
};
