/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.createType('blueprint_processing_status', ['pending', 'processing', 'completed', 'failed']);

  pgm.createTable('blueprints', {
    id: {
      type: 'uuid',
      primaryKey: true,
      default: pgm.func('gen_random_uuid()'),
    },
    project_id: {
      type: 'uuid',
      notNull: true,
      references: 'projects',
      onDelete: 'CASCADE',
    },
    original_filename: { type: 'text', notNull: true },
    storage_path: { type: 'text', notNull: true },
    mime_type: { type: 'text', notNull: true },
    file_size_bytes: { type: 'integer', notNull: true },
    processing_status: {
      type: 'blueprint_processing_status',
      notNull: true,
      default: 'pending',
    },
    uploaded_at: {
      type: 'timestamptz',
      notNull: true,
      default: pgm.func('now()'),
    },
  });

  pgm.createIndex('blueprints', 'project_id');
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.dropTable('blueprints');
  pgm.dropType('blueprint_processing_status');
};
