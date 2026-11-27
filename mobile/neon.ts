import { defineConfig } from '@neon/config/v1';

export default defineConfig({
    // Declare your Neon services here
    preview: {
        realtime: true,
    },
    auth: true,
    aiGateway: true,
    functions: {
        studentapi: {
            name: 'NEU Health student API',
            source: './backend/index.ts',
            env: {
                NEU_PORTAL_REALTIME_SECRET: {
                    value: process.env.NEU_PORTAL_REALTIME_SECRET,
                    required: true,
                },
                CLINIC_ACTIVE_SCHOOL_YEAR: {
                    value: process.env.CLINIC_ACTIVE_SCHOOL_YEAR ?? '2026-2027',
                    required: true,
                },
                NEU_AUTH_COOKIE_SECRET: {
                    value: process.env.NEU_AUTH_COOKIE_SECRET,
                    required: true,
                },
                NEON_REALTIME_SECRET: {
                    value: process.env.NEON_REALTIME_SECRET,
                    required: true,
                },
            },
        },
    },
    // Branch policy: per-branch tuning
    branch: (branch) => {
        if (branch.isDefault) {
            // Default branch: no overrides, uses project defaults
            return {};
        }
        if (!branch.exists) {
            // New non-default branches: auto-expire
            // Run `neon checkout <name>` to create a new branch with these settings
            return { ttl: '7d' };
        }
        // Existing branch: no changes
        return {};
    },
});
