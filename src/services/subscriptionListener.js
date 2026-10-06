import { sendSubscriptionUpdatedNotification } from './notificationService.js';

let listenerClient = null;
let reconnectTimeout = null;
let isStopping = false;

function releaseListenerClient(client) {
    try {
        client.release(true);
    } catch (err) {
        console.warn('[SubscriptionListener] Failed to release listener client:', err?.message);
    }
}

/**
 * Starts a persistent PostgreSQL LISTEN connection on the 'subscription_changed' channel.
 * Whenever an INSERT/UPDATE/DELETE occurs on user_subscriptions (even via raw SQL),
 * a silent FCM push is dispatched to the user's active device to update the client state reactively.
 */
export async function startSubscriptionListener(pool) {
    if (!pool || typeof pool.connect !== 'function') return;

    isStopping = false;

    async function connectAndListen() {
        if (isStopping) return;

        try {
            const client = await pool.connect();
            if (isStopping) {
                releaseListenerClient(client);
                return;
            }
            listenerClient = client;
            console.log('[SubscriptionListener] Connected and listening to channel "subscription_changed"');

            listenerClient.on('notification', async msg => {
                if (msg.channel === 'subscription_changed' && msg.payload) {
                    const userId = msg.payload.trim();
                    console.log(`[SubscriptionListener] Subscription change detected for user ${userId}`);
                    try {
                        await sendSubscriptionUpdatedNotification(userId);
                    } catch (err) {
                        console.error('[SubscriptionListener] Failed to dispatch push notification:', err?.message);
                    }
                }
            });

            listenerClient.on('error', err => {
                console.error('[SubscriptionListener] Postgres listener client error:', err?.message);
                cleanupAndReconnect();
            });

            listenerClient.on('end', () => {
                console.warn('[SubscriptionListener] Postgres listener connection closed');
                cleanupAndReconnect();
            });

            await listenerClient.query('LISTEN subscription_changed');
        } catch (err) {
            if (isStopping) return;
            console.error('[SubscriptionListener] Failed to establish listener connection:', err?.message);
            cleanupAndReconnect();
        }
    }

    function cleanupAndReconnect() {
        if (listenerClient) {
            releaseListenerClient(listenerClient);
            listenerClient = null;
        }
        if (!isStopping && !reconnectTimeout) {
            reconnectTimeout = setTimeout(() => {
                reconnectTimeout = null;
                connectAndListen();
            }, 5000);
            reconnectTimeout.unref?.();
        }
    }

    await connectAndListen();
}

export function stopSubscriptionListener() {
    isStopping = true;
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    if (listenerClient) {
        releaseListenerClient(listenerClient);
        listenerClient = null;
    }
}
