// ============================================
// OFFLINE-FIRST SUPABASE SYNCHRONIZATION
// ============================================

class OfflineSyncManager {
    constructor() {
        this.queueKey = 'emdSyncQueue';
        this.trackedKeys = new Set([
            'emdInventory',
            'emdOrders',
            'emdCustomers',
            'emdReports',
            'emdActivityLog',
            'emdActivities',
            'emdLoginEvents',
            'emdDisabledProducts',
            'emdAfogaRestockAccess'
        ]);
        this.isSyncing = false;
        this.originalSetItem = localStorage.setItem.bind(localStorage);
    }

    init() {
        this.patchLocalStorage();
        window.addEventListener('online', () => this.flush());
        window.addEventListener('offline', () => this.setStatus('Offline - changes will sync automatically'));
        window.addEventListener('emd:supabase-ready', () => this.flush());
        if (navigator.onLine) this.flush();
    }

    patchLocalStorage() {
        const manager = this;
        localStorage.setItem = function(key, value) {
            manager.originalSetItem(key, value);
            if (manager.trackedKeys.has(key)) manager.enqueue(key);
        };
    }

    enqueue(key) {
        try {
            const queue = JSON.parse(localStorage.getItem(this.queueKey) || '[]');
            if (!queue.includes(key)) queue.push(key);
            this.originalSetItem(this.queueKey, JSON.stringify(queue));
            if (navigator.onLine) this.flush();
        } catch (error) {
            console.warn('Could not queue offline change:', error.message);
        }
    }

    queueLogin(identifier) {
        try {
            const events = JSON.parse(localStorage.getItem('emdLoginEvents') || '[]');
            events.push({
                identifier,
                loginMethod: 'offline',
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString()
            });
            this.originalSetItem('emdLoginEvents', JSON.stringify(events));
            this.enqueue('emdLoginEvents');
        } catch (error) {
            console.warn('Could not queue offline login:', error.message);
        }
    }

    async flush() {
        if (this.isSyncing || !navigator.onLine || !window.supabaseManager?.isInitialized) return;
        this.isSyncing = true;
        this.setStatus('Syncing changes...');

        try {
            const client = window.supabaseManager.getClient();
            const { data: authData } = await client.auth.getUser();
            if (!authData?.user) {
                this.setStatus('Offline changes queued until you sign in online');
                return;
            }

            const queue = JSON.parse(localStorage.getItem(this.queueKey) || '[]');
            if (queue.length === 0) {
                this.setStatus('Online - all changes synced');
                return;
            }

            const completed = [];
            for (const key of queue) {
                try {
                    await this.syncKey(key, authData.user);
                    completed.push(key);
                } catch (error) {
                    console.warn(`Sync failed for ${key}:`, error.message);
                }
            }

            const remaining = queue.filter(key => !completed.includes(key));
            this.originalSetItem(this.queueKey, JSON.stringify(remaining));
            this.setStatus(remaining.length ? 'Online - some changes remain queued' : 'Online - all changes synced');
        } finally {
            this.isSyncing = false;
        }
    }

