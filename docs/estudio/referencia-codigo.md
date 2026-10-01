# Referencia navegable de fuentes propias

Anexo obtenido por inspección estática. Las declaraciones y consumidores son ayudas de navegación, no un análisis completo de ejecución. Revisar el flujo en los documentos temáticos y en el código. Los enlaces de archivo evitan números de línea que quedarían obsoletos al editar comentarios.

[Volver a la guía maestra](../guia-maestra.md). Regeneración: `node scripts/documentacion-inventario.mjs backend`.

## scripts/check-openapi-routes.js

Fuente: [scripts/check-openapi-routes.js](../../scripts/check-openapi-routes.js).

Declaraciones: `openApiPath`, `collectExpressRoutes`, `validateContract`.

Dependencias importadas: `node:fs`, `node:path`, `node:url`, `yaml`.

Consumidores directos por importación o referencia al archivo: No detectados estáticamente; puede usarse por DI, manifest o reflexión.

## scripts/import-geography.js

Fuente: [scripts/import-geography.js](../../scripts/import-geography.js).

Declaraciones: `normalize`, `rows`, `fetchText`, `fetchZipEntry`, `withTransaction`, `importGeography`.

Dependencias importadas: `adm-zip`, `node:crypto`, `pg`, `node:fs`, `node:path`, `node:url`.

Consumidores directos por importación o referencia al archivo: No detectados estáticamente; puede usarse por DI, manifest o reflexión.

## scripts/migrate-db.js

Fuente: [scripts/migrate-db.js](../../scripts/migrate-db.js).

Declaraciones: Sin declaración detectada por el extractor; revisar la fuente.

Dependencias importadas: `node:fs`, `node:path`, `node:url`, `pg`, `../src/database/migrator.js`.

Consumidores directos por importación o referencia al archivo: No detectados estáticamente; puede usarse por DI, manifest o reflexión.

## scripts/reset-db.js

Fuente: [scripts/reset-db.js](../../scripts/reset-db.js).

Declaraciones: `resetDatabase`.

Dependencias importadas: `pg`, `node:fs`, `node:path`, `node:url`.

Consumidores directos por importación o referencia al archivo: No detectados estáticamente; puede usarse por DI, manifest o reflexión.

## scripts/reset-interactions.js

Fuente: [scripts/reset-interactions.js](../../scripts/reset-interactions.js).

Declaraciones: `resetInteractions`.

Dependencias importadas: `node:fs`, `node:path`, `node:url`, `pg`.

Consumidores directos por importación o referencia al archivo: No detectados estáticamente; puede usarse por DI, manifest o reflexión.

## scripts/seed.js

Fuente: [scripts/seed.js](../../scripts/seed.js).

Declaraciones: `runSeed`.

Dependencias importadas: `bcrypt`, `pg`, `node:fs`, `node:path`, `node:url`.

Consumidores directos por importación o referencia al archivo: No detectados estáticamente; puede usarse por DI, manifest o reflexión.

## scripts/sync-catalog.js

Fuente: [scripts/sync-catalog.js](../../scripts/sync-catalog.js).

Declaraciones: `run`.

Dependencias importadas: `node:fs`, `node:path`, `node:url`, `pg`, `../src/services/catalogSyncService.js`.

Consumidores directos por importación o referencia al archivo: No detectados estáticamente; puede usarse por DI, manifest o reflexión.

## src/app.js

Fuente: [src/app.js](../../src/app.js).

Declaraciones: `createCorsOptions`, `createApp`.

Dependencias importadas: `compression`, `cors`, `express`, `helmet`, `node:path`, `node:url`, `./errors/AppError.js`, `./middleware/error.middleware.js`, `./middleware/requestId.middleware.js`, `./middleware/rateLimit.middleware.js`, `./routes/app.routes.js`, `./routes/auth.routes.js`, `./routes/catalog.routes.js`, `./routes/chat.routes.js`, `./routes/feedback.routes.js`, `./routes/match.routes.js`, `./routes/report.routes.js`, `./routes/swipe.routes.js`, `./routes/explore.routes.js`, `./routes/user.routes.js`, `./routes/userphotos.routes.js`, `./routes/users.routes.js`, `./routes/subscription.routes.js`.

Consumidores directos por importación o referencia al archivo: [src/server.js](../../src/server.js).

## src/config/env.js

Fuente: [src/config/env.js](../../src/config/env.js).

Declaraciones: `commaSeparatedOrigins`, `parseEnv`.

Dependencias importadas: `zod`.

Consumidores directos por importación o referencia al archivo: [src/server.js](../../src/server.js).

## src/config/firebaseAdmin.js

Fuente: [src/config/firebaseAdmin.js](../../src/config/firebaseAdmin.js).

Declaraciones: `resolveServiceAccountPath`, `initializeMessaging`, `getFcm`, `resetFirebaseForTests`.

