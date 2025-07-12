import { db } from "@/server/db";
import { rbacService } from "@/services/rbac-service";
import { Permission, Role } from "@/types/permissions";
import * as fs from "fs";
import * as path from "path";

interface MigrationLog {
  timestamp: Date;
  step: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

interface BackupData {
  rbacRoles: any[];
  rbacPermissions: any[];
  rbacRolePermissions: any[];
  userRoles: any[];
}

class RBACMigration {
  private logs: MigrationLog[] = [];
  private backupPath: string;

  constructor() {
    this.backupPath = path.join(process.cwd(), 'backups', `rbac-migration-${Date.now()}.json`);
  }

  private log(step: string, status: MigrationLog['status'], message: string, data?: any) {
    const logEntry: MigrationLog = {
      timestamp: new Date(),
      step,
      status,
      message,
      data
    };
    this.logs.push(logEntry);
    
    const statusIcon = status === 'success' ? '✅' : status === 'error' ? '❌' : '⚠️';
    console.log(`${statusIcon} [${step}] ${message}`);
    
    if (data) {
      console.log(`   Data:`, JSON.stringify(data, null, 2));
    }
  }

  private async backupExistingData(): Promise<BackupData> {
    this.log('BACKUP', 'success', 'Starting backup of existing RBAC data...');
    
    try {
      // Check if old tables exist
      const rbacRoles = await db.rbacRole.findMany({
        include: {
          userRoles: true,
        }
      });

      let rbacPermissions: any[] = [];
      let rbacRolePermissions: any[] = [];
      
      // Try to get old permissions and role permissions if they exist
      try {
        rbacPermissions = await (db as any).rbacPermission?.findMany() || [];
        rbacRolePermissions = await (db as any).rbacRolePermission?.findMany({
          include: {
            role: true,
            permission: true,
          }
        }) || [];
      } catch (error) {
        this.log('BACKUP', 'warning', 'Old permission tables not found, skipping backup of permission data');
      }

      const userRoles = await db.userRole.findMany({
        include: {
          role: true,
        }
      });

      const backupData: BackupData = {
        rbacRoles,
        rbacPermissions,
        rbacRolePermissions,
        userRoles,
      };

      // Ensure backup directory exists
      const backupDir = path.dirname(this.backupPath);
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      // Write backup to file
      fs.writeFileSync(this.backupPath, JSON.stringify(backupData, null, 2));
      
      this.log('BACKUP', 'success', `Backup completed successfully`, {
        backupPath: this.backupPath,
        roles: rbacRoles.length,
        permissions: rbacPermissions.length,
        rolePermissions: rbacRolePermissions.length,
        userRoles: userRoles.length,
      });

      return backupData;
    } catch (error) {
      this.log('BACKUP', 'error', `Backup failed: ${error}`);
      throw error;
    }
  }

  private async migrateRolePermissions(backupData: BackupData): Promise<void> {
    this.log('MIGRATE_PERMISSIONS', 'success', 'Starting migration of role permissions...');
    
    try {
      // Process each role that has relational permissions
      for (const rolePermission of backupData.rbacRolePermissions) {
        const roleId = rolePermission.roleId;
        const permissionName = rolePermission.permission?.name;
        
        if (!roleId || !permissionName) {
          this.log('MIGRATE_PERMISSIONS', 'warning', `Skipping invalid role permission`, {
            roleId,
            permissionName
          });
          continue;
        }

        // Get current role
        const role = await db.rbacRole.findUnique({
          where: { id: roleId }
        });

        if (!role) {
          this.log('MIGRATE_PERMISSIONS', 'warning', `Role not found: ${roleId}`);
          continue;
        }

        // Get current permissions (JSON array)
        const currentPermissions = role.permissions || [];
        
        // Add the permission if not already present
        if (!currentPermissions.includes(permissionName)) {
          const updatedPermissions = [...currentPermissions, permissionName];
          
          await db.rbacRole.update({
            where: { id: roleId },
            data: {
              permissions: updatedPermissions
            }
          });

          this.log('MIGRATE_PERMISSIONS', 'success', `Added permission to role`, {
            roleId,
            roleName: role.name,
            permission: permissionName,
            totalPermissions: updatedPermissions.length
          });
        }
      }

      this.log('MIGRATE_PERMISSIONS', 'success', 'Role permissions migration completed');
    } catch (error) {
      this.log('MIGRATE_PERMISSIONS', 'error', `Permission migration failed: ${error}`);
      throw error;
    }
  }

