#!/usr/bin/env node
/**
 * Generate AI Agent Rules file based on database metadata
 * 
 * This script:
 * 1. Connects to the database
 * 2. Retrieves table, column, and foreign key metadata
 * 3. Analyzes migration files
 * 4. Generates .ai/AGENT_RULES.md file
 */

import * as path from 'path';
import * as fs from 'fs';
import pkg from 'pg';
const { Pool } = pkg;

// Load environment variables
function loadEnv(): void {
  const envPath = path.join(process.cwd(), '.env');
  
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const [key, value] = line.split('=');
      if (key && value) {
        process.env[key.trim()] = value.trim();
      }
    });
  }
}

interface TableInfo {
  tableName: string;
  columns: ColumnInfo[];
  foreignKeys: ForeignKeyInfo[];
  indexes: IndexInfo[];
}

interface ColumnInfo {
  columnName: string;
  dataType: string;
  isNullable: boolean;
  isPrimaryKey: boolean;
  defaultValue?: string;
}

interface ForeignKeyInfo {
  constraintName: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
  onDelete: string;
  onUpdate: string;
}

interface IndexInfo {
  indexName: string;
  columns: string[];
  isUnique: boolean;
}

interface MigrationInfo {
  version: string;
  name: string;
  status: 'Applied' | 'Pending';
  appliedAt?: Date;
  hasDownSection: boolean;
}

async function getTableMetadata(pool: Pool): Promise<TableInfo[]> {
  const query = `
    SELECT 
      t.table_name,
      c.column_name,
      c.data_type,
      c.is_nullable,
      c.column_default,
      CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary_key,
      fk.constraint_name,
      fk.column_name as fk_column,
      fk.referenced_table,
      fk.referenced_column,
      fk.on_delete,
      fk.on_update,
      idx.index_name,
      idx.index_columns,
      idx.is_unique
    FROM information_schema.tables t
    JOIN information_schema.columns c ON t.table_name = c.table_name
    LEFT JOIN (
      SELECT 
        tc.table_name,
        kcu.column_name,
        tc.constraint_name,
        ccu.table_name AS referenced_table,
        ccu.column_name AS referenced_column,
        rc.delete_rule AS on_delete,
        rc.update_rule AS on_update
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
    ) fk ON t.table_name = fk.table_name AND c.column_name = fk.column
    LEFT JOIN (
      SELECT 
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'PRIMARY KEY'
    ) pk ON t.table_name = pk.table_name AND c.column_name = pk.column_name
    LEFT JOIN (
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef,
        (indexdef LIKE '%UNIQUE%') as is_unique,
        regexp_matches(indexdef, 'USING.*\(([^)]+)\)') as index_columns
      FROM pg_indexes
      WHERE schemaname = 'public'
    ) idx ON t.table_name = idx.tablename
    WHERE t.table_schema = 'public'
      AND t.table_name != '_migrations'
    ORDER BY t.table_name, c.ordinal_position
  `;

  const result = await pool.query(query);
  
  const tables: Map<string, TableInfo> = new Map();

  for (const row of result.rows) {
    if (!tables.has(row.table_name)) {
      tables.set(row.table_name, {
        tableName: row.table_name,
        columns: [],
        foreignKeys: [],
        indexes: [],
      });
    }

    const table = tables.get(row.table_name)!;

    // Add column if not exists
    const columnExists = table.columns.some(c => c.columnName === row.column_name);
    if (!columnExists) {
      table.columns.push({
        columnName: row.column_name,
        dataType: row.data_type,
        isNullable: row.is_nullable === 'YES',
        isPrimaryKey: row.is_primary_key,
        defaultValue: row.column_default,
      });
    }

    // Add foreign key if exists
    if (row.constraint_name) {
      const fkExists = table.foreignKeys.some(fk => fk.constraintName === row.constraint_name);
      if (!fkExists) {
        table.foreignKeys.push({
          constraintName: row.constraint_name,
          columnName: row.fk_column,
          referencedTable: row.referenced_table,
          referencedColumn: row.referenced_column,
          onDelete: row.on_delete,
          onUpdate: row.on_update,
        });
      }
    }

    // Add index if exists
    if (row.index_name && !table.indexes.some(idx => idx.indexName === row.index_name)) {
      table.indexes.push({
        indexName: row.index_name,
        columns: row.index_columns ? row.index_columns[0].split(',').map((c: string) => c.trim()) : [],
        isUnique: row.is_unique,
      });
    }
  }

  return Array.from(tables.values());
}

