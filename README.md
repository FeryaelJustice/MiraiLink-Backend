# MiraiLink-Backend

MiraiLink Backend

## Para las variables de 2fa en el env hay que hacer

### Clave (32 bytes)

```node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"```

### IV (16 bytes)

```node -e "console.log(require('crypto').randomBytes(16).toString('hex'))"```