    async syncKey(key, authUser) {
        const client = window.supabaseManager.getClient();
        const records = this.readRecords(key);
        if (!records) return;

        if (key === 'emdCustomers') {
            const rows = records.map(record => ({
                name: record.name,
                phone: record.phone,
                added_by: authUser.id,
                created_at: record.dateAdded || undefined
            }));
            if (rows.length) this.requireSuccess(await client.from('customers').upsert(rows, { onConflict: 'phone' }));
            return;
        }

        if (key === 'emdInventory' || key === 'emdDisabledProducts') {
            const inventory = key === 'emdInventory' ? records : JSON.parse(localStorage.getItem('emdInventory') || '[]');
            const disabled = key === 'emdDisabledProducts' ? records : JSON.parse(localStorage.getItem('emdDisabledProducts') || '[]');
            const { data: profile } = await client.from('profiles').select('role').eq('id', authUser.id).single();
            if (profile?.role === 'main') {
                const rows = inventory.map(product => ({
                    name: product.name,
                    price_ghs: product.price,
                    stock: product.stock,
                    is_disabled: disabled.includes(product.name)
                }));
                if (rows.length) this.requireSuccess(await client.from('products').upsert(rows, { onConflict: 'name' }));
            }
            return;
        }

        if (key === 'emdOrders') {
            for (const order of records) await this.syncOrder(client, order, authUser.id);
            return;
        }

        if (key === 'emdReports') {
            const rows = records.map(report => ({
                report_number: report.id,
                sent_by: authUser.id,
                total_orders: report.totalOrders || 0,
                total_revenue_ghs: report.totalRevenue || 0,
                created_at: report.timestamp || undefined
            }));
            if (rows.length) this.requireSuccess(await client.from('reports').upsert(rows, { onConflict: 'report_number' }));
            return;
        }

        if (key === 'emdActivityLog') {
            const rows = records.map(entry => ({
                legacy_id: entry.id,
                user_id: authUser.id,
                username: entry.user || authUser.email,
                action: entry.action,
                details: entry.details,
                created_at: entry.timestamp || undefined
            }));
            if (rows.length) this.requireSuccess(await client.from('activity_logs').upsert(rows, { onConflict: 'legacy_id' }));
            return;
        }

        if (key === 'emdLoginEvents') {
            const rows = records.map(event => ({
                user_id: authUser.id,
                identifier: event.identifier,
                login_method: event.loginMethod || 'offline',
                user_agent: event.userAgent || null,
                created_at: event.timestamp || undefined
            }));
            if (rows.length) this.requireSuccess(await client.from('login_events').insert(rows));
            return;
        }

        if (key === 'emdActivities') {
            const rows = records.map(activity => ({
                legacy_id: activity.id,
                activity_type: activity.type,
                location: activity.location,
                outcome: activity.outcome,
                activity_date: activity.date,
                frequency: activity.frequency,
                icon: activity.icon,
                created_by: authUser.id,
                created_at: activity.createdAt || undefined
            }));
            if (rows.length) this.requireSuccess(await client.from('activities').upsert(rows, { onConflict: 'legacy_id' }));
        }
    }

    async syncOrder(client, order, authUserId) {
        const { data: customer } = await client.from('customers').select('id').eq('name', order.customer).maybeSingle();
        const { data: savedOrder, error } = await client.from('orders').upsert({
            order_number: order.id,
            order_date: order.date,
            customer_id: customer?.id || null,
            customer_name: order.customer,
            destination: order.destination,
            action_type: order.actionType || 'repurchase',
            registration_package_name: order.registrationPackageName || null,
            registration_fee_ghs: order.registrationFee || 0,
            subtotal_ghs: order.subtotal || 0,
            total_ghs: order.total || 0,
            status: 'completed',
            created_by: authUserId,
            created_at: order.timestamp || undefined
        }, { onConflict: 'order_number' }).select('id').single();
        this.requireSuccess({ data: savedOrder, error });

        const { data: existingItems } = await client.from('order_items').select('id').eq('order_id', savedOrder.id);
        if (!existingItems?.length && order.items?.length) {
            const rows = order.items.map(item => ({
                order_id: savedOrder.id,
                product_name: item.name,
                quantity: item.qty,
                unit_price_ghs: item.price
            }));
            this.requireSuccess(await client.from('order_items').insert(rows));
        }
    }

    readRecords(key) {
        try {
            const value = JSON.parse(localStorage.getItem(key) || '[]');
            return Array.isArray(value) ? value : null;
        } catch (error) {
            throw new Error(`Invalid local data in ${key}`);
        }
    }

    requireSuccess(result) {
        if (result.error) throw result.error;
    }

    setStatus(message) {
        window.dispatchEvent(new CustomEvent('emd:sync-status', { detail: message }));
        console.log(`Sync: ${message}`);
    }
}

const offlineSyncManager = window.offlineSyncManager = new OfflineSyncManager();
offlineSyncManager.init();