Dependencias importadas: `firebase-admin/app`, `firebase-admin/messaging`, `node:fs/promises`, `node:path`, `node:url`.

Consumidores directos por importación o referencia al archivo: [src/services/notificationService.js](../../src/services/notificationService.js).

## src/consts/photosConsts.js

Fuente: [src/consts/photosConsts.js](../../src/consts/photosConsts.js).

Declaraciones: Sin declaración detectada por el extractor; revisar la fuente.

Dependencias importadas: Ninguna detectada.

Consumidores directos por importación o referencia al archivo: [src/utils/photoStorage.js](../../src/utils/photoStorage.js).

## src/consts/subscriptionConsts.js

Fuente: [src/consts/subscriptionConsts.js](../../src/consts/subscriptionConsts.js).

Declaraciones: `SUBSCRIPTION_PRODUCTS`, `BASE_PLANS`, `FREE_DAILY_LIKES_LIMIT`, `SUBSCRIPTION_FEATURES`, `BASE_PLAN_INTERVALS`, `resolvePlanInterval`, `PLAY_STORE_URLS`.

Dependencias importadas: Ninguna detectada.

Consumidores directos por importación o referencia al archivo: [src/controllers/subscription.controller.js](../../src/controllers/subscription.controller.js), [src/controllers/swipe.controller.js](../../src/controllers/swipe.controller.js), [src/controllers/user.controller.js](../../src/controllers/user.controller.js), [src/services/explore.service.js](../../src/services/explore.service.js), [src/validation/subscription.schemas.js](../../src/validation/subscription.schemas.js).

## src/controllers/app.controller.js

Fuente: [src/controllers/app.controller.js](../../src/controllers/app.controller.js).

Declaraciones: `checkAndroidAppVersion`.

Dependencias importadas: `../models/db.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/app.routes.js](../../src/routes/app.routes.js).

## src/controllers/auth.controller.js

Fuente: [src/controllers/auth.controller.js](../../src/controllers/auth.controller.js).

Declaraciones: `withTransaction`, `register`, `login`, `logout`, `autoLogin`, `requestPasswordReset`, `confirmPasswordReset`, `checkIsVerified`, `requestVerificationCode`, `confirmVerificationCode`, `setup2FA`, `verify2FA`, `disable2FA`, `check2FAStatus`, `loginVerify2FALastStep`.

Dependencias importadas: `bcrypt`, `node:crypto`, `speakeasy`, `../models/db.js`, `../services/tokenService.js`, `../services/twoFactorService.js`, `../utils/cryptoUtils.js`, `../utils/mailer.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/auth.routes.js](../../src/routes/auth.routes.js).

## src/controllers/catalog.controller.js

Fuente: [src/controllers/catalog.controller.js](../../src/controllers/catalog.controller.js).

Declaraciones: `getAllAnimes`, `getAllGames`, `getCountries`, `getRegions`, `getCities`, `getProfileOptions`.

Dependencias importadas: `../models/db.js`, `../utils/catalogLocalization.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/catalog.routes.js](../../src/routes/catalog.routes.js).

## src/controllers/chat.controller.js

Fuente: [src/controllers/chat.controller.js](../../src/controllers/chat.controller.js).

Declaraciones: `withTransaction`, `getChatsFromUser`, `getMessages`, `createPrivateChat`, `createGroupChat`, `getChatMembers`, `markChatAsRead`, `sendMessage`, `getChatHistory`.

Dependencias importadas: `../models/db.js`, `../services/notificationService.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/chat.routes.js](../../src/routes/chat.routes.js).

## src/controllers/explore.controller.js

Fuente: [src/controllers/explore.controller.js](../../src/controllers/explore.controller.js).

Declaraciones: `getCategories`, `getCategoryFeed`, `getCategorySettings`, `updateCategorySettings`.

Dependencias importadas: `../utils/catalogLocalization.js`, `../services/explore.service.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/explore.routes.js](../../src/routes/explore.routes.js).

## src/controllers/feedback.controller.js

Fuente: [src/controllers/feedback.controller.js](../../src/controllers/feedback.controller.js).

Declaraciones: `sendFeedback`.

Dependencias importadas: `../models/db.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/feedback.routes.js](../../src/routes/feedback.routes.js).

## src/controllers/match.controller.js

Fuente: [src/controllers/match.controller.js](../../src/controllers/match.controller.js).

Declaraciones: `getMatches`, `getUnseenMatches`, `markMatchesSeen`.

Dependencias importadas: `../models/db.js`, `../dto/user.dto.js`, `../utils/catalogLocalization.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/match.routes.js](../../src/routes/match.routes.js).

## src/controllers/photo.controller.js

Fuente: [src/controllers/photo.controller.js](../../src/controllers/photo.controller.js).

Declaraciones: `uploadPhoto`, `getUserPhotos`, `deletePhoto`.

Dependencias importadas: `../models/db.js`, `../utils/photoStorage.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/userphotos.routes.js](../../src/routes/userphotos.routes.js).

