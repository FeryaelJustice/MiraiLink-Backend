// Fireabase Admin SDK
import firebaseAdmin from 'firebase-admin';
import serviceAccount from "../serviceAccountKey.json" with { type: "json" };

// Init firebase Admin SDK
firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
});

export const fcm = firebaseAdmin.messaging();