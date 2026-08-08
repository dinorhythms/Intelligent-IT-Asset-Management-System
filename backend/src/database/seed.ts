import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import 'dotenv/config';
import { PredictiveResultEntity } from '../modules/analytics/predictive-result.entity';
import { AssetEntity } from '../modules/asset/asset.entity';
import { UserEntity } from '../modules/auth/user.entity';
import { NotificationEntity } from '../modules/notifications/notification.entity';
import { RequestEntity } from '../modules/request/request.entity';
import { ServiceEntity } from '../modules/service/service.entity';
import {
  DEFAULT_QR_BASE_URL,
  QR_BASE_URL_KEY,
} from '../modules/settings/settings.service';
import { SettingsEntity } from '../modules/settings/settings.entity';
import { CategoryEntity } from '../modules/category/category.entity';
import { DepartmentEntity } from '../modules/department/department.entity';
import { VendorEntity } from '../modules/vendor/vendor.entity';
import { AppDataSource } from './data-source';

async function seedUser(
  userRepository: any,
  username: string,
  data: any,
  password: string,
) {
  const existing = await userRepository.findOne({ where: { username } });
  const passwordHash = await bcrypt.hash(password, 10);
  const payload = {
    ...data,
    username,
    passwordHash,
    loginStatus: 'active',
  };
  return userRepository.save(
    existing ? { ...existing, ...payload } : userRepository.create(payload),
  );
}