## src/controllers/report.controller.js

Fuente: [src/controllers/report.controller.js](../../src/controllers/report.controller.js).

Declaraciones: `reportUser`.

Dependencias importadas: `../models/db.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/report.routes.js](../../src/routes/report.routes.js).

## src/controllers/subscription.controller.js

Fuente: [src/controllers/subscription.controller.js](../../src/controllers/subscription.controller.js).

Declaraciones: `getSubscriptionStatus`, `verifySubscription`, `cancelSubscriptionIntent`.

Dependencias importadas: `../models/db.js`, `../consts/subscriptionConsts.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/subscription.routes.js](../../src/routes/subscription.routes.js).

## src/controllers/swipe.controller.js

Fuente: [src/controllers/swipe.controller.js](../../src/controllers/swipe.controller.js).

Declaraciones: `targetExists`, `getFeed`, `likeUser`, `dislikeUser`, `getReceivedLikes`.

Dependencias importadas: `../models/db.js`, `../dto/user.dto.js`, `../errors/AppError.js`, `../utils/catalogLocalization.js`, `../utils/geoSearch.js`, `../utils/geographyLocalization.js`, `./user.controller.js`, `../services/explore.service.js`, `../consts/subscriptionConsts.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/swipe.routes.js](../../src/routes/swipe.routes.js).

## src/controllers/user.controller.js

Fuente: [src/controllers/user.controller.js](../../src/controllers/user.controller.js).

Declaraciones: `parseInterestIds`, `parseArrayOfIds`, `parsePrompts`, `localizedAttributeColumns`, `localizedAttributeJoins`, `profileExtras`, `getProfile`, `getProfileFromId`, `getProfileByUsername`, `getProfiles`, `deleteAccount`, `updateProfile`, `deleteUserPhoto`, `saveFCMToken`, `updateSearchSettings`, `locationPing`, `getLocationHistory`.

Dependencias importadas: `node:path`, `../models/db.js`, `../services/tokenService.js`, `../utils/catalogLocalization.js`, `../dto/user.dto.js`, `../utils/geographyLocalization.js`, `../utils/photoStorage.js`, `../consts/subscriptionConsts.js`.

Consumidores directos por importación o referencia al archivo: [src/controllers/swipe.controller.js](../../src/controllers/swipe.controller.js), [src/routes/user.routes.js](../../src/routes/user.routes.js), [src/routes/users.routes.js](../../src/routes/users.routes.js), [src/services/explore.service.js](../../src/services/explore.service.js).

## src/database/migrator.js

Fuente: [src/database/migrator.js](../../src/database/migrator.js).

Declaraciones: `runMigrations`.

Dependencias importadas: `node:fs`, `node:path`, `node:url`.

Consumidores directos por importación o referencia al archivo: [scripts/migrate-db.js](../../scripts/migrate-db.js), [src/server.js](../../src/server.js).

## src/dto/user.dto.js

Fuente: [src/dto/user.dto.js](../../src/dto/user.dto.js).

Declaraciones: `toPublicUser`, `toPublicUsers`, `PUBLIC_USER_SQL_COLUMNS`.

Dependencias importadas: Ninguna detectada.

Consumidores directos por importación o referencia al archivo: [src/controllers/match.controller.js](../../src/controllers/match.controller.js), [src/controllers/swipe.controller.js](../../src/controllers/swipe.controller.js), [src/controllers/user.controller.js](../../src/controllers/user.controller.js), [src/services/explore.service.js](../../src/services/explore.service.js).

## src/errors/AppError.js

Fuente: [src/errors/AppError.js](../../src/errors/AppError.js).

Declaraciones: `AppError`.

Dependencias importadas: Ninguna detectada.

Consumidores directos por importación o referencia al archivo: [src/app.js](../../src/app.js), [src/controllers/swipe.controller.js](../../src/controllers/swipe.controller.js), [src/middleware/error.middleware.js](../../src/middleware/error.middleware.js), [src/middleware/validate.middleware.js](../../src/middleware/validate.middleware.js), [src/services/explore.service.js](../../src/services/explore.service.js), [src/utils/imageValidation.js](../../src/utils/imageValidation.js).

## src/middleware/auth.middleware.js

Fuente: [src/middleware/auth.middleware.js](../../src/middleware/auth.middleware.js).

Declaraciones: `unauthorized`, `authenticateToken`, `optionalAuthenticateToken`.

Dependencias importadas: `jsonwebtoken`, `../models/db.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/auth.routes.js](../../src/routes/auth.routes.js), [src/routes/chat.routes.js](../../src/routes/chat.routes.js), [src/routes/explore.routes.js](../../src/routes/explore.routes.js), [src/routes/feedback.routes.js](../../src/routes/feedback.routes.js), [src/routes/match.routes.js](../../src/routes/match.routes.js), [src/routes/report.routes.js](../../src/routes/report.routes.js), [src/routes/subscription.routes.js](../../src/routes/subscription.routes.js), [src/routes/swipe.routes.js](../../src/routes/swipe.routes.js), [src/routes/user.routes.js](../../src/routes/user.routes.js), [src/routes/userphotos.routes.js](../../src/routes/userphotos.routes.js), [src/routes/users.routes.js](../../src/routes/users.routes.js).

