import dayjs from 'dayjs'

/**
 * Devuelve la fecha actual con la compensación de +2 horas (zona horaria de España, por ejemplo).
 */
export function getCorrectNow(from) {
    return dayjs(from || undefined).add(2, 'hours')
}
