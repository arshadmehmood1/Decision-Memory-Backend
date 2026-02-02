import app from './app.js';
import { config } from './config/env.js';
import cron from 'node-cron';
import { runWeeklyDigest } from './services/digest-service.js';

// Start server
app.listen(config.port, () => {
    console.log(`🚀 Decision Memory API running on http://localhost:${config.port}`);
    console.log(`📍 Environment: ${config.nodeEnv}`);

    // Schedule weekly digest at midnight every Sunday
    cron.schedule('0 0 * * 0', () => {
        runWeeklyDigest();
    });
});