async function seedAsset(assetRepository: any, data: any) {
  const existing = await assetRepository.findOne({ where: { assetId: data.assetId } });
  if (existing) return existing;
  return assetRepository.save(assetRepository.create(data));
}

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
  const settingsRepository = AppDataSource.getRepository(SettingsEntity);
  const categoryRepository = AppDataSource.getRepository(CategoryEntity);
  const vendorRepository = AppDataSource.getRepository(VendorEntity);
  const departmentRepository = AppDataSource.getRepository(DepartmentEntity);

  await seedUser(
    userRepository,
    'admin',
    {
      email: 'admin@example.com',
      firstName: 'System',
      lastName: 'Administrator',
      department: 'IT',
      location: 'Lagos',
      phoneNumber: '+2348000000001',
      role: 'admin',
    },
    'admin123',
  );
  await seedUser(
    userRepository,
    'tech',
    {
      email: 'tech@example.com',
      firstName: 'Tolu',
      lastName: 'Adeyemi',
      department: 'IT',
      location: 'Lagos',
      phoneNumber: '+2348000000002',
      role: 'technician',
    },
    'tech123',
  );
  await seedUser(
    userRepository,
    'staff',
    {
      email: 'staff@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      department: 'Finance',
      location: 'Abuja',
      phoneNumber: '+2348000000003',
      role: 'staff',
    },
    'staff123',
  );

  const qrBaseUrl = (await settingsRepository.findOne({ where: { key: QR_BASE_URL_KEY } }))?.value || DEFAULT_QR_BASE_URL;
  if (!(await settingsRepository.findOne({ where: { key: QR_BASE_URL_KEY } }))) {
    await settingsRepository.save(
      settingsRepository.create({ key: QR_BASE_URL_KEY, value: qrBaseUrl }),
    );
  }

  const categorySeeds = [
    { categoryId: randomUUID(), categoryName: 'Laptop', description: 'Portable computing devices', status: 'active' },
    { categoryId: randomUUID(), categoryName: 'Printer', description: 'Printing and output devices', status: 'active' },
    { categoryId: randomUUID(), categoryName: 'Server', description: 'Network and application servers', status: 'active' },
    { categoryId: randomUUID(), categoryName: 'Network', description: 'Switches, routers and networking hardware', status: 'active' },
  ];
  for (const seed of categorySeeds) {
    const existing = await categoryRepository.findOne({ where: { categoryId: seed.categoryId } });
    if (!existing) {
      await categoryRepository.save(categoryRepository.create(seed));
    }
  }

  const vendorSeeds = [
    {
      vendorId: randomUUID(),
      vendorName: 'Dell EMEA',
      contactPerson: 'Ada Okafor',
      phoneNumber: '+2348012345678',
      email: 'sales@dellemea.ng',
      address: 'Lagos, Nigeria',
      status: 'active',
    },
    {
      vendorId: randomUUID(),
      vendorName: 'HP Nigeria',
      contactPerson: 'Chinedu Eze',
      phoneNumber: '+2348098765432',
      email: 'contact@hpnigeria.ng',
      address: 'Victoria Island, Lagos',
      status: 'active',
    },
    {
      vendorId: randomUUID(),
      vendorName: 'Cisco Systems',
      contactPerson: 'Bola Ade',
      phoneNumber: '+2348076543210',
      email: 'info@cisco.com',
      address: 'Abuja, Nigeria',
      status: 'active',
    },
  ];
  for (const seed of vendorSeeds) {
    const existing = await vendorRepository.findOne({ where: { vendorId: seed.vendorId } });
    if (!existing) {
      await vendorRepository.save(vendorRepository.create(seed));
    }
  }

  const departmentSeeds = [
    { departmentId: randomUUID(), departmentName: 'IT', description: 'Information Technology' },
    { departmentId: randomUUID(), departmentName: 'Finance', description: 'Finance and accounts' },
    { departmentId: randomUUID(), departmentName: 'Human Resources', description: 'HR and administration' },
    { departmentId: randomUUID(), departmentName: 'Operations', description: 'Operations and logistics' },
    { departmentId: randomUUID(), departmentName: 'Procurement', description: 'Purchasing and supply' },
  ];
  for (const seed of departmentSeeds) {
    const existing = await departmentRepository.findOne({ where: { departmentName: seed.departmentName } });
    if (!existing) {
      await departmentRepository.save(departmentRepository.create(seed));
    }
  }

  const assetSeeds = [
    {
      assetId: 'LAPTOP-001',
      uniqueId: randomUUID(),
      assetName: 'Dell Latitude 7420',
      category: 'Laptop',
      make: 'Dell',
      model: 'Latitude 7420',
      serialNumber: 'DL7420-SN0001',
      macAddress: 'AA:BB:CC:00:00:01',
      vendor: 'Dell EMEA',
      assetStatus: 'Available',
      assetLifecycle: 'deployment',
      predictiveScore: 0.42,
      dashboardView: true,
      assetLocation: 'Lagos data centre',
      qrCodeUrl: `${qrBaseUrl}/view/`,
      usageHours: 320,
      temperature: 82,
      cpuUsage: 88,
      vibration: 3.1,
      loadFactor: 0.7,
      yearsOperation: 3,
    },
    {
      assetId: 'PRINTER-001',
      uniqueId: randomUUID(),
      assetName: 'HP LaserJet Pro',
      category: 'Printer',
      make: 'HP',
      model: 'LaserJet Pro M404',
      serialNumber: 'HPM404-SN0001',
      macAddress: 'AA:BB:CC:00:00:02',
      vendor: 'HP Nigeria',
      assetStatus: 'Available',
      assetLifecycle: 'operation',
      predictiveScore: 0.3,
      dashboardView: true,
      assetLocation: 'Accounts office',
      qrCodeUrl: `${qrBaseUrl}/view/`,
      usageHours: 120,
      temperature: 40,
      cpuUsage: 30,
      vibration: 0.8,
      loadFactor: 0.4,
      yearsOperation: 1,
    },
    {
      assetId: 'SERVER-001',
      uniqueId: randomUUID(),
      assetName: 'Dell PowerEdge R750',
      category: 'Server',
      make: 'Dell',
      model: 'PowerEdge R750',
      serialNumber: 'R750-SN0001',
      macAddress: 'AA:BB:CC:00:00:03',
      vendor: 'Dell EMEA',
      assetStatus: 'Available',
      assetLifecycle: 'operation',
      predictiveScore: 0.61,
      dashboardView: true,
      assetLocation: 'Server room',
      qrCodeUrl: `${qrBaseUrl}/view/`,
      usageHours: 540,
      temperature: 88,
      cpuUsage: 94,
      vibration: 4.6,
      loadFactor: 0.9,
      yearsOperation: 4,
    },
  ];

  for (const seed of assetSeeds) {
    const asset = await seedAsset(assetRepository, seed);
    if (asset && !asset.uniqueId) {
      asset.uniqueId = randomUUID();
      asset.qrCodeUrl = `${qrBaseUrl}/view/${asset.uniqueId}`;
      await assetRepository.save(asset);
    }
  }

  const adminUser = await userRepository.findOne({
    where: { username: 'admin' },
  });
  if (adminUser) {
    const assets = await assetRepository.find();
    for (const asset of assets) {
      if (!asset.receivedById) {
        asset.receivedById = adminUser.id;
        asset.receivedBy =
          [adminUser.firstName, adminUser.lastName].filter(Boolean).join(' ') ||
          adminUser.username;
        await assetRepository.save(asset);
      }
    }
  }

  if ((await serviceRepository.count()) === 0) {
    await serviceRepository.save(
      serviceRepository.create({
        serviceId: randomUUID(),
        serviceDesc: 'Hardware maintenance',
        serviceStatus: 'active',
        predictiveImpact: 0.82,
        servicePortfolio: 'Infrastructure',
        assetId: 'LAPTOP-001',
      }),
    );
  }

  if ((await requestRepository.count()) === 0) {
    await requestRepository.save(
      requestRepository.create({
        requestNo: 'REQ-1001',
        category: 'Printer',
        qty: 1,
        reason: 'Replacement printer for the Finance office.',
        requestedBy: 'staff',
        approvalStatus: 'pending',
        requestStatus: 'open',
        requestPriority: 'normal',
      }),
    );
  }

  if ((await predictiveRepository.count()) === 0) {
    await predictiveRepository.save(
      predictiveRepository.create({
        assetId: 'SERVER-001',
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
