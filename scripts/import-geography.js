import AdmZip from "adm-zip";
import crypto from "node:crypto";
import pg from "pg";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const GEONAMES_REVISION = "2026-09-22";
const GEONAMES_BASE_URL = "https://download.geonames.org/export/dump";
const LANGUAGE_CODES = ["es", "en"];
const CITY_DATASET = "cities500.zip";
const countryDisplayNames = new Intl.DisplayNames(["es"], { type: "region" });

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
if (!process.env.DB_URL) {
    const envPath = path.join(rootDir, ".env");
    if (fs.existsSync(envPath)) {
        process.loadEnvFile(envPath);
    }
}

if (!process.env.DB_URL) {
    console.error("❌ Error: DB_URL is not defined in .env.");
    process.exit(1);
}

function normalize(value) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLocaleLowerCase("und");
}

function rows(text) {
    return text
        .split(/\r?\n/)
        .filter((line) => line && !line.startsWith("#"))
        .map((line) => line.split("\t"));
}

async function fetchText(file) {
    const response = await fetch(`${GEONAMES_BASE_URL}/${file}`);
    if (!response.ok)
        throw new Error(
            `Unable to download GeoNames ${file}: ${response.status}`,
        );
    return response.text();
}

async function fetchZipEntry(file, entryName) {
    const response = await fetch(`${GEONAMES_BASE_URL}/${file}`);
    if (!response.ok)
        throw new Error(
            `Unable to download GeoNames ${file}: ${response.status}`,
        );
    const archive = new AdmZip(Buffer.from(await response.arrayBuffer()));
    const entry = archive.getEntry(entryName);
    if (!entry)
        throw new Error(
            `GeoNames archive ${file} does not contain ${entryName}`,
        );
    return entry.getData().toString("utf8");
}