## src/middleware/chatMember.middleware.js

Fuente: [src/middleware/chatMember.middleware.js](../../src/middleware/chatMember.middleware.js).

Declaraciones: `requireChatMember`.

Dependencias importadas: `../models/db.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/chat.routes.js](../../src/routes/chat.routes.js).

## src/middleware/error.middleware.js

Fuente: [src/middleware/error.middleware.js](../../src/middleware/error.middleware.js).

Declaraciones: `describeUploadError`, `errorHandler`.

Dependencias importadas: `multer`, `../errors/AppError.js`.

Consumidores directos por importación o referencia al archivo: [src/app.js](../../src/app.js).

## src/middleware/photoUpload.middleware.js

Fuente: [src/middleware/photoUpload.middleware.js](../../src/middleware/photoUpload.middleware.js).

Declaraciones: `fileFilter`, `profilePhotoUpload`, `singlePhotoUpload`, `validateUploadedImages`.

Dependencias importadas: `multer`, `../utils/imageValidation.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/user.routes.js](../../src/routes/user.routes.js), [src/routes/userphotos.routes.js](../../src/routes/userphotos.routes.js).

## src/middleware/rateLimit.middleware.js

Fuente: [src/middleware/rateLimit.middleware.js](../../src/middleware/rateLimit.middleware.js).

Declaraciones: `limiter`, `authLimiter`, `emailLimiter`, `writeLimiter`, `globalApiLimiter`.

Dependencias importadas: `express-rate-limit`.

Consumidores directos por importación o referencia al archivo: [src/app.js](../../src/app.js), [src/routes/auth.routes.js](../../src/routes/auth.routes.js), [src/routes/feedback.routes.js](../../src/routes/feedback.routes.js), [src/routes/report.routes.js](../../src/routes/report.routes.js).

## src/middleware/requestId.middleware.js

Fuente: [src/middleware/requestId.middleware.js](../../src/middleware/requestId.middleware.js).

Declaraciones: `requestId`.

Dependencias importadas: `node:crypto`.

Consumidores directos por importación o referencia al archivo: [src/app.js](../../src/app.js).

## src/middleware/validate.middleware.js

Fuente: [src/middleware/validate.middleware.js](../../src/middleware/validate.middleware.js).

Declaraciones: `replaceRequestSection`, `validate`.

