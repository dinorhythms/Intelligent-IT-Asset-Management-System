import * as bcrypt from 'bcryptjs';
import 'dotenv/config';
import { PredictiveResultEntity } from '../modules/analytics/predictive-result.entity';
import { AssetEntity } from '../modules/asset/asset.entity';
import { UserEntity } from '../modules/auth/user.entity';
import { NotificationEntity } from '../modules/notifications/notification.entity';
import { RequestEntity } from '../modules/request/request.entity';
import { ServiceEntity } from '../modules/service/service.entity';
import { AppDataSource } from './data-source';

async function seed() {
  await AppDataSource.initialize();
  const userRepository = AppDataSource.getRepository(UserEntity);
  const assetRepository = AppDataSource.getRepository(AssetEntity);
  const serviceRepository = AppDataSource.getRepository(ServiceEntity);
  const requestRepository = AppDataSource.getRepository(RequestEntity);
  const predictiveRepository = AppDataSource.getRepository(
    PredictiveResultEntity,
  );
  const notificationRepository =
    AppDataSource.getRepository(NotificationEntity);

  const existing = await userRepository.findOne({
    where: { username: 'admin' },
  });
  if (!existing) {
    await userRepository.save(
      userRepository.create({
        username: 'admin',
        passwordHash: await bcrypt.hash('admin123', 10),
        role: 'admin',
      }),
    );
  }

  if ((await assetRepository.count()) === 0) {
    await assetRepository.save(
      assetRepository.create({
        assetId: 'AST-1001',
        assetName: 'Dell Latitude 7420',
        assetStatus: 'active',
        assetLifecycle: 'deployment',
        predictiveScore: 0.42,
        dashboardView: true,
        usageHours: 320,
        temperature: 82,
        cpuUsage: 88,
        vibration: 3.1,
        loadFactor: 0.7,
        yearsOperation: 3,
      }),
    );
  }

  if ((await serviceRepository.count()) === 0) {
    await serviceRepository.save(
      serviceRepository.create({
        serviceId: 'SRV-2001',
        serviceDesc: 'Hardware maintenance',
        serviceStatus: 'active',
        predictiveImpact: 0.82,
        servicePortfolio: 'Infrastructure',
        assetId: 'AST-1001',
      }),
    );
  }

  if ((await requestRepository.count()) === 0) {
    await requestRepository.save(
      requestRepository.create({
        requestNo: 'REQ-1001',
        assetName: 'Printer',
        assetType: 'hardware',
        assetIdentifier: 'PRN-001',
        approvalStatus: 'pending',
        requestStatus: 'open',
        requestPriority: 'urgent',
      }),
    );
  }

  if ((await predictiveRepository.count()) === 0) {
    await predictiveRepository.save(
      predictiveRepository.create({
        assetId: 'AST-1001',
        predictiveScore: 0.78,
        maintenanceForecast: 'scheduled',
        anomalyDetected: true,
      }),
    );
  }

  if ((await notificationRepository.count()) === 0) {
    await notificationRepository.save(
      notificationRepository.create({
        recipient: 'ops@example.com',
        channel: 'email',
        message: 'Initial maintenance alert queued.',
        delivered: true,
      }),
    );
  }

  console.log('Seed completed');
  await AppDataSource.destroy();
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
