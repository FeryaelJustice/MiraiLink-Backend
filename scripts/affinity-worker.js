import { parseEnv } from '../src/config/env.js';
import pool from '../src/models/db.js';
import { generateAffinities } from '../src/services/affinity-service.js';
import { drainAffinityOutbox } from '../src/services/affinity-outbox.js';
import { reconcileSubscriptions } from '../src/services/play-billing.js';
parseEnv();
try {
    const mode=process.argv[2];
    if(mode==='generate')await generateAffinities();
    else if(mode==='notify')await drainAffinityOutbox();
    else if(mode==='billing')await reconcileSubscriptions();
    else throw new Error('Expected generate, notify or billing');
}catch(error){console.error({code:error.code??'WORKER_FAILED'});process.exitCode=1;}
finally{await pool.end();}