Dependencias importadas: `../errors/AppError.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/auth.routes.js](../../src/routes/auth.routes.js), [src/routes/chat.routes.js](../../src/routes/chat.routes.js), [src/routes/explore.routes.js](../../src/routes/explore.routes.js), [src/routes/feedback.routes.js](../../src/routes/feedback.routes.js), [src/routes/match.routes.js](../../src/routes/match.routes.js), [src/routes/report.routes.js](../../src/routes/report.routes.js), [src/routes/subscription.routes.js](../../src/routes/subscription.routes.js), [src/routes/swipe.routes.js](../../src/routes/swipe.routes.js), [src/routes/user.routes.js](../../src/routes/user.routes.js), [src/routes/userphotos.routes.js](../../src/routes/userphotos.routes.js), [src/routes/users.routes.js](../../src/routes/users.routes.js).

## src/models/db.js

Fuente: [src/models/db.js](../../src/models/db.js).

Declaraciones: Sin declaración detectada por el extractor; revisar la fuente.

Dependencias importadas: `pg`.

Consumidores directos por importación o referencia al archivo: [src/controllers/app.controller.js](../../src/controllers/app.controller.js), [src/controllers/auth.controller.js](../../src/controllers/auth.controller.js), [src/controllers/catalog.controller.js](../../src/controllers/catalog.controller.js), [src/controllers/chat.controller.js](../../src/controllers/chat.controller.js), [src/controllers/feedback.controller.js](../../src/controllers/feedback.controller.js), [src/controllers/match.controller.js](../../src/controllers/match.controller.js), [src/controllers/photo.controller.js](../../src/controllers/photo.controller.js), [src/controllers/report.controller.js](../../src/controllers/report.controller.js), [src/controllers/subscription.controller.js](../../src/controllers/subscription.controller.js), [src/controllers/swipe.controller.js](../../src/controllers/swipe.controller.js), [src/controllers/user.controller.js](../../src/controllers/user.controller.js), [src/middleware/auth.middleware.js](../../src/middleware/auth.middleware.js), [src/middleware/chatMember.middleware.js](../../src/middleware/chatMember.middleware.js), [src/server.js](../../src/server.js), [src/services/catalogSyncService.js](../../src/services/catalogSyncService.js), [src/services/explore.service.js](../../src/services/explore.service.js), [src/services/notificationService.js](../../src/services/notificationService.js).

## src/routes/app.routes.js

Fuente: [src/routes/app.routes.js](../../src/routes/app.routes.js).

Declaraciones: Sin declaración detectada por el extractor; revisar la fuente.

Dependencias importadas: `express`, `../controllers/app.controller.js`.

Consumidores directos por importación o referencia al archivo: [scripts/check-openapi-routes.js](../../scripts/check-openapi-routes.js), [src/app.js](../../src/app.js).

## src/routes/auth.routes.js

Fuente: [src/routes/auth.routes.js](../../src/routes/auth.routes.js).

Declaraciones: Sin declaración detectada por el extractor; revisar la fuente.

Dependencias importadas: `express`, `../controllers/auth.controller.js`, `../middleware/auth.middleware.js`, `../middleware/rateLimit.middleware.js`, `../middleware/validate.middleware.js`, `../validation/auth.schemas.js`.

Consumidores directos por importación o referencia al archivo: [scripts/check-openapi-routes.js](../../scripts/check-openapi-routes.js), [src/app.js](../../src/app.js).

## src/routes/catalog.routes.js

Fuente: [src/routes/catalog.routes.js](../../src/routes/catalog.routes.js).

Declaraciones: Sin declaración detectada por el extractor; revisar la fuente.

Dependencias importadas: `express`, `../controllers/catalog.controller.js`.

Consumidores directos por importación o referencia al archivo: [scripts/check-openapi-routes.js](../../scripts/check-openapi-routes.js), [src/app.js](../../src/app.js).

## src/routes/chat.routes.js

Fuente: [src/routes/chat.routes.js](../../src/routes/chat.routes.js).

Declaraciones: Sin declaración detectada por el extractor; revisar la fuente.

Dependencias importadas: `express`, `../controllers/chat.controller.js`, `../middleware/auth.middleware.js`, `../middleware/chatMember.middleware.js`, `../middleware/validate.middleware.js`, `../validation/common.schemas.js`, `../validation/chat.schemas.js`.

Consumidores directos por importación o referencia al archivo: [scripts/check-openapi-routes.js](../../scripts/check-openapi-routes.js), [src/app.js](../../src/app.js).

## src/routes/explore.routes.js

Fuente: [src/routes/explore.routes.js](../../src/routes/explore.routes.js).

Declaraciones: Sin declaración detectada por el extractor; revisar la fuente.

Dependencias importadas: `express`, `../controllers/explore.controller.js`, `../middleware/auth.middleware.js`, `../middleware/validate.middleware.js`, `../validation/explore.schemas.js`.

Consumidores directos por importación o referencia al archivo: [scripts/check-openapi-routes.js](../../scripts/check-openapi-routes.js), [src/app.js](../../src/app.js).

## src/routes/feedback.routes.js

Fuente: [src/routes/feedback.routes.js](../../src/routes/feedback.routes.js).

Declaraciones: Sin declaración detectada por el extractor; revisar la fuente.

Dependencias importadas: `express`, `../controllers/feedback.controller.js`, `../middleware/auth.middleware.js`, `../middleware/rateLimit.middleware.js`, `../middleware/validate.middleware.js`, `../validation/social.schemas.js`.

Consumidores directos por importación o referencia al archivo: [scripts/check-openapi-routes.js](../../scripts/check-openapi-routes.js), [src/app.js](../../src/app.js).

## src/routes/match.routes.js

Fuente: [src/routes/match.routes.js](../../src/routes/match.routes.js).

Declaraciones: Sin declaración detectada por el extractor; revisar la fuente.

Dependencias importadas: `express`, `../controllers/match.controller.js`, `../middleware/auth.middleware.js`, `../middleware/validate.middleware.js`, `../validation/social.schemas.js`.

Consumidores directos por importación o referencia al archivo: [scripts/check-openapi-routes.js](../../scripts/check-openapi-routes.js), [src/app.js](../../src/app.js).

## src/routes/report.routes.js

Fuente: [src/routes/report.routes.js](../../src/routes/report.routes.js).

Declaraciones: Sin declaración detectada por el extractor; revisar la fuente.

Dependencias importadas: `express`, `../controllers/report.controller.js`, `../middleware/auth.middleware.js`, `../middleware/rateLimit.middleware.js`, `../middleware/validate.middleware.js`, `../validation/social.schemas.js`.

Consumidores directos por importación o referencia al archivo: [scripts/check-openapi-routes.js](../../scripts/check-openapi-routes.js), [src/app.js](../../src/app.js).

## src/routes/subscription.routes.js

Fuente: [src/routes/subscription.routes.js](../../src/routes/subscription.routes.js).

Declaraciones: Sin declaración detectada por el extractor; revisar la fuente.

Dependencias importadas: `express`, `../controllers/subscription.controller.js`, `../middleware/auth.middleware.js`, `../middleware/validate.middleware.js`, `../validation/subscription.schemas.js`.

Consumidores directos por importación o referencia al archivo: [scripts/check-openapi-routes.js](../../scripts/check-openapi-routes.js), [src/app.js](../../src/app.js).

## src/routes/swipe.routes.js

Fuente: [src/routes/swipe.routes.js](../../src/routes/swipe.routes.js).

Declaraciones: Sin declaración detectada por el extractor; revisar la fuente.

Dependencias importadas: `express`, `../controllers/swipe.controller.js`, `../middleware/auth.middleware.js`, `../middleware/validate.middleware.js`, `../validation/common.schemas.js`, `../validation/social.schemas.js`.

Consumidores directos por importación o referencia al archivo: [scripts/check-openapi-routes.js](../../scripts/check-openapi-routes.js), [src/app.js](../../src/app.js).

## src/routes/user.routes.js

Fuente: [src/routes/user.routes.js](../../src/routes/user.routes.js).

Declaraciones: Sin declaración detectada por el extractor; revisar la fuente.

Dependencias importadas: `express`, `zod`, `../controllers/user.controller.js`, `../middleware/auth.middleware.js`, `../middleware/photoUpload.middleware.js`, `../middleware/validate.middleware.js`, `../validation/common.schemas.js`, `../validation/user.schemas.js`.

Consumidores directos por importación o referencia al archivo: [scripts/check-openapi-routes.js](../../scripts/check-openapi-routes.js), [src/app.js](../../src/app.js).

## src/routes/userphotos.routes.js

Fuente: [src/routes/userphotos.routes.js](../../src/routes/userphotos.routes.js).

Declaraciones: Sin declaración detectada por el extractor; revisar la fuente.

Dependencias importadas: `express`, `../controllers/photo.controller.js`, `../middleware/auth.middleware.js`, `../middleware/photoUpload.middleware.js`, `../middleware/validate.middleware.js`, `../validation/user.schemas.js`.

Consumidores directos por importación o referencia al archivo: [scripts/check-openapi-routes.js](../../scripts/check-openapi-routes.js), [src/app.js](../../src/app.js).

## src/routes/users.routes.js

Fuente: [src/routes/users.routes.js](../../src/routes/users.routes.js).

Declaraciones: Sin declaración detectada por el extractor; revisar la fuente.

Dependencias importadas: `express`, `../controllers/user.controller.js`, `../middleware/auth.middleware.js`, `../middleware/validate.middleware.js`, `../validation/common.schemas.js`.

Consumidores directos por importación o referencia al archivo: [scripts/check-openapi-routes.js](../../scripts/check-openapi-routes.js), [src/app.js](../../src/app.js).

## src/server.js

Fuente: [src/server.js](../../src/server.js).

Declaraciones: `shutdown`.

Dependencias importadas: `./app.js`, `./config/env.js`, `./database/migrator.js`, `./models/db.js`, `./services/catalogSyncService.js`.

Consumidores directos por importación o referencia al archivo: No detectados estáticamente; puede usarse por DI, manifest o reflexión.

## src/services/catalogSyncService.js

Fuente: [src/services/catalogSyncService.js](../../src/services/catalogSyncService.js).

Declaraciones: `syncCatalog`.

Dependencias importadas: `../models/db.js`, `./rawgService.js`, `./jikanService.js`.

Consumidores directos por importación o referencia al archivo: [scripts/sync-catalog.js](../../scripts/sync-catalog.js), [src/server.js](../../src/server.js).

## src/services/explore.service.js

Fuente: [src/services/explore.service.js](../../src/services/explore.service.js).

Declaraciones: `clearCountCache`, `invalidateUserCountCache`, `getCachedCount`, `setCachedCount`, `buildCategoryFilterSql`, `getExploreSectionsWithCategories`, `getCategoryFeedUsers`, `getCategorySettings`, `updateCategorySettings`.

Dependencias importadas: `../models/db.js`, `../dto/user.dto.js`, `../errors/AppError.js`, `../utils/geoSearch.js`, `../utils/geographyLocalization.js`, `../utils/catalogLocalization.js`, `../controllers/user.controller.js`, `../consts/subscriptionConsts.js`.

Consumidores directos por importación o referencia al archivo: [src/controllers/explore.controller.js](../../src/controllers/explore.controller.js), [src/controllers/swipe.controller.js](../../src/controllers/swipe.controller.js).

## src/services/jikanService.js

Fuente: [src/services/jikanService.js](../../src/services/jikanService.js).

Declaraciones: `fetchTopAnimes`.

Dependencias importadas: Ninguna detectada.

Consumidores directos por importación o referencia al archivo: [src/services/catalogSyncService.js](../../src/services/catalogSyncService.js).

## src/services/notificationService.js

Fuente: [src/services/notificationService.js](../../src/services/notificationService.js).

Declaraciones: `getUserFcmToken`, `sendPushToToken`, `sendChatMessageNotification`.

Dependencias importadas: `../config/firebaseAdmin.js`, `../models/db.js`.

Consumidores directos por importación o referencia al archivo: [src/controllers/chat.controller.js](../../src/controllers/chat.controller.js).

## src/services/rawgService.js

Fuente: [src/services/rawgService.js](../../src/services/rawgService.js).

Declaraciones: `fetchRawgGames`.

Dependencias importadas: Ninguna detectada.

Consumidores directos por importación o referencia al archivo: [src/services/catalogSyncService.js](../../src/services/catalogSyncService.js).

## src/services/tokenService.js

Fuente: [src/services/tokenService.js](../../src/services/tokenService.js).

Declaraciones: `secret`, `createAccessToken`, `createTwoFactorChallenge`, `verifyTwoFactorChallenge`, `decodeTokenExpiry`.

Dependencias importadas: `jsonwebtoken`.

Consumidores directos por importación o referencia al archivo: [src/controllers/auth.controller.js](../../src/controllers/auth.controller.js), [src/controllers/user.controller.js](../../src/controllers/user.controller.js).

## src/services/twoFactorService.js

Fuente: [src/services/twoFactorService.js](../../src/services/twoFactorService.js).

Declaraciones: `verifyTotp`, `hashRecoveryCodes`, `useRecoveryCode`.

Dependencias importadas: `bcrypt`, `speakeasy`, `../utils/cryptoUtils.js`.

Consumidores directos por importación o referencia al archivo: [src/controllers/auth.controller.js](../../src/controllers/auth.controller.js).

## src/utils/catalogLocalization.js

Fuente: [src/utils/catalogLocalization.js](../../src/utils/catalogLocalization.js).

Declaraciones: `resolveCatalogLanguage`, `resolvePublicMediaUrl`, `localizedCatalogSql`, `localizedInterestSql`, `toLocalizedCatalogItem`.

Dependencias importadas: Ninguna detectada.

Consumidores directos por importación o referencia al archivo: [src/controllers/catalog.controller.js](../../src/controllers/catalog.controller.js), [src/controllers/explore.controller.js](../../src/controllers/explore.controller.js), [src/controllers/match.controller.js](../../src/controllers/match.controller.js), [src/controllers/swipe.controller.js](../../src/controllers/swipe.controller.js), [src/controllers/user.controller.js](../../src/controllers/user.controller.js), [src/services/explore.service.js](../../src/services/explore.service.js).

## src/utils/cryptoUtils.js

Fuente: [src/utils/cryptoUtils.js](../../src/utils/cryptoUtils.js).

Declaraciones: `keyBuffer`, `encrypt`, `decryptCurrent`, `decryptLegacy`, `decrypt`, `isLegacyEncrypted`.

Dependencias importadas: `node:crypto`.

Consumidores directos por importación o referencia al archivo: [src/controllers/auth.controller.js](../../src/controllers/auth.controller.js), [src/services/twoFactorService.js](../../src/services/twoFactorService.js).

## src/utils/geoSearch.js

Fuente: [src/utils/geoSearch.js](../../src/utils/geoSearch.js).

Declaraciones: `ACTIVE_LOCATION_MAX_AGE_MS`, `calculateDistanceKm`, `isActiveLocationFresh`, `resolveUserCoordinates`, `candidateCoordinateSql`.

Dependencias importadas: Ninguna detectada.

Consumidores directos por importación o referencia al archivo: [src/controllers/swipe.controller.js](../../src/controllers/swipe.controller.js), [src/services/explore.service.js](../../src/services/explore.service.js).

## src/utils/geographyLocalization.js

Fuente: [src/utils/geographyLocalization.js](../../src/utils/geographyLocalization.js).

Declaraciones: `localizedResidenceJoins`, `localizedResidenceColumns`.

Dependencias importadas: Ninguna detectada.

Consumidores directos por importación o referencia al archivo: [src/controllers/swipe.controller.js](../../src/controllers/swipe.controller.js), [src/controllers/user.controller.js](../../src/controllers/user.controller.js), [src/services/explore.service.js](../../src/services/explore.service.js).

## src/utils/imageValidation.js

Fuente: [src/utils/imageValidation.js](../../src/utils/imageValidation.js).

Declaraciones: `detectImageType`, `validateImage`.

Dependencias importadas: `../errors/AppError.js`.

Consumidores directos por importación o referencia al archivo: [src/middleware/photoUpload.middleware.js](../../src/middleware/photoUpload.middleware.js).

## src/utils/mailer.js

Fuente: [src/utils/mailer.js](../../src/utils/mailer.js).

Declaraciones: `getTransporter`, `renderEmailShell`, `printSimulatorLog`, `sendGenericEmail`, `sendVerificationEmail`, `sendPasswordResetEmail`.

Dependencias importadas: `nodemailer`.

Consumidores directos por importación o referencia al archivo: [src/controllers/auth.controller.js](../../src/controllers/auth.controller.js).

## src/utils/photoStorage.js

Fuente: [src/utils/photoStorage.js](../../src/utils/photoStorage.js).

Declaraciones: `profileUploadRoot`, `stagePhoto`, `finalizePhoto`, `removePhotoFile`, `cleanupStagedPhoto`.

Dependencias importadas: `node:fs/promises`, `node:crypto`, `node:path`, `../consts/photosConsts.js`.

Consumidores directos por importación o referencia al archivo: [src/controllers/photo.controller.js](../../src/controllers/photo.controller.js), [src/controllers/user.controller.js](../../src/controllers/user.controller.js).

## src/validation/auth.schemas.js

Fuente: [src/validation/auth.schemas.js](../../src/validation/auth.schemas.js).

Declaraciones: `isSafeSqlInput`, `isNotTrivialPassword`, `isAtLeast16YearsOld`, `registerSchema`, `loginSchema`, `emailSchema`, `passwordResetSchema`, `verificationRequestSchema`, `verificationConfirmSchema`, `totpSchema`, `twoFactorCodeSchema`, `twoFactorLoginSchema`.

Dependencias importadas: `zod`.

Consumidores directos por importación o referencia al archivo: [src/routes/auth.routes.js](../../src/routes/auth.routes.js).

## src/validation/chat.schemas.js

Fuente: [src/validation/chat.schemas.js](../../src/validation/chat.schemas.js).

Declaraciones: `messagesQuerySchema`, `privateChatSchema`, `groupChatSchema`, `sendMessageSchema`.

Dependencias importadas: `zod`, `./common.schemas.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/chat.routes.js](../../src/routes/chat.routes.js).

