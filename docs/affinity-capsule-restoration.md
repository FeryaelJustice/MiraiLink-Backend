# Escenarios sobre usuarios existentes

No se crean ni se renombran cuentas. `seed-users.js` conserva las 13 definiciones originales del seed. Los escenarios incluyen todas las cuentas existentes verificadas, adultas y no eliminadas, ordenadas por ID. No seleccionan candidatos mediante el ranking de produccion.

| Comando | Resultado |
| --- | --- |
| npm run db:reset | Reset completo de esquema y catalogos, como antes |
| npm run db:seed | Usuarios originales del seed y sus datos |
| npm run db:reset-interactions | Limpia Capsule, preguntas, respuestas, acciones, matches, chats, mensajes, likes, dislikes, afinidades, bloqueos, reports y rewind; conserva cuentas originales y perfiles |
| npm run db:reset-capsules | Limpia sesiones Capsule con preguntas, respuestas, acciones, sus matches/chats y swipes Capsule; conserva catalogo y perfiles |
| npm run db:reinit-capsules | Reset Capsule, catalogo y escenario Capsule |
| npm run db:test-affinities | Tres recomendaciones, un like entrante y una invitacion entrante por cuenta |
| npm run db:test-likes | Un like normal entrante por cuenta, de otra persona |
| npm run db:test-capsules | Matches mutuos y sesiones Capsule para todas las cuentas, con otras personas |
| npm run db:test-all | Ejecuta los tres escenarios anteriores |
| npm run db:cleanup-test-users | Elimina exclusivamente las cuentas auxiliares del generador erroneo, identificadas por username, email y bio exactos |

Flujo para reconstruir todas las interacciones: `npm run db:reset-interactions`, despues `npm run db:test-all`. No hace falta borrar/recrear los usuarios. Ejecutar db:seed si aun faltan las cuentas originales. Los scripts de test requieren un entorno de desarrollo y al menos las 13 cuentas originales para distribuir todas las categorias sin repeticiones.

Reparto circular compartido: recomendaciones en +1, -1 y +2; like de Afinidades en +3; invitacion en +4; like normal en +5; Capsule en +6. Los sentidos inversos quedan reservados para el mismo tipo de relacion. Con 13 cuentas o mas las parejas de cada categoria son disjuntas. Asi ejecutar un seed no consume candidatos de otro. Tras aceptar intereses, responder o cambiar el conjunto de cuentas, usar reset-interactions y test-all para recuperar el escenario inicial completo.

Los test de Afinidades se marcan is_test explicitamente (migracion 019). Android online consume estas recomendaciones desde el backend; en desarrollo se omite su ranking de produccion, manteniendo controles de edad, autorizacion, suscripcion y privacidad. La generacion real mantiene sus filtros. El reparto no modifica fotos, ubicaciones ni intereses de los usuarios originales. No se generan avisos.

Capsule crea sesiones con match mutuo para probar preguntas desde los matches/chats, sin cambiar el modo Discovery global. Abrir una tarjeta en Discovery sigue sin iniciar una conversacion. El blur se aplica por la sesion Capsule de esa pareja, y los intereses classic conservan su presentacion classic.

La limpieza del generador erroneo tambien se incluye en reset-interactions y en los escenarios de test. No se eliminan usuarios por prefijo solamente. No hay codigo que cree nuevas cuentas mltest_.

Cliente relacionado: ../MiraiLink/docs/affinity-capsule-restoration.md.

Evidencia permanente: revision estatica y sintaxis. No se han ejecutado los scripts ni consultado/modificado PostgreSQL desde este trabajo. Sin tests, compilacion Android ni aceptacion en dispositivo. No se confirma la limpieza de cuentas existentes hasta ejecutar el comando en la base correspondiente.
