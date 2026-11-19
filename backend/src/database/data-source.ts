import 'dotenv/config';
import { DataSource } from 'typeorm';
import { AiResultEntity } from '../modules/ai/ai-result.entity';
import { PredictiveResultEntity } from '../modules/analytics/predictive-result.entity';
import { AssetEntity } from '../modules/asset/asset.entity';
import { AssignmentEntity } from '../modules/assignment/assignment.entity';
import { AuditLogEntity } from '../modules/audit/audit-log.entity';
import { UserEntity } from '../modules/auth/user.entity';
import { CategoryEntity } from '../modules/category/category.entity';
import { DepartmentEntity } from '../modules/department/department.entity';
import { NotificationEntity } from '../modules/notifications/notification.entity';
import { RequestEntity } from '../modules/request/request.entity';
import { ServiceEntity } from '../modules/service/service.entity';
import { SettingsEntity } from '../modules/settings/settings.entity';
import { VendorEntity } from '../modules/vendor/vendor.entity';

const isProduction = process.env.NODE_ENV === 'production';
const databaseHost = process.env.DB_HOST || 'localhost';
const useSsl =
  process.env.DB_SSL === 'true' ||
  (process.env.DB_SSL !== 'false' &&
    (isProduction ||
      !['localhost', '127.0.0.1', '::1'].includes(databaseHost.toLowerCase())));

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: databaseHost,
  port: Number(process.env.DB_PORT || 5432),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'it_asset_db',
  ssl: useSsl ? { rejectUnauthorized: false } : false,
  entities: [
    UserEntity,
    AssetEntity,
    ServiceEntity,
    RequestEntity,
    PredictiveResultEntity,
    NotificationEntity,
    AiResultEntity,
    SettingsEntity,
    AuditLogEntity,
    AssignmentEntity,
    CategoryEntity,
    VendorEntity,
    DepartmentEntity,
  ],
  synchronize: isProduction ? false : true, // safer in prod, auto-sync in dev
  logging: isProduction ? false : true,     // quiet in prod, verbose in dev
});
