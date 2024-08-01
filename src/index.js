import awsCostService from './service/aws-cost-service/index.js';
import databaseService from './service/database-service/index.js';
import migrationService from './service/migration-service/index.js';

import dotenv from 'dotenv'

dotenv.config();

async function main() {
  await databaseService.openConnection()
  await migrationService.migrate()
  await awsCostService.generate()
  await databaseService.closeConnection()
}

main();
