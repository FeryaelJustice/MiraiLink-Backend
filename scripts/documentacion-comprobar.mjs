/** Comprueba enlaces locales del conjunto de estudio sin leer secretos ni media. */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import console from 'node:console';

const root = process.cwd();
const paths = ['docs/guia-maestra.md', 'docs/estudio', 'docs/diagramas', 'docs/features/documentacion_integral'];
const files = [];
function collect(target) {
    if (!fs.existsSync(target)) return;
    if (fs.statSync(target).isFile()) { if (target.endsWith('.md')) files.push(target); return; }
    for (const child of fs.readdirSync(target)) collect(path.join(target, child));
}
paths.forEach(file => collect(path.join(root, file)));
const failures = [];
let count = 0;
for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    if (/[\u2013\u2014]/u.test(text)) failures.push({ file: path.relative(root,file), reason: 'Guion tipográfico no permitido' });
    for (const m of text.matchAll(/\[[^\]]*\]\(([^\s)]+)\)/g)) {
        if (/^(https?:|mailto:|#)/.test(m[1])) continue;
        const [url, anchor] = m[1].split('#');
        const destination = path.resolve(path.dirname(file), decodeURIComponent(url));
        count++;
        if (!fs.existsSync(destination)) failures.push({ file: path.relative(root,file), destination: m[1] });
        // No leer targets: el conjunto incluye enlaces a fuentes y ficheros privados nombrados en políticas.
        if (anchor) failures.push({ file: path.relative(root,file), reason: 'Revisar ancla manualmente', destination: m[1] });
    }
}
console.log(JSON.stringify({ documents: files.length, localLinks: count, failures }, null, 2));
if (failures.length) process.exitCode = 1;
