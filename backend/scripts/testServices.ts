import { runAhHeadsService } from '../src/services/ahService';
import { runRcHeadsService } from '../src/services/rcService';

async function main() {
  console.log('Starting Asset Hub and Relay Chain services...');

  try {
    // Start both services
    const ahService = await runAhHeadsService();
    const rcService = await runRcHeadsService({});

    console.log('Services started successfully. Press Ctrl+C to stop.');

    // Handle graceful shutdown
    const shutdown = async () => {
      console.log('Shutting down services...');
      await ahService.unsubscribe();
      await rcService();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Failed to start services:', error);
    process.exit(1);
  }
}

main().catch(console.error); 