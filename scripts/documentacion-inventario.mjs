/**
 * Actualiza los anexos de estudio a partir de fuentes propias versionadas.
 * Uso: node scripts/documentacion-inventario.mjs android|backend
 * No lee secretos, datos multimedia, dependencias ni ejecuta SQL.
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';
import { execFileSync } from 'node:child_process';

const kind = process.argv[2];
if (!['android', 'backend'].includes(kind)) throw new Error('Indica android o backend');
const root = process.cwd();
const roots = kind === 'android'
    ? ['app/src/main/java', 'app/src/main/res/xml', 'gradle/libs.versions.toml', 'app/build.gradle.kts']
    : ['src', 'scripts', 'package.json', 'package-lock.json'];
const files = execFileSync('git', ['ls-files', '--', ...roots, ':(exclude)src/assets/**'], { encoding: 'utf8' })
    .trim().split(/\r?\n/).filter(Boolean).filter(f => /\.(kt|js|sql|xml|kts|toml)$/.test(f));
const entries = files.map(file => ({ file, text: fs.readFileSync(path.join(root, file), 'utf8') }));
const out = 'docs/estudio';
function write(file, text) {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), `${text.trim()}\n`, 'utf8');
}
const link = (file, prefix = '../../') => `[${file}](${prefix}${file})`;
const cell = value => String(value).replaceAll('|', '\\|').replace(/\r?\n/g, ' ').replaceAll('`', '\\`');
let reference = '# Referencia navegable de fuentes propias\n\n';
reference += 'Anexo obtenido por inspección estática. Las declaraciones y consumidores son ayudas de navegación, no un análisis completo de ejecución. Revisar el flujo en los documentos temáticos y en el código. Los enlaces de archivo evitan números de línea que quedarían obsoletos al editar comentarios.\n\n';
reference += '[Volver a la guía maestra](../guia-maestra.md). Regeneración: `node scripts/documentacion-inventario.mjs ' + kind + '`.\n\n';
const sources = entries.filter(e => kind === 'android' ? e.file.endsWith('.kt') : e.file.endsWith('.js'));
for (const { file, text } of sources) {
    const declarations = [...text.matchAll(kind === 'android'
        ? /(?:^|\n)\s*(?:(?:private|public|internal|protected|override|suspend|inline|data|sealed|abstract|open|enum|annotation|value|tailrec|actual|expect)\s+)*(?:fun\s+(?:<[^>]+>\s*)?([\w.<>?]+)\s*\(|(?:class|interface|object)\s+(\w+))/g
        : /(?:^|\n)\s*(?:export\s+)?(?:async\s+)?function\s+(\w+)|(?:^|\n)\s*export\s+(?:const|class)\s+(\w+)/g)]
        .map(m => m[1] || m[2]);
    const imports = [...text.matchAll(kind === 'android' ? /^import\s+([\w.]+)/gm : /(?:from\s+|import\s*)['"]([^'"]+)['"]/g)].map(m => m[1]);
    const basename = path.basename(file).replace(/\.(kt|js)$/, '');
    const consumers = sources.filter(e => e.file !== file && (kind === 'android'
        ? e.text.includes(`.${basename}`) : e.text.includes(path.basename(file))))
        .map(e => link(e.file));
    reference += `## ${file}\n\nFuente: ${link(file)}.\n\n`;
    reference += `Declaraciones: ${declarations.length ? [...new Set(declarations)].map(d => '`' + d + '`').join(', ') : 'Sin declaración detectada por el extractor; revisar la fuente'}.\n\n`;
    reference += `Dependencias importadas: ${[...new Set(imports)].map(i => '`' + i + '`').join(', ') || 'Ninguna detectada'}.\n\n`;
    reference += `Consumidores directos por importación o referencia al archivo: ${consumers.join(', ') || 'No detectados estáticamente; puede usarse por DI, manifest o reflexión'}.\n\n`;
}
write(`${out}/referencia-codigo.md`, reference);

let config = '# Índice de lectores de configuración\n\n[Guía maestra](../guia-maestra.md) | [Semántica de configuración](configuracion.md).\n\nSolo nombres y ubicaciones obtenidos de código versionado. No se han leído archivos privados. Este índice complementa la explicación de requisitos, fallback y errores del documento temático.\n\n| Nombre | Fuentes lectoras |\n| --- | --- |\n';
const options = new Map();
for (const { file, text } of entries) {
    for (const m of text.matchAll(kind === 'backend'
        ? /process\.env\.([A-Z][A-Z_0-9]*)/g
        : /(?:getProperty|remoteConfig\.getString|remoteConfig\.getBoolean)\("([^"]+)"\)|BuildConfig\.([A-Z][A-Z_0-9]*)/g)) {
        const key = m[1] || m[2];
        if (!options.has(key)) options.set(key, new Set());
        options.get(key).add(file);
    }
}
for (const [name, consumers] of [...options].sort(([a], [b]) => a.localeCompare(b))) {
    config += `| \`${name}\` | ${[...consumers].map(f => link(f)).join(', ')} |\n`;
}
write(`${out}/lectores-configuracion.md`, config);

if (kind === 'backend') {
    // Reconstrucción documental de DDL sencillo; no sustituye un parser PostgreSQL.
    const sqlFiles = entries.filter(e => e.file === 'src/database/db.sql' || e.file.startsWith('src/database/migrations/')).sort((a, b) => a.file.localeCompare(b.file));
    const tables = new Map();
    function splitColumns(body) {
        let level = 0, quoted = false, start = 0;
        const parts = [];
        for (let i = 0; i < body.length; i++) {
            if (body[i] === "'") quoted = !quoted;
            if (!quoted) {
                if (body[i] === '(') level++;
                if (body[i] === ')') level--;
                if (body[i] === ',' && level === 0) { parts.push(body.slice(start, i).trim()); start = i + 1; }
            }
        }
        parts.push(body.slice(start).trim());
        return parts.filter(Boolean);
    }
    for (const { file, text } of sqlFiles) {
        const sql = text.replace(/--[^\n]*/g, '');
        for (const m of sql.matchAll(/^\s*CREATE TABLE (?:IF NOT EXISTS )?(?:public\.)?(\w+)\s*\(/gm)) {
            if (tables.has(m[1])) continue;
            let i = m.index + m[0].length, level = 1, quoted = false;
            const start = i;
            for (; i < sql.length; i++) {
                if (sql[i] === "'") quoted = !quoted;
                if (!quoted && sql[i] === '(') level++;
                if (!quoted && sql[i] === ')') level--;
                if (!level) break;
            }
            const columns = new Map(), constraints = [];
            for (const part of splitColumns(sql.slice(start, i))) {
                if (/^(PRIMARY|UNIQUE|CHECK|FOREIGN|CONSTRAINT)\b/.test(part)) constraints.push(part);
                else columns.set(part.split(/\s/)[0], part);
            }
            tables.set(m[1], { columns, constraints, source: file });
        }
        for (const m of sql.matchAll(/ALTER TABLE (\w+) (ADD COLUMN (?:IF NOT EXISTS )?(\w+) ([^;]+)|RENAME COLUMN (\w+) TO (\w+)|DROP COLUMN (?:IF EXISTS )?(\w+)|ADD CONSTRAINT ([^;]+)|ALTER COLUMN ([^;]+));/g)) {
            const table = tables.get(m[1]);
            if (!table) throw new Error(`Tabla sin baseline: ${m[1]}`);
            if (m[3] && !table.columns.has(m[3])) table.columns.set(m[3], `${m[3]} ${m[4].trim()}`);
            if (m[5] && table.columns.has(m[5])) {
                table.columns.set(m[6], table.columns.get(m[5]).replace(new RegExp(`^${m[5]}\\b`), m[6]));
                table.columns.delete(m[5]);
            }
            if (m[7]) table.columns.delete(m[7]);
            if (m[8]) table.constraints.push(`CONSTRAINT ${m[8]}`);
            if (m[9]) table.constraints.push(`ALTER COLUMN ${m[9]}`);
        }
    }
    // El migrador crea esta tabla en tiempo de ejecución, fuera de los archivos SQL.
    tables.set('schema_migrations', { source: 'src/database/migrator.js', columns: new Map([
        ['filename', 'filename TEXT PRIMARY KEY'], ['applied_at', 'applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()'],
    ]), constraints: [] });
    const relationships = [];
    let dictionary = '# Diccionario del esquema versionado\n\n[Guía maestra](../guia-maestra.md) | [Modelo y operación](base-de-datos.md) | [Diagramas](../diagramas/indice.md).\n\nResultado documental del baseline y migraciones, más `schema_migrations` del migrador. No representa una inspección de la base desplegada. Las condiciones de migración dependen del estado previo; consultar el SQL para casos legacy. Índices y restricciones modificadas se conservan en el anexo DDL.\n\n';
    for (const [name, table] of tables) {
        dictionary += `## ${name}\n\nOrigen: ${link(table.source)}.\n\n| Columna | Declaración SQL final o inicial con ajustes en restricciones |\n| --- | --- |\n`;
        for (const [column, declaration] of table.columns) {
            dictionary += `| \`${column}\` | ${cell(declaration)} |\n`;
            const fk = declaration.match(/REFERENCES (\w+)\((\w+)\)(?: ON DELETE (CASCADE|SET NULL|RESTRICT))?/);
            if (fk) relationships.push({ parent: fk[1], child: name, column, deletion: fk[3] || 'NO ACTION', required: /NOT NULL|PRIMARY KEY/.test(declaration) || table.constraints.some(c => c.startsWith('PRIMARY KEY') && c.includes(column)), unique: /PRIMARY KEY|UNIQUE/.test(declaration) || table.constraints.some(c => new RegExp(`(?:UNIQUE|PRIMARY KEY)\\s*\\(\\s*${column}\\s*\\)`).test(c)) });
        }
        dictionary += '\nRestricciones de tabla/ajustes: ' + (table.constraints.map(c => '`' + cell(c) + '`').join('; ') || 'Ver restricciones inline en columnas') + '.\n\n';
    }
    dictionary += '## Relaciones declaradas\n\n| Tabla hija y columna | Tabla padre | ON DELETE | Nulabilidad |\n| --- | --- | --- | --- |\n';
    for (const r of relationships) dictionary += `| ${r.child}.${r.column} | ${r.parent} | ${r.deletion} | ${r.required ? 'Obligatoria' : 'Admite NULL'} |\n`;
    write(`${out}/diccionario-esquema.md`, dictionary);
    let ddl = '# DDL de referencia\n\n[Modelo de datos](base-de-datos.md). Selección de definiciones estructurales para estudio, nunca instrucciones para ejecutar contra producción. Las sentencias condicionales deben interpretarse en su contexto original.\n\n';
    for (const { file, text } of sqlFiles) {
        ddl += `## ${file}\n\n${link(file)}\n\n\`\`\`sql\n`;
        ddl += text.split(/\r?\n/).filter(line => /^\s*(?:ALTER TABLE|CREATE (?:UNIQUE )?INDEX|COMMENT ON)/.test(line)).join('\n');
        ddl += '\n```\n\n';
    }
    write(`${out}/ddl-referencia.md`, ddl);
    const groups = {
        'er-completo': () => true,
        'er-seguridad-social': name => /users$|token|2fa|recovery|photo|like|match|chat|message|report|feedback|app_version|subscription|schema_migration/.test(name),
        'er-catalogos-perfil': name => !/countr|region|cit|location|search/.test(name) && !/token|2fa|recovery|photo|like|match|chat|message|report|feedback|app_version|subscription|schema_migration/.test(name),
        'er-geografia': name => /users$|countr|region|cit|language|location|search/.test(name) && !/spoken/.test(name),
    };
    for (const [name, filter] of Object.entries(groups)) {
        let er = `# ${name}\n\n[Índice de diagramas](indice.md) | [Diccionario del esquema](../estudio/diccionario-esquema.md).\n\nTipo: entidad-relación, no UML. Incluye entidades de la vista y relaciones SQL declaradas. Padre obligatorio: ||; padre opcional: |o; hijos: o{ o un máximo de uno cuando la FK es única. Las tablas puente usan PK compuesta descrita en el diccionario.\n\n\`\`\`mermaid\nerDiagram\n`;
        for (const [tableName, table] of tables) {
            if (!filter(tableName)) continue;
            er += `    ${tableName} {\n`;
            for (const [column, declaration] of table.columns) {
                const type = declaration.split(/\s+/)[1].replace(/\(.*/, '').replace(/\[\]/g, '_array');
                const keys = [];
                if (/PRIMARY KEY/.test(declaration) || table.constraints.some(c => c.startsWith('PRIMARY KEY') && new RegExp(`\\b${column}\\b`).test(c))) keys.push('PK');
                if (/REFERENCES/.test(declaration)) keys.push('FK');
                if (/UNIQUE/.test(declaration)) keys.push('UK');
                const key = keys.length ? ' ' + keys.join(', ') : '';
                er += `        ${type} ${column}${key}\n`;
            }
            er += '    }\n';
        }
        for (const r of relationships.filter(r => filter(r.child) && filter(r.parent))) {
            er += `    ${r.parent} ${r.required ? '||' : '|o'}--${r.unique ? 'o|' : 'o{'} ${r.child} : "${r.column}"\n`;
        }
        er += '```\n\nEl esquema contiene tablas y columnas legacy conservadas; su presencia no acredita uso activo en todos los handlers. Ver las fuentes y los hallazgos.\n';
        write(`docs/diagramas/${name}.md`, er);
    }
    console.log(JSON.stringify({ sources: sources.length, tables: tables.size, foreignKeys: relationships.length, configReaders: options.size }));
} else {
    console.log(JSON.stringify({ sources: sources.length, configReaders: options.size }));
}
