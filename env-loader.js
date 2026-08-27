// ============================================
// ENVIRONMENT LOADER
// ============================================

/**
 * Load environment variables from .env.local
 * Works with development servers that support environment loading
 * 
 * For static file serving, credentials are embedded in supabase-config.js
 * For production, use build tools like Vite or Webpack that support .env files
 */

class EnvLoader {
    static async load() {
        try {
            // Check if environment variables are already available (Vite, etc.)
            if (import.meta?.env) {
                console.log('✅ Environment loaded via build tool');
                return;
            }

            // Fallback: load from .env.local if available
            const response = await fetch('.env.local');
            if (!response.ok) {
                console.warn('⚠️ .env.local not found - using defaults from supabase-config.js');
                return;
            }

            const text = await response.text();
            const lines = text.split('\n');

            for (const line of lines) {
                if (line.trim() && !line.startsWith('#')) {
                    const [key, ...valueParts] = line.split('=');
                    const value = valueParts.join('=').trim();
                    if (key.trim()) {
                        window.env = window.env || {};
                        window.env[key.trim()] = value;
                    }
                }
            }

            console.log('✅ Environment variables loaded from .env.local');
        } catch (error) {
            console.warn('⚠️ Could not load .env.local:', error.message);
        }
    }
}

// Load on script initialization
EnvLoader.load();
