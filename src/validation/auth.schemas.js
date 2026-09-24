import { z } from 'zod';

const email = z.string().trim().email().max(254).transform(value => value.toLowerCase());
function isSafeSqlInput(str) {
    if (!str || typeof str !== 'string') return false;
    const normalized = str.trim().toLowerCase();
    const suspiciousPatterns = [
        'select ',
        'insert ',
        'update ',
        'delete ',
        'drop ',
        'truncate ',
        'alter ',
        'exec ',
        'union ',
        ' or ',
        ' and ',
        '--',
        ';--',
        ';',
        '/*',
        '*/',
        '@@',
        'char(',
        'nchar(',
        'varchar(',
        'cast(',
        'convert(',
    ];
    return !suspiciousPatterns.some(pattern => normalized.includes(pattern));
}

function isNotTrivialPassword(pwd) {
    if (!pwd || typeof pwd !== 'string') return false;
    if (!isSafeSqlInput(pwd)) return false;

    // Reject repeated characters (e.g. 11111111, aaaaaaaa)
    if (/^(.)\1+$/.test(pwd)) return false;

    // Reject sequential ascending or descending digits or letters (e.g. 12345678, 87654321, abcdefgh)
    const sequences = [
        '01234567890123456789',
        '98765432109876543210',
        'abcdefghijklmnopqrstuvwxyz',
        'zyxwvutsrqponmlkjihgfedcba',
        'qwertyuiop',
        'asdfghjkl',
    ];
    const lower = pwd.toLowerCase();
    for (const seq of sequences) {
        if (seq.includes(lower)) return false;
    }

    return true;
}

const password = z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .refine(isNotTrivialPassword, {
        message: 'Password cannot be an easily predictable sequential or repeated pattern',
    });
const code = z.string().trim().min(6).max(64);

function isAtLeast16YearsOld(dateString) {
    if (!dateString || typeof dateString !== 'string') return false;
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateString);
    if (!match) return false;
    const [, y, m, d] = match;
    const year = Number(y);
    const month = Number(m) - 1;
    const day = Number(d);
    const birthDate = new Date(Date.UTC(year, month, day));
    if (birthDate.getUTCFullYear() !== year || birthDate.getUTCMonth() !== month || birthDate.getUTCDate() !== day) {
        return false;
    }
    const today = new Date();
    let age = today.getUTCFullYear() - year;
    const monthDiff = today.getUTCMonth() - month;
    if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < day)) {
        age--;
    }
    return age >= 16;
}

export const registerSchema = z.object({
    username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/),
    email,
    password,
    gender: z.enum(['male', 'female', 'non_binary', 'other', 'prefer_not_to_say']),
    birthdate: z.iso.date().refine(isAtLeast16YearsOld, {
        message: 'You must be at least 16 years old to register',
    }),
});

export const loginSchema = z.object({
    email: email.optional(),
    username: z.string().trim().min(3).max(30).optional(),
    password: z.string().min(1).max(128),
}).refine(value => value.email || value.username, {
    message: 'Email or username is required',
    path: ['email'],
});

export const emailSchema = z.object({ email });
export const passwordResetSchema = z.object({ email, token: code, newPassword: password });
export const verificationRequestSchema = z.object({ type: z.enum(['email', 'sms']) });
export const verificationConfirmSchema = z.object({ token: code, type: z.enum(['email', 'sms']) });
export const totpSchema = z.object({ token: z.string().regex(/^\d{6}$/) });
export const twoFactorCodeSchema = z.object({ code });
export const twoFactorLoginSchema = z.object({ challengeToken: z.string().min(20).max(4096), code });
