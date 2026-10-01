# Tecnologías backend y uso concreto

[Guía maestra](../guia-maestra.md) | [Cobertura](cobertura.md)

Revisión de fuentes: 2026-10-01. Las observaciones estáticas no certifican el servidor desplegado ni el comportamiento en dispositivo.


Fuente de declaraciones: [package.json](../../package.json). Los rangos semver no son una certificación de versiones del despliegue.

| Tecnología | Declaración | Uso concreto |
| --- | --- | --- |
| Node | >=22, ES modules | Proceso HTTP, crypto, filesystem y scripts |
| Express | ^5.2.1 | Factory, routers, middleware y errores |
| pg | ^8.23.0 | Pool, SQL parametrizado, transacciones y locks PostgreSQL |
| Zod | ^4.6.5 | Validación de entorno y requests; coerción/defaults |
| bcrypt | ^6.0.0 | Password hashes, códigos email y recovery codes |
| jsonwebtoken | ^9.0.3 | Access JWT HS256 y challenge 2FA separados por purpose |
| speakeasy | ^2.0.0 | Setup TOTP y verificación con ventana temporal |
| node:crypto | Runtime | Códigos aleatorios, UUID, AES-GCM y lectura legacy CBC |
| Helmet/CORS/compression | ^8.3.0/^2.8.6/^1.8.2 | Cabeceras, política Origin y compresión |
| express-rate-limit | ^8.7.0 | Límites globales y endpoints sensibles en memoria |
| Multer | ^2.4.0 | Upload en memoria, tamaño y campos; magic bytes después |
| Nodemailer | ^10.0.10 | SMTP o simulación/fallback del mailer |
| firebase-admin | ^14.4.0 | FCM con credenciales cargadas al primer uso |
| adm-zip | ^0.6.1 | Importación de archivos de geografía en scripts |
| Vitest / coverage-v8 | ^5.0.1 | Pruebas y umbrales de cobertura |
| Supertest | ^7.3.0 | HTTP integration sin abrir listener propio |
| ESLint | ^10.11.0 | Reglas de código |
| yaml | ^2.9.1 | Lectura del contrato OpenAPI en comprobador |
| nodemon / cross-env | ^3.1.14/^10.1.0 | Reinicio dev y NODE_ENV en scripts |

PostgreSQL usa UUID, constraints, índices, funciones SQL, JOIN LATERAL y advisory locks. No inferir versión de motor instalado a partir de la versión del driver. Jikan y RAWG son proveedores consultados por servicios HTTP, no repositorios locales ni SDKs Android. Ver [integraciones](integraciones.md) y [referencia de archivos/importaciones](referencia-codigo.md).