## src/validation/common.schemas.js

Fuente: [src/validation/common.schemas.js](../../src/validation/common.schemas.js).

Declaraciones: `uuid`, `optionalUuid`, `shortText`, `pagination`, `feedQuery`, `chatIdParams`, `userIdParams`.

Dependencias importadas: `zod`.

Consumidores directos por importación o referencia al archivo: [src/routes/chat.routes.js](../../src/routes/chat.routes.js), [src/routes/swipe.routes.js](../../src/routes/swipe.routes.js), [src/routes/user.routes.js](../../src/routes/user.routes.js), [src/routes/users.routes.js](../../src/routes/users.routes.js), [src/validation/chat.schemas.js](../../src/validation/chat.schemas.js), [src/validation/explore.schemas.js](../../src/validation/explore.schemas.js), [src/validation/social.schemas.js](../../src/validation/social.schemas.js), [src/validation/user.schemas.js](../../src/validation/user.schemas.js).

## src/validation/explore.schemas.js

Fuente: [src/validation/explore.schemas.js](../../src/validation/explore.schemas.js).

Declaraciones: `categoryParamsSchema`, `updateCategorySettingsSchema`, `categoryFeedQuery`.

Dependencias importadas: `zod`, `./common.schemas.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/explore.routes.js](../../src/routes/explore.routes.js).

## src/validation/social.schemas.js

Fuente: [src/validation/social.schemas.js](../../src/validation/social.schemas.js).

Declaraciones: `targetUserSchema`, `matchIdsSchema`, `reportSchema`, `feedbackSchema`.

Dependencias importadas: `zod`, `./common.schemas.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/feedback.routes.js](../../src/routes/feedback.routes.js), [src/routes/match.routes.js](../../src/routes/match.routes.js), [src/routes/report.routes.js](../../src/routes/report.routes.js), [src/routes/swipe.routes.js](../../src/routes/swipe.routes.js).

## src/validation/subscription.schemas.js

Fuente: [src/validation/subscription.schemas.js](../../src/validation/subscription.schemas.js).

Declaraciones: `verifySubscriptionSchema`, `cancelSubscriptionIntentSchema`.

Dependencias importadas: `zod`, `../consts/subscriptionConsts.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/subscription.routes.js](../../src/routes/subscription.routes.js).

## src/validation/user.schemas.js

Fuente: [src/validation/user.schemas.js](../../src/validation/user.schemas.js).

Declaraciones: `profileByIdSchema`, `fcmSchema`, `photoPositionParams`, `photoIdParams`, `photoQuerySchema`, `profileByUsernameParams`.

Dependencias importadas: `zod`, `./common.schemas.js`.

Consumidores directos por importación o referencia al archivo: [src/routes/user.routes.js](../../src/routes/user.routes.js), [src/routes/userphotos.routes.js](../../src/routes/userphotos.routes.js).
