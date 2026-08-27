// ============================================
// SUPABASE CONFIGURATION & INITIALIZATION
// ============================================

/**
 * Supabase Client Configuration
 * This module handles secure connection to Supabase database
 */

class SupabaseManager {
    constructor() {
        // This project runs as a classic browser script, so do not use import.meta here.
        this.supabaseUrl = window.EMD_SUPABASE_URL || 'https://byhxgazvtznzlcugpbdf.supabase.co';
        this.supabaseAnonKey = window.EMD_SUPABASE_ANON_KEY || 'sb_publishable_n8g5AktEUszZZxuoniAxPQ_3nR8PExX';
        
        this.client = null;
        this.isInitialized = false;
        
        console.log('🔧 SupabaseManager initialized');
    }

    /**
     * Initialize Supabase client
     * Must be called before using any database operations
     */
    async init() {
        try {
            if (this.isInitialized) {
                console.log('✅ Supabase already initialized');
                return this.client;
            }

            // Check if window.supabase is available (from CDN)
            if (!window.supabase) {
                throw new Error('Supabase library not loaded. Ensure it is included in HTML via CDN.');
            }

            // Create Supabase client
            this.client = window.supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
            
            // Test connection
            const { data, error } = await this.client.auth.getUser();
            
            if (error) {
                console.warn('⚠️ Auth check returned:', error.message);
                // This is expected if no user is logged in yet
            }

            this.isInitialized = true;
            window.dispatchEvent(new CustomEvent('emd:supabase-ready'));
            console.log('✅ Supabase connected successfully!');
            return this.client;
        } catch (error) {
            console.error('❌ Supabase initialization failed:', error);
            throw error;
        }
    }

    /**
     * Get the initialized client
     */
    getClient() {
        if (!this.isInitialized) {
            throw new Error('Supabase not initialized. Call init() first.');
        }
        return this.client;
    }

    async signIn(username, password) {
        const client = this.getClient();
        const email = username.includes('@') ? username.toLowerCase() : `${username.toLowerCase()}@emd.com`;
        const { data, error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data.user;
    }

    async signOut() {
        if (this.isInitialized) await this.getClient().auth.signOut();
    }

    async updatePassword(password) {
        const { data, error } = await this.getClient().auth.updateUser({ password });
        if (error) throw error;
        return data.user;
    }

    async recordLogin(identifier, loginMethod = 'supabase') {
        const { data: authData, error: authError } = await this.getClient().auth.getUser();
        if (authError) throw authError;
        const { error } = await this.getClient().from('login_events').insert({
            user_id: authData.user.id,
            identifier,
            login_method: loginMethod,
            user_agent: navigator.userAgent
        });
        if (error) throw error;
    }

    /**
     * Test database connection
     */
    async testConnection() {
        try {
            const client = this.getClient();
            
            // Try to fetch from a test table (adjust based on your schema)
            const { data, error } = await client
                .from('test')
                .select('*')
                .limit(1);

            if (error) {
                console.log('📊 Database test query returned:', error.message);
                return { connected: true, message: 'Connected to Supabase (note: test table may not exist yet)' };
            }

            console.log('✅ Database connection test successful!');
            return { connected: true, data, message: 'Successfully connected to Supabase database' };
        } catch (error) {
            console.error('❌ Connection test failed:', error);
            return { connected: false, error: error.message };
        }
    }

    /**
     * Save inventory data to Supabase
     */
    async saveInventory(data) {
        try {
            const client = this.getClient();
            const { data: result, error } = await client
                .from('inventory')
                .insert([data]);

            if (error) throw error;
            console.log('✅ Inventory saved:', result);
            return result;
        } catch (error) {
            console.error('❌ Failed to save inventory:', error);
            throw error;
        }
    }

    /**
     * Get inventory data from Supabase
     */
    async getInventory() {
        try {
            const client = this.getClient();
            const { data, error } = await client
                .from('inventory')
                .select('*');

            if (error) throw error;
            console.log('✅ Inventory retrieved:', data);
            return data;
        } catch (error) {
            console.error('❌ Failed to get inventory:', error);
            throw error;
        }
    }

    /**
     * Update inventory item
     */
    async updateInventory(id, updates) {
        try {
            const client = this.getClient();
            const { data, error } = await client
                .from('inventory')
                .update(updates)
                .eq('id', id);

            if (error) throw error;
            console.log('✅ Inventory updated:', data);
            return data;
        } catch (error) {
            console.error('❌ Failed to update inventory:', error);
            throw error;
        }
    }

    /**
     * Delete inventory item
     */
    async deleteInventory(id) {
        try {
            const client = this.getClient();
            const { data, error } = await client
                .from('inventory')
                .delete()
                .eq('id', id);

            if (error) throw error;
            console.log('✅ Inventory deleted');
            return data;
        } catch (error) {
            console.error('❌ Failed to delete inventory:', error);
            throw error;
        }
    }
}

// Create global instance
const supabaseManager = window.supabaseManager = new SupabaseManager();

// Initialize after environment loading completes.
(window.emdEnvReady || Promise.resolve()).then(() => {
    supabaseManager.init().then(async () => {
        const testResult = await supabaseManager.testConnection();
        console.log('🧪 Connection Test:', testResult);
    }).catch(error => {
        console.error('Failed to initialize Supabase:', error);
    });
});
