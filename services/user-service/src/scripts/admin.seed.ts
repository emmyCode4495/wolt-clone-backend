/**
 * Admin Seed Script
 * Run once to bootstrap the first superadmin account.
 * Usage: ts-node src/scripts/admin.seed.ts
 *
 * Requires environment variables:
 *   MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_PHONE
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User, UserRole, UserStatus } from '../models/user.model';

dotenv.config();

const {
  MONGO_URI,
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_FIRST_NAME,
  ADMIN_LAST_NAME,
  ADMIN_PHONE,
} = process.env;

if (!MONGO_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD || !ADMIN_FIRST_NAME || !ADMIN_LAST_NAME || !ADMIN_PHONE) {
  console.error('❌ Missing required environment variables for admin seeding.');
  console.error('Required: MONGO_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_FIRST_NAME, ADMIN_LAST_NAME, ADMIN_PHONE');
  process.exit(1);
}

async function seedAdmin() {
  try {
    await mongoose.connect(MONGO_URI!);
    console.log('✅ Connected to MongoDB');

    const existing = await User.findOne({ email: ADMIN_EMAIL!.toLowerCase() });
    if (existing) {
      if (existing.role === UserRole.ADMIN) {
        console.log('ℹ️  Admin account already exists:', ADMIN_EMAIL);
      } else {
        console.error('❌ A non-admin account with this email already exists.');
      }
      await mongoose.disconnect();
      return;
    }

    const admin = await User.create({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      firstName: ADMIN_FIRST_NAME,
      lastName: ADMIN_LAST_NAME,
      phone: ADMIN_PHONE,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      phoneVerified: true,
    });

    console.log('✅ Superadmin created successfully');
    console.log(`   Email    : ${admin.email}`);
    console.log(`   Name     : ${admin.firstName} ${admin.lastName}`);
    console.log(`   Role     : ${admin.role}`);
    console.log(`   Status   : ${admin.status}`);
  } catch (error) {
    console.error('❌ Failed to seed admin:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seedAdmin();