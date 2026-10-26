import { verifyEmailTransport } from '../src/utils/mailer.js';
const result = await verifyEmailTransport();
console.log(JSON.stringify(result));
if (!result.success) process.exitCode = 1;
