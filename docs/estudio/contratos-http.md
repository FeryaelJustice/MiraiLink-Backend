# Contratos HTTP vigentes

[Guía maestra](../guia-maestra.md) | [OpenAPI](../openapi.yaml) | [Referencia funcional](funcionalidades.md).

Inventario del contrato versionado, contrastado con routers por npm run check:routes el 2026-10-01. El comprobador valida método/path, no demuestra por sí solo exactitud de todos los schemas o efectos.

| Método y ruta | Operación | Entrada | Respuestas declaradas |
| --- | --- | --- | --- |
| GET /api/app/version/android | getAndroidVersionPolicy | Ver contrato/guarda | 200, 404 |
| POST /api/auth/register | register | body: #/components/requestBodies/Register | 201, 400, 409, 429 |
| POST /api/auth/login | login | body: #/components/requestBodies/Login | 200, 400, 401, 429 |
| POST /api/auth/autologin | autoLogin | Ver contrato/guarda | 200, 401, 403 |
| POST /api/auth/logout | logout | Ver contrato/guarda | 200, 401 |
| POST /api/auth/password/request-reset | requestPasswordReset | body: #/components/requestBodies/Email | 200, 400, 429 |
| POST /api/auth/password/confirm-reset | confirmPasswordReset | body: #/components/requestBodies/PasswordReset | 200, 400, 429 |
| POST /api/auth/verification/request | requestVerification | body: #/components/requestBodies/VerificationType | 200, 400, 401, 429 |
| POST /api/auth/verification/confirm | confirmVerification | body: #/components/requestBodies/VerificationCode | 200, 400, 401 |
| GET /api/auth/verification/check | checkVerification | Ver contrato/guarda | 200, 401 |
| POST /api/auth/2fa/setup | setupTwoFactor | Ver contrato/guarda | 200, 401, 403 |
| POST /api/auth/2fa/verify | verifyTwoFactorSetup | body: #/components/requestBodies/Totp | 200, 400, 401 |
| POST /api/auth/2fa/disable | disableTwoFactor | body: #/components/requestBodies/TwoFactorCode | 200, 400, 401 |
| POST /api/auth/2fa/status | getTwoFactorStatus | Ver contrato/guarda | 200, 401 |
| POST /api/auth/2fa/loginVerifyLastStep | completeTwoFactorLogin | body: #/components/requestBodies/TwoFactorLogin | 200, 400, 401, 429 |
| GET /api/user | getOwnProfile | Ver contrato/guarda | 200, 401, 404 |
| PUT /api/user | updateOwnProfile | body: #/components/requestBodies/ProfileUpdate | 200, 400, 401, 415 |
| DELETE /api/user | deleteOwnAccount | Ver contrato/guarda | 200, 401, 404 |
| POST /api/user/byId | getPublicProfileById | body: #/components/requestBodies/UserId | 200, 400, 401, 404 |
| GET /api/user/by-username/{username} | getPublicProfileByUsername | path: username | 200, 401, 404 |
| POST /api/user/fcm | saveFcmToken | body: #/components/requestBodies/Fcm | 200, 400, 401 |
| GET /api/user/location/history | getUserLocationHistory | Ver contrato/guarda | 200, 401 |
| POST /api/user/location/ping | pingUserLocation | body: application/json | 200, 400, 401 |
| PUT /api/user/settings/search | updateSearchSettings | body: application/json | 200, 400, 401 |
| DELETE /api/user/photo/{position} | deletePhotoByPosition | #/components/parameters/PhotoPosition | 200, 400, 401, 404 |
| GET /api/user/photos | getUserPhotos | query: userId | 200, 400, 401 |
| POST /api/user/photos | uploadUserPhoto | body: #/components/requestBodies/SinglePhoto | 201, 400, 401, 415 |
| DELETE /api/user/photos/{photoId} | deletePhotoById | #/components/parameters/PhotoId | 200, 400, 401, 404 |
| GET /api/users | listPublicProfiles | #/components/parameters/Limit; #/components/parameters/Offset | 200, 400, 401 |
| GET /api/swipe/feed | getDiscoveryFeed | #/components/parameters/Limit; #/components/parameters/Offset; query: scope; query: radius_km; query: target_country; query: match_live_location | 200, 400, 401, 422 |
| GET /api/swipe/likes-received | getReceivedLikes | #/components/parameters/Limit; #/components/parameters/Offset | 200, 401 |
| POST /api/swipe/like | likeUser | body: #/components/requestBodies/TargetUser | 200, 400, 404 |
| POST /api/swipe/dislike | dislikeUser | body: #/components/requestBodies/TargetUser | 200, 400, 404 |
| GET /api/explore/categories | getExploreCategories | Ver contrato/guarda | 200, 401 |
| GET /api/explore/categories/{categoryId}/feed | getCategoryFeed | path: categoryId; #/components/parameters/Limit; #/components/parameters/Offset; query: radius_km | 200, 401, 404 |
| GET /api/explore/categories/{categoryId}/settings | getCategorySettings | path: categoryId | 200, 401, 404 |
| PUT /api/explore/categories/{categoryId}/settings | updateCategorySettings | path: categoryId; body: application/json | 200, 400, 401, 404 |
| GET /api/match | getMatches | Ver contrato/guarda | 200, 401 |
| GET /api/match/unseen | getUnseenMatches | Ver contrato/guarda | 200, 401 |
| POST /api/match/mark-seen | markMatchesSeen | body: #/components/requestBodies/MatchIds | 200, 400 |
| GET /api/chats | getChats | Ver contrato/guarda | 200, 401 |
| GET /api/chats/{chatId}/messages | getChatMessages | #/components/parameters/ChatId; query: limit; query: before | 200, 400, 404 |
| GET /api/chats/{chatId}/members | getChatMembers | #/components/parameters/ChatId | 200, 404 |
| PATCH /api/chats/{chatId}/read | markChatRead | #/components/parameters/ChatId | 200, 404 |
| POST /api/chats/private | createPrivateChat | body: #/components/requestBodies/PrivateChat | 201, 400, 404 |
| POST /api/chats/group | createGroupChat | body: #/components/requestBodies/GroupChat | 201, 400 |
| POST /api/chats/send | sendChatMessage | body: #/components/requestBodies/ChatMessage | 201, 400 |
| GET /api/chats/history/{userId} | getPrivateChatHistory | #/components/parameters/UserId | 200, 400 |
| GET /api/catalog/animes | listAnimes | header: Accept-Language | 200 |
| GET /api/catalog/games | listGames | header: Accept-Language | 200 |
| GET /api/catalog/geography/countries | getGeographyCountries | Ver contrato/guarda | 200 |
| GET /api/catalog/geography/countries/{countryId}/regions | getGeographyRegions | path: countryId | 200 |
| GET /api/catalog/geography/regions/{regionId}/cities | getGeographyCities | path: regionId; query: query | 200 |
| GET /api/catalog/profile-options | getProfileOptions | header: Accept-Language | 200 |
| POST /api/report | reportUser | body: #/components/requestBodies/Report | 200, 201, 400, 429 |
| POST /api/feedback | submitFeedback | body: #/components/requestBodies/Feedback | 200, 201, 400, 429 |
| GET /api/subscription/status | getSubscriptionStatus | Ver contrato/guarda | 200, 401 |
| POST /api/subscription/verify | verifySubscription | body: application/json | 200, 400, 401 |
| POST /api/subscription/cancel-intent | cancelSubscriptionIntent | Ver contrato/guarda | 200, 401 |

Operaciones: 59. Para payloads completos y tipos, abrir OpenAPI y sus schemas. Para autorización y efectos, abrir router, controller y flujo.