async function getMigrationInfo(pool: Pool, migrationsFolder: string): Promise<MigrationInfo[]> {
  // Get applied migrations from database
  const appliedResult = await pool.query(`
    SELECT migration_name, applied_at FROM _migrations ORDER BY id
  `);

  const appliedMap = new Map<string, Date>();
  for (const row of appliedResult.rows) {
    appliedMap.set(row.migration_name, new Date(row.applied_at));
  }

  // Scan migration files
  const files = fs
    .readdirSync(migrationsFolder)
    .filter(file => file.endsWith('.sql') && !file.startsWith('_'))
    .sort();

  const migrations: MigrationInfo[] = [];

  for (const file of files) {
    const fileName = file.replace('.sql', '');
    const match = fileName.match(/^(\d+)_(.+)$/);
    
    if (!match) continue;

    const version = match[1];
    const name = match[2];
    const filePath = path.join(migrationsFolder, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const hasDownSection = /--\s*DOWN:/i.test(content);

    migrations.push({
      version,
      name,
      status: appliedMap.has(fileName) ? 'Applied' : 'Pending',
      appliedAt: appliedMap.get(fileName),
      hasDownSection,
    });
  }

  return migrations;
}

function generateMarkdown(tables: TableInfo[], migrations: MigrationInfo[]): string {
  let md = `# AI Agent Rules для FreeMarketBoard

## База данных

Этот файл содержит актуальную информацию о структуре базы данных, правилах работы с миграциями и известных проблемах.

> **Важно:** Этот файл генерируется автоматически. Не редактируйте его вручную.
> Для обновления запустите: \`npm run generate:agent-rules\`

---

### Таблицы и связи

`;

  for (const table of tables) {
    md += `#### ${table.tableName}\n\n`;

    // Columns
    md += '| Column | Type | Nullable | Default | PK |\n';
    md += '|--------|------|----------|---------|----|\n';
    
    for (const col of table.columns) {
      const pk = col.isPrimaryKey ? '✓' : '';
      const nullable = col.isNullable ? 'YES' : 'NO';
      const defaultVal = col.defaultValue ? col.defaultValue : '-';
      md += `| \`${col.columnName}\` | ${col.dataType} | ${nullable} | ${defaultVal} | ${pk} |\n`;
    }

    // Foreign Keys
    if (table.foreignKeys.length > 0) {
      md += '\n**Foreign Keys:**\n\n';
      md += '| FK Column | References | ON DELETE | ON UPDATE |\n';
      md += '|-----------|------------|-----------|----------|\n';
      
      for (const fk of table.foreignKeys) {
        md += `| \`${fk.columnName}\` | ${fk.referencedTable}.${fk.referencedColumn} | ${fk.onDelete} | ${fk.onUpdate} |\n`;
      }
    }

    // Important notes based on CASCADE rules
    const cascadeFks = table.foreignKeys.filter(fk => fk.onDelete === 'CASCADE');
    if (cascadeFks.length > 0) {
      md += '\n**Важно:** При удалении записи из этой таблицы будут автоматически удалены связанные записи из:\n';
      const cascadeTables = [...new Set(cascadeFks.map(fk => fk.referencedTable))];
      for (const refTable of cascadeTables) {
        const fks = cascadeFks.filter(fk => fk.referencedTable === refTable);
        const fkNames = fks.map(fk => `\`${fk.columnName}\``).join(', ');
        md += `- \`${refTable}\` (через ${fkNames})\n`;
      }
    }

    md += '\n---\n\n';
  }

  // Foreign Keys Summary
  md += `### Внешние ключи с CASCADE

| Таблица | FK Column | Цель | ON DELETE |
|---------|-----------|------|-----------|
`;

  for (const table of tables) {
    for (const fk of table.foreignKeys) {
      if (fk.onDelete === 'CASCADE') {
        md += `| ${table.tableName} | ${fk.columnName} | ${fk.referencedTable}.${fk.referencedColumn} | CASCADE |\n`;
      }
    }
  }

  // Migrations
  md += `\n## Миграции

### Формат файлов

Каждая новая миграция должна содержать две секции:

\`\`\`sql
-- UP: Описание миграции
CREATE TABLE ...;

-- DOWN: Описание отката
DROP TABLE ...;
\`\`\`

### Команды CLI

- \`npm run migrate:status\` - показать статус всех миграций
- \`npm run migrate:status -- --name=0008\` - показать статус конкретной миграции
- \`npm run migrate:up\` - применить все ожидающие миграции
- \`npm run migrate:down -- --count=1\` - откатить последнюю миграцию
- \`npm run migrate:init\` - инициализировать таблицу _migrations

### Статус миграций

| Версия | Название | Статус | Применена | DOWN секция |
|--------|----------|--------|-----------|-------------|
`;

  for (const m of migrations) {
    const date = m.appliedAt ? m.appliedAt.toLocaleString('ru-RU') : '-';
    const down = m.hasDownSection ? '✓' : '✗';
    md += `| ${m.version} | ${m.name} | ${m.status} | ${date} | ${down} |\n`;
  }

  // Known Issues
  md += `
## Известные проблемы

### Проблема: Удаление объявления с спецификациями

**Ошибка:** \`PostgresError: update or delete on table "ads" violates foreign key constraint "ad_specifications_ad_id_ads_id_fk" on table "ad_specifications"\`

**Причина:** Внешний ключ между \`ad_specifications\` и \`ads\` не имел \`ON DELETE CASCADE\`.

**Решение:** Применена миграция \`0009_fix_ad_specifications_fk.sql\`, которая добавляет \`ON DELETE CASCADE\` к внешнему ключу.

---

## Best Practices

1. **Всегда проверяйте наличие CASCADE для внешних ключей перед удалением записей**
   - Используйте команду \`npm run generate:agent-rules\` для получения актуальной информации

2. **Используйте транзакции для операций с несколькими таблицами**
   - Это обеспечивает атомарность изменений

3. **Создавайте DOWN секции для всех новых миграций**
   - Это позволяет откатить миграцию в случае ошибок

4. **Перед удалением данных проверяйте связанные таблицы**
   - Даже при наличии CASCADE лучше явно удалять зависимые данные

5. **Регулярно запускайте генерацию правил для AI-агентов**
   - Команда: \`npm run generate:agent-rules\`
   - Файл: \`.ai/AGENT_RULES.md\`

---

*Сгенерировано: ${new Date().toISOString()}*
`;

  return md;
}

async function main(): Promise<void> {
  loadEnv();

  const connectionString = process.env.DATABASE_URL || 'postgres://admin:StrongPass123!@localhost:5432/freemarketboards';
  const migrationsFolder = process.env.MIGRATIONS_FOLDER || path.join(process.cwd(), 'migrations');
  const outputFolder = path.join(process.cwd(), '.ai');

  console.log('Generating AI Agent Rules...');
  console.log(`Database: ${connectionString.split('@').pop()}`);
  console.log(`Migrations folder: ${migrationsFolder}`);

  const pool = new Pool({ connectionString });

  try {
    // Create output folder if not exists
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
      console.log(`Created folder: ${outputFolder}`);
    }

    // Get table metadata
    console.log('\n[1/3] Retrieving table metadata...');
    const tables = await getTableMetadata(pool);
    console.log(`Found ${tables.length} table(s)`);

    // Get migration info
    console.log('\n[2/3] Retrieving migration info...');
    const migrations = await getMigrationInfo(pool, migrationsFolder);
    console.log(`Found ${migrations.length} migration(s)`);

    // Generate markdown
    console.log('\n[3/3] Generating AGENT_RULES.md...');
    const markdown = generateMarkdown(tables, migrations);

    const outputPath = path.join(outputFolder, 'AGENT_RULES.md');
    fs.writeFileSync(outputPath, markdown, 'utf-8');

    console.log(`\n✓ Generated: ${outputPath}`);
    console.log(`  Tables: ${tables.length}`);
    console.log(`  Migrations: ${migrations.length}`);

  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