  private async seedDefaultRoles(): Promise<void> {
    this.log('SEED_DEFAULTS', 'success', 'Seeding default system roles...');
    
    try {
      await rbacService.seedDefaultRoles();
      this.log('SEED_DEFAULTS', 'success', 'Default roles seeded successfully');
    } catch (error) {
      this.log('SEED_DEFAULTS', 'error', `Failed to seed default roles: ${error}`);
      throw error;
    }
  }

  private async validateMigration(): Promise<void> {
    this.log('VALIDATE', 'success', 'Validating migration...');
    
    try {
      // Check that all roles have permissions
      const roles = await db.rbacRole.findMany();
      
      for (const role of roles) {
        if (!role.permissions || role.permissions.length === 0) {
          this.log('VALIDATE', 'warning', `Role has no permissions`, {
            roleId: role.id,
            roleName: role.name
          });
        }
      }

      // Check that all user roles are still intact
      const userRoles = await db.userRole.findMany({
        include: {
          role: true
        }
      });

      this.log('VALIDATE', 'success', `Migration validation completed`, {
        totalRoles: roles.length,
        totalUserRoles: userRoles.length,
        rolesWithPermissions: roles.filter(r => r.permissions && r.permissions.length > 0).length
      });
    } catch (error) {
      this.log('VALIDATE', 'error', `Validation failed: ${error}`);
      throw error;
    }
  }

  private async generateMigrationReport(): Promise<void> {
    const reportPath = path.join(process.cwd(), 'backups', `rbac-migration-report-${Date.now()}.json`);
    
    const report = {
      migration: {
        timestamp: new Date(),
        success: this.logs.filter(l => l.status === 'success').length,
        warnings: this.logs.filter(l => l.status === 'warning').length,
        errors: this.logs.filter(l => l.status === 'error').length,
      },
      logs: this.logs,
      backupPath: this.backupPath,
    };

    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    this.log('REPORT', 'success', `Migration report generated`, {
      reportPath,
      totalLogs: this.logs.length,
      success: report.migration.success,
      warnings: report.migration.warnings,
      errors: report.migration.errors,
    });
  }

  public async run(): Promise<void> {
    console.log('🚀 Starting RBAC System Migration...');
    console.log('=====================================');
    
    try {
      // Step 1: Backup existing data
      const backupData = await this.backupExistingData();
      
      // Step 2: Migrate role permissions to JSON format
      await this.migrateRolePermissions(backupData);
      
      // Step 3: Seed default roles
      await this.seedDefaultRoles();
      
      // Step 4: Validate migration
      await this.validateMigration();
      
      // Step 5: Generate report
      await this.generateMigrationReport();
      
      console.log('\n🎉 RBAC Migration completed successfully!');
      console.log(`📁 Backup saved to: ${this.backupPath}`);
      console.log('\n⚠️  Important: After verifying the migration, you can apply the database schema changes to remove the old tables.');
      
    } catch (error) {
      console.error('\n💥 Migration failed:', error);
      console.log(`📁 Backup available at: ${this.backupPath}`);
      console.log('\n🔄 To rollback, restore from the backup file.');
      
      await this.generateMigrationReport();
      throw error;
    }
  }

  public async rollback(): Promise<void> {
    console.log('🔄 Starting RBAC Migration Rollback...');
    console.log('=====================================');
    
    try {
      if (!fs.existsSync(this.backupPath)) {
        throw new Error(`Backup file not found: ${this.backupPath}`);
      }

      const backupData: BackupData = JSON.parse(fs.readFileSync(this.backupPath, 'utf-8'));
      
      this.log('ROLLBACK', 'success', 'Starting rollback from backup...');
      
      // Restore role permissions to their original state
      for (const role of backupData.rbacRoles) {
        await db.rbacRole.update({
          where: { id: role.id },
          data: {
            permissions: role.permissions || [],
            description: role.description,
            isSystem: role.isSystem,
            isActive: role.isActive,
          }
        });
      }
      
      this.log('ROLLBACK', 'success', 'Rollback completed successfully');
      
    } catch (error) {
      this.log('ROLLBACK', 'error', `Rollback failed: ${error}`);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const backupPath = args[1];
  
  if (command === 'rollback') {
    if (!backupPath) {
      console.error('❌ Rollback requires backup file path');
      process.exit(1);
    }
    
    const migration = new RBACMigration();
    (migration as any).backupPath = backupPath;
    await migration.rollback();
  } else {
    const migration = new RBACMigration();
    await migration.run();
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { RBACMigration }; 