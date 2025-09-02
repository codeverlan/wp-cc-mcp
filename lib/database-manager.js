import { execa } from 'execa';
import path from 'path';
import fs from 'fs-extra';
import crypto from 'crypto';

export class DatabaseManager {
  constructor() {
    this.projectsDir = '/Users/tyler-lcsw/projects/wp-projects';
  }

  async getProjectPath(projectName) {
    return path.join(this.projectsDir, projectName);
  }

  async dumpDatabase(projectName, message = '') {
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    const migrationsDir = path.join(projectPath, 'migrations');
    await fs.ensureDir(migrationsDir);

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const migrationNumber = await this.getNextMigrationNumber(migrationsDir);
    const filename = `${migrationNumber}_${timestamp}${message ? '_' + message.replace(/\s+/g, '_') : ''}.sql`;
    const filepath = path.join(migrationsDir, filename);

    try {
      // Dump database using docker exec
      const { stdout } = await execa('docker', [
        'exec',
        `wp-${projectName}-db`,
        'mysqldump',
        '-u',
        'wordpress',
        '-pwordpress',
        'wordpress',
      ]);

      // Save dump to file
      await fs.writeFile(filepath, stdout);

      // Calculate checksum
      const checksum = crypto.createHash('md5').update(stdout).digest('hex');

      // Update migration log
      await this.updateMigrationLog(projectPath, filename, checksum, message);

      return {
        content: [
          {
            type: 'text',
            text: `Database dumped successfully:\n` +
                  `File: ${filename}\n` +
                  `Size: ${(stdout.length / 1024).toFixed(2)} KB\n` +
                  `Checksum: ${checksum}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to dump database: ${error.message}`);
    }
  }

  async generateDiff(projectName) {
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    const migrationsDir = path.join(projectPath, 'migrations');
    const migrations = await this.getMigrations(migrationsDir);
    
    if (migrations.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No previous migrations found. Run wp_db_dump first to create a baseline.',
          },
        ],
      };
    }

    // Get current database state
    const { stdout: currentDump } = await execa('docker', [
      'exec',
      `wp-${projectName}-db`,
      'mysqldump',
      '-u',
      'wordpress',
      '-pwordpress',
      'wordpress',
      '--no-data',
      '--routines',
      '--triggers',
    ]);

    // Get last migration for comparison
    const lastMigration = migrations[migrations.length - 1];
    const lastDumpPath = path.join(migrationsDir, lastMigration);
    const lastDump = await fs.readFile(lastDumpPath, 'utf-8');

    // Simple diff (in production, you'd use a proper SQL diff tool)
    const changes = this.findDatabaseChanges(lastDump, currentDump);

    if (changes.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No database schema changes detected since last migration.',
          },
        ],
      };
    }

    // Generate migration script
    const migrationNumber = await this.getNextMigrationNumber(migrationsDir);
    const filename = `${migrationNumber}_schema_changes.sql`;
    const filepath = path.join(migrationsDir, filename);
    
    await fs.writeFile(filepath, changes.join('\n'));

    return {
      content: [
        {
          type: 'text',
          text: `Generated migration script: ${filename}\n` +
                `Changes detected: ${changes.length} statement(s)`,
        },
      ],
    };
  }

  async importDatabase(projectName, file) {
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    const sqlPath = path.join(projectPath, file);
    
    if (!await fs.pathExists(sqlPath)) {
      throw new Error(`SQL file not found: ${file}`);
    }

    try {
      // Read SQL file
      const sqlContent = await fs.readFile(sqlPath, 'utf-8');

      // Import to database using docker exec
      await execa('docker', [
        'exec',
        '-i',
        `wp-${projectName}-db`,
        'mysql',
        '-u',
        'wordpress',
        '-pwordpress',
        'wordpress',
      ], {
        input: sqlContent,
      });

      return {
        content: [
          {
            type: 'text',
            text: `Successfully imported ${file} to ${projectName} database`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to import database: ${error.message}`);
    }
  }

  async resetDatabase(projectName) {
    const projectPath = await this.getProjectPath(projectName);
    
    if (!await fs.pathExists(projectPath)) {
      throw new Error(`Project ${projectName} does not exist`);
    }

    const migrationsDir = path.join(projectPath, 'migrations');
    const migrations = await this.getMigrations(migrationsDir);
    
    if (migrations.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'No migrations found to apply.',
          },
        ],
      };
    }

    try {
      // Drop and recreate database
      await execa('docker', [
        'exec',
        `wp-${projectName}-db`,
        'mysql',
        '-u',
        'root',
        '-proot',
        '-e',
        'DROP DATABASE IF EXISTS wordpress; CREATE DATABASE wordpress;',
      ]);

      // Apply migrations in order
      for (const migration of migrations) {
        const sqlPath = path.join(migrationsDir, migration);
        const sqlContent = await fs.readFile(sqlPath, 'utf-8');
        
        await execa('docker', [
          'exec',
          '-i',
          `wp-${projectName}-db`,
          'mysql',
          '-u',
          'wordpress',
          '-pwordpress',
          'wordpress',
        ], {
          input: sqlContent,
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: `Database reset successfully. Applied ${migrations.length} migration(s).`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to reset database: ${error.message}`);
    }
  }

  async getNextMigrationNumber(migrationsDir) {
    const files = await fs.readdir(migrationsDir).catch(() => []);
    const numbers = files
      .map(f => parseInt(f.split('_')[0]))
      .filter(n => !isNaN(n));
    
    const maxNumber = numbers.length > 0 ? Math.max(...numbers) : 0;
    return String(maxNumber + 1).padStart(3, '0');
  }

  async getMigrations(migrationsDir) {
    try {
      const files = await fs.readdir(migrationsDir);
      return files
        .filter(f => f.endsWith('.sql'))
        .sort();
    } catch (error) {
      return [];
    }
  }

  async updateMigrationLog(projectPath, filename, checksum, message) {
    const logPath = path.join(projectPath, 'migrations', 'migration_log.json');
    
    let log = [];
    if (await fs.pathExists(logPath)) {
      log = await fs.readJson(logPath);
    }

    log.push({
      filename,
      checksum,
      message,
      applied_at: new Date().toISOString(),
    });

    await fs.writeJson(logPath, log, { spaces: 2 });
  }

  findDatabaseChanges(oldDump, newDump) {
    // This is a simplified change detection
    // In production, use a proper SQL diff tool
    const changes = [];
    
    // Check for new tables
    const oldTables = this.extractTables(oldDump);
    const newTables = this.extractTables(newDump);
    
    for (const table of newTables) {
      if (!oldTables.includes(table)) {
        changes.push(`-- New table: ${table}`);
      }
    }
    
    for (const table of oldTables) {
      if (!newTables.includes(table)) {
        changes.push(`-- Dropped table: ${table}`);
      }
    }
    
    return changes;
  }

  extractTables(dump) {
    const tableMatches = dump.matchAll(/CREATE TABLE `([^`]+)`/g);
    return Array.from(tableMatches, m => m[1]);
  }
}