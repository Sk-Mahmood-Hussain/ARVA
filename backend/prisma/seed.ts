import { PrismaClient, Role, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Clean database
  await prisma.notification.deleteMany();
  await prisma.banRequest.deleteMany();
  await prisma.transferRequest.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.broadcast.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.like.deleteMany();
  await prisma.post.deleteMany();
  await prisma.scheme.deleteMany();

  await prisma.adminProfile.deleteMany();
  await prisma.farmerProfile.deleteMany();
  await prisma.officerProfile.deleteMany();
  await prisma.user.deleteMany();
  await prisma.region.deleteMany();

  console.log('Database cleaned.');

  // 2. Create Admin user
  const adminPasswordHash = await bcrypt.hash('Eram@2004', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'gulzareeram@gmail.com',
      name: 'Admin Eram',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
      language: 'en',
      adminProfile: {
        create: {},
      },
    },
  });
  console.log(`Admin created: ${adminUser.email}`);

  const regionsData = [
    { state: 'Punjab', district: 'Amritsar', block: 'Ajnala', village: 'Harar' },
    { state: 'Punjab', district: 'Amritsar', block: 'Ajnala', village: 'Chamyari' },
    { state: 'Punjab', district: 'Ludhiana', block: 'Jagraon', village: 'Algarh' },
    { state: 'Punjab', district: 'Ludhiana', block: 'Jagraon', village: 'Gidderwindi' },
    { state: 'Punjab', district: 'Patiala', block: 'Nabha', village: 'Naraingarh' },
    { state: 'Punjab', district: 'Patiala', block: 'Nabha', village: 'Bhadson' },
    { state: 'Punjab', district: 'Jalandhar', block: 'Nakodar', village: 'Nakodar Village' },
    { state: 'Punjab', district: 'Bathinda', block: 'Talwandi Sabo', village: 'Sabo Ke' },
    { state: 'Punjab', district: 'Gurdaspur', block: 'Batala', village: 'Batala Village' },
    { state: 'Punjab', district: 'Firozpur', block: 'Zira', village: 'Zira Village' },
    { state: 'Punjab', district: 'Hoshiarpur', block: 'Dasuya', village: 'Dasuya Village' },
    { state: 'Punjab', district: 'Sangrur', block: 'Dhuri', village: 'Dhuri Village' },
    { state: 'Punjab', district: 'Moga', block: 'Bagha Purana', village: 'Bagha Purana Village' },
    { state: 'Punjab', district: 'Pathankot', block: 'Dhar Kalan', village: 'Dhar Village' },
    { state: 'Punjab', district: 'Tarn Taran', block: 'Patti', village: 'Patti Village' },
    { state: 'Punjab', district: 'Rupnagar', block: 'Anandpur Sahib', village: 'Anandpur Village' },
    { state: 'Punjab', district: 'Mohali', block: 'Kharar', village: 'Kharar Village' },
    { state: 'Punjab', district: 'Barnala', block: 'Barnala Block', village: 'Barnala Village' },
    { state: 'Punjab', district: 'Faridkot', block: 'Kotkapura', village: 'Kotkapura Village' },
    { state: 'Punjab', district: 'Fatehgarh Sahib', block: 'Sirhind', village: 'Sirhind Village' },
    { state: 'Punjab', district: 'Fazilka', block: 'Abohar', village: 'Abohar Village' },
    { state: 'Punjab', district: 'Kapurthala', block: 'Phagwara', village: 'Phagwara Village' },
    { state: 'Punjab', district: 'Mansa', block: 'Budhlada', village: 'Budhlada Village' },
    { state: 'Punjab', district: 'Sri Muktsar Sahib', block: 'Malout', village: 'Malout Village' },
    { state: 'Punjab', district: 'Nawanshahr', block: 'Balachaur', village: 'Balachaur Village' },
    { state: 'Punjab', district: 'Malerkotla', block: 'Amargarh', village: 'Amargarh Village' }
  ];

  const regions = [];
  for (const r of regionsData) {
    const region = await prisma.region.create({
      data: r,
    });
    regions.push(region);
    console.log(`Region created: ${r.state} -> ${r.district} -> ${r.block} -> ${r.village}`);
  }

  // 4. Create Officers
  const officerPasswordHash = await bcrypt.hash('Officer@123456', 10);

  // Officer 1 (Amritsar Region)
  const officer1User = await prisma.user.create({
    data: {
      email: 'officer.amritsar@arva.gov.in',
      name: 'Officer Harpreet Singh',
      passwordHash: officerPasswordHash,
      role: Role.OFFICER,
      status: UserStatus.ACTIVE,
      language: 'en',
      phoneNumber: '+919876543210',
      officerProfile: {
        create: {
          regions: {
            connect: [
              { id: regions[0].id },
              { id: regions[1].id },
            ],
          },
        },
      },
    },
  });
  console.log(`Officer 1 created: ${officer1User.email} (Amritsar)`);

  // Officer 2 (Ludhiana Region)
  const officer2User = await prisma.user.create({
    data: {
      email: 'officer.ludhiana@arva.gov.in',
      name: 'Officer Gurpreet Singh',
      passwordHash: officerPasswordHash,
      role: Role.OFFICER,
      status: UserStatus.ACTIVE,
      language: 'en',
      phoneNumber: '+919876543211',
      officerProfile: {
        create: {
          regions: {
            connect: [
              { id: regions[2].id },
              { id: regions[3].id },
            ],
          },
        },
      },
    },
  });
  console.log(`Officer 2 created: ${officer2User.email} (Ludhiana)`);

  // Officer 3 (Patiala Region)
  const officer3User = await prisma.user.create({
    data: {
      email: 'officer.patiala@arva.gov.in',
      name: 'Officer Rajinder Singh',
      passwordHash: officerPasswordHash,
      role: Role.OFFICER,
      status: UserStatus.ACTIVE,
      language: 'en',
      phoneNumber: '+919876543212',
      officerProfile: {
        create: {
          regions: {
            connect: [
              { id: regions[4].id },
              { id: regions[5].id },
            ],
          },
        },
      },
    },
  });
  console.log(`Officer 3 created: ${officer3User.email} (Patiala)`);

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