async function withTransaction(client, work) {
    await client.query("BEGIN");
    try {
        await work();
        await client.query("COMMIT");
    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
}

async function importGeography() {
    if (!process.env.DB_URL) throw new Error("DB_URL is required");
    const [countryInfo, admin1Codes, cities] = await Promise.all([
        fetchText("countryInfo.txt"),
        fetchText("admin1CodesASCII.txt"),
        fetchZipEntry(CITY_DATASET, "cities500.txt"),
    ]);

    const manifest = JSON.stringify({
        source: "GeoNames",
        revision: GEONAMES_REVISION,
        files: ["countryInfo.txt", "admin1CodesASCII.txt", CITY_DATASET],
        sha256: crypto
            .createHash("sha256")
            .update(countryInfo)
            .update(admin1Codes)
            .update(cities)
            .digest("hex"),
    });
    console.log(`GeoNames manifest: ${manifest}`);

    const pool = new pg.Pool({ connectionString: process.env.DB_URL });
    const client = await pool.connect();
    try {
        await withTransaction(client, async () => {
            const languages = await client.query(
                "SELECT id, code FROM supported_languages WHERE code = ANY($1::text[])",
                [LANGUAGE_CODES],
            );
            const languageIds = Object.fromEntries(
                languages.rows.map((row) => [row.code, row.id]),
            );
            if (LANGUAGE_CODES.some((code) => !languageIds[code]))
                throw new Error(
                    "Spanish and English catalog languages are required",
                );

            for (const fields of rows(countryInfo)) {
                const isoCode = fields[0];
                const englishName = fields[4];
                const spanishName = countryDisplayNames.of(isoCode) ?? englishName;
                const geonamesId = fields[16];
                if (!/^[A-Z]{2}$/.test(isoCode ?? "")) continue;
                const country = await client.query(
                    `INSERT INTO countries (iso_code, geonames_id, updated_at)
                    VALUES ($1, $2, NOW())
                    ON CONFLICT (iso_code) DO UPDATE SET geonames_id = EXCLUDED.geonames_id, updated_at = NOW()
                    RETURNING id`,
                    [isoCode, Number(geonamesId)],
                );
                for (const code of LANGUAGE_CODES) {
                    await client.query(
                        `INSERT INTO country_name_translations (country_id, language_id, name, normalized_name)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (country_id, language_id) DO UPDATE SET name = EXCLUDED.name, normalized_name = EXCLUDED.normalized_name`,
                        [
                            country.rows[0].id,
                            languageIds[code],
                            code === "es" ? spanishName : englishName,
                            normalize(code === "es" ? spanishName : englishName),
                        ],
                    );
                }
            }

            const countries = await client.query(
                "SELECT id, iso_code FROM countries",
            );
            const countryIds = Object.fromEntries(
                countries.rows.map((row) => [row.iso_code, row.id]),
            );
            const regionIds = new Map();

            for (const fields of rows(admin1Codes)) {
                const [compoundCode, englishName, , geonamesId] = fields;
                const [isoCode, adminCode] = String(compoundCode).split(".");
                const countryId = countryIds[isoCode];
                if (!countryId || !adminCode) continue;
                const region = await client.query(
                    `INSERT INTO regions (country_id, geonames_id, admin_code, catalog_key, updated_at)
                    VALUES ($1, $2, $3, $4, NOW())
                    ON CONFLICT (geonames_id) DO UPDATE SET country_id = EXCLUDED.country_id, admin_code = EXCLUDED.admin_code, updated_at = NOW()
                    RETURNING id`,
                    [
                        countryId,
                        Number(geonamesId),
                        adminCode,
                        `geonames-region:${geonamesId}`,
                    ],
                );
                regionIds.set(`${isoCode}.${adminCode}`, region.rows[0].id);
                for (const code of LANGUAGE_CODES) {
                    await client.query(
                        `INSERT INTO region_name_translations (region_id, language_id, name, normalized_name)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (region_id, language_id) DO UPDATE SET name = EXCLUDED.name, normalized_name = EXCLUDED.normalized_name`,
                        [
                            region.rows[0].id,
                            languageIds[code],
                            englishName,
                            normalize(englishName),
                        ],
                    );
                }
            }

            const cityRecords = [];
            for (const fields of rows(cities)) {
                const [
                    geonamesId,
                    name,
                    asciiName,
                    ,
                    latitude,
                    longitude,
                    featureClass,
                    ,
                    isoCode,
                    ,
                    admin1Code,
                    ,
                    ,
                    ,
                    population,
                ] = fields;
                const countryId = countryIds[isoCode];
                const regionId =
                    regionIds.get(`${isoCode}.${admin1Code}`) ?? null;
                if (!countryId || featureClass !== "P" || !regionId) continue;
                cityRecords.push({
                    geonamesId: Number(geonamesId),
                    countryId,
                    regionId,
                    name,
                    asciiName: asciiName || name,
                    spanishName: name,
                    latitude: Number(latitude),
                    longitude: Number(longitude),
                    population: Number(population) || null,
                });
            }

            for (let start = 0; start < cityRecords.length; start += 250) {
                const batch = cityRecords.slice(start, start + 250);
                const values = [];
                const params = [];
                batch.forEach((city, index) => {
                    const base = index * 7;
                    values.push(
                        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, NOW())`,
                    );
                    params.push(
                        city.countryId,
                        city.regionId,
                        city.geonamesId,
                        `geonames-city:${city.geonamesId}`,
                        city.latitude,
                        city.longitude,
                        city.population,
                    );
                });
                const imported = await client.query(
                    `INSERT INTO cities (country_id, region_id, geonames_id, catalog_key, latitude, longitude, population, updated_at)
                    VALUES ${values.join(", ")}
                    ON CONFLICT (geonames_id) DO UPDATE SET
                        country_id = EXCLUDED.country_id, region_id = EXCLUDED.region_id,
                        latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
                        population = EXCLUDED.population, updated_at = NOW()
                    RETURNING id, geonames_id`,
                    params,
                );
                const cityIds = Object.fromEntries(
                    imported.rows.map((row) => [row.geonames_id, row.id]),
                );
                const translationValues = [];
                const translationParams = [];
                batch.forEach((city) => {
                    for (const code of LANGUAGE_CODES) {
                        const label = code === "en" ? city.asciiName : city.spanishName;
                        const base = translationParams.length;
                        translationValues.push(
                            `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`,
                        );
                        translationParams.push(
                            cityIds[city.geonamesId],
                            languageIds[code],
                            label,
                            normalize(label),
                        );
                    }
                });
                await client.query(
                    `INSERT INTO city_name_translations (city_id, language_id, name, normalized_name)
                    VALUES ${translationValues.join(", ")}
                    ON CONFLICT (city_id, language_id) DO UPDATE SET name = EXCLUDED.name, normalized_name = EXCLUDED.normalized_name`,
                    translationParams,
                );
            }
        });
    } finally {
        client.release();
        await pool.end();
    }
}

importGeography().catch((error) => {
    console.error("GeoNames import failed:", error);
    process.exitCode = 1;
});
