import { z } from 'zod';

const email = z.string().trim().email().max(254).transform(value => value.toLowerCase());
const password = z.string().min(12).max(128);
const code = z.string().trim().min(6).max(64);

export const registerSchema = z.object({
    username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_.]+$/),
    email,
    password,
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
