import { z } from "zod";

const hex = (length) => new RegExp(`^[a-fA-F0-9]{${length}}$`);

function commaSeparatedOrigins(value) {
    if (value === "*") {
        return ["*"];
    }
    const origins = value
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean);
    for (const origin of origins) {
        const url = new URL(origin);
        if (
            !["http:", "https:"].includes(url.protocol) ||
            url.origin !== origin
        ) {
            throw new Error(`Invalid origin: ${origin}`);
        }
    }
    return origins;
}

const environmentSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
    PORT: z.coerce.number().int().min(1).max(65_535).default(3000),
    TRUST_PROXY: z.enum(['loopback', 'linklocal', 'uniquelocal']).default('loopback'),
    DB_URL: z.url().startsWith("postgres"),
    JWT_SECRET: z.string().min(32),
    ORIGIN: z.string().min(1),
    SALT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
    UPLOAD_MAX_BYTES: z.coerce
        .number()
        .int()
        .min(1_024)
        .max(20 * 1024 * 1024)
        .default(5 * 1024 * 1024),
    UPLOAD_ROOT: z.string().optional(),
    SECRET_2FA_KEY: z.string().regex(hex(64)),
    SECRET_2FA_IV: z.string().regex(hex(32)).optional(),
    EMAIL_HOST: z.string().optional(),
    EMAIL_PORT: z.coerce.number().int().min(1).max(65_535).default(587),
    EMAIL_SECURE: z.enum(["true", "false"]).default("false"),
    EMAIL_USER: z.string().optional(),
    EMAIL_PASSWORD: z.string().optional(),
    FIREBASE_SERVICE_ACCOUNT_FILE_NAME: z.string().optional(),
    RAWG_API_KEY: z.string().optional(),
    CATALOG_SYNC_INTERVAL_HOURS: z.coerce.number().int().min(1).default(24),
});

export function parseEnv(input = process.env) {
    const result = environmentSchema.safeParse(input);
    if (!result.success) {
        const details = result.error.issues
            .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
            .join("; ");
        throw new Error(`Invalid environment configuration: ${details}`);
    }
    let corsOrigins;
    try {
        corsOrigins = commaSeparatedOrigins(result.data.ORIGIN);
    } catch (error) {
        throw new Error(
            `Invalid environment configuration: ORIGIN: ${error.message}`,
        );
    }
    return {
        nodeEnv: result.data.NODE_ENV,
        port: result.data.PORT,
        trustProxy: result.data.TRUST_PROXY,
        databaseUrl: result.data.DB_URL,
        jwtSecret: result.data.JWT_SECRET,
        corsOrigins,
        bcryptRounds: result.data.SALT_ROUNDS,
        uploadMaxBytes: result.data.UPLOAD_MAX_BYTES,
        uploadRoot: result.data.UPLOAD_ROOT,
        twoFactorKey: result.data.SECRET_2FA_KEY,
        legacyTwoFactorIv: result.data.SECRET_2FA_IV,
        email: {
            host: result.data.EMAIL_HOST,
            port: result.data.EMAIL_PORT,
            secure: result.data.EMAIL_SECURE === "true",
            user: result.data.EMAIL_USER,
            password: result.data.EMAIL_PASSWORD,
        },
        firebaseServiceAccountFile:
            result.data.FIREBASE_SERVICE_ACCOUNT_FILE_NAME,
        rawgApiKey: result.data.RAWG_API_KEY,
        catalogSyncIntervalHours: result.data.CATALOG_SYNC_INTERVAL_HOURS,
    };
}
