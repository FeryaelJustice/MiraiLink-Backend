# Registro, login, verificación, reset y 2FA

[Guía maestra](../../guia-maestra.md) | [Mapa de funcionalidades](../funcionalidades.md)

## Responsabilidad y recorrido

Auth router aplica limiters y Zod; register guarda usuario/hash y verificación en transacción y solicita correo dentro del trabajo. Login consulta hash y estado; 2FA exige challenge firmado y código. Logout guarda blacklist; verificación emite nuevo access token si actualiza usuario.

## Alternativas y efectos

Duplicado retorna ACCOUNT_EXISTS, credencial inválida 401, código vencido 400, challenge inválido 401. Solicitar reset/verification responde neutralmente. Confirmar reset cambia password y elimina solicitudes, sin invalidar automáticamente todos los access JWT anteriores. Mailer puede simular y no detener el flujo.

Revisar optional auth y fallback sin userId: no tienen las mismas garantías que authenticated resource routes. Consumo de recovery usa transacción y lock; TOTP no se registra como recovery consumido.

## Fuentes para estudiar

- [auth.routes.js](../../../src/routes/auth.routes.js)
- [auth.controller.js](../../../src/controllers/auth.controller.js)
- [tokenService.js](../../../src/services/tokenService.js)
- [twoFactorService.js](../../../src/services/twoFactorService.js)

Revisión: 2026-10-01, por inspección del código. Consultar [verificación](../desarrollo-y-verificacion.md) para resultados ejecutados.
