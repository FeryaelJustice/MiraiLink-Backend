import dayjs from 'dayjs'

/**
 * Devuelve la fecha actual con la compensación de +2 horas (zona horaria de España, por ejemplo).
 */
export function getCorrectNow(from) {
    return dayjs(from || undefined).add(2, 'hours')
}

export function normalizeBirthdate(input) {
    if (!input) return null;
    const raw = String(input).trim();

    // Caso ideal: ya viene "YYYY-MM-DD"
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

    // Caso ISO con tiempo: "YYYY-MM-DDThh:mm:ss(.sss)?(Z|±hh:mm)?"
    if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) {
        const datePart = raw.split('T')[0];
        return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : null;
    }

    // Último intento: parsear y formatear a fecha (por si llega con espacios u otros formatos)
    const d = new Date(raw);
    if (isNaN(d.getTime())) return null;
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}
