import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/database.js';
import Environment from '../models/Environment.js';

dotenv.config();

const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Aditi', 'Rohan', 'Priya', 'Vikram', 'Sneha', 'Rahul', 'Neha', 'Arjun',
  'Kavya', 'Siddharth', 'Pooja', 'Karan', 'Isha', 'Varun', 'Rhea', 'Manish', 'Divya', 'Gaurav',
  'Meera', 'Nikhil', 'Tanvi', 'Abhishek', 'Shreya', 'Amit', 'Anjali', 'Deepak', 'Swati', 'Harsh',
  'James', 'Emma', 'Liam', 'Olivia', 'Noah', 'Sophia', 'Ethan', 'Isabella', 'Mason', 'Mia',
  'Alexander', 'Charlotte', 'Lucas', 'Amelia', 'Benjamin', 'Harper', 'Daniel', 'Evelyn', 'Matthew', 'Abigail',
  'Chen', 'Wei', 'Ying', 'Zhang', 'Liu', 'Fatima', 'Omar', 'Zainab', 'Tariq', 'Layla',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Reddy', 'Mehta', 'Nair', 'Singh', 'Gupta', 'Iyer', 'Deshmukh',
  'Kulkarni', 'Joshi', 'Chopra', 'Malhotra', 'Bhat', 'Rao', 'Choudhury', 'Mukherjee', 'Pillai', 'Menon',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson', 'Anderson', 'Taylor',
  'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez',
];

const FAILURE_REASONS = [
  'QuotaExceeded: Regional vCPU quota (24 cores) exceeded for Standard_D4s_v5 in East US',
  'ResourceDeploymentFailure: Subnet IP address exhaustion in 10.0.0.0/24 virtual network',
  'AuthorizationFailed: Managed Identity lacks Key Vault Secrets Officer role on kv-cloudlabs',
  'TemplateDeploymentTimeout: VM extension "CustomScript" failed to complete within 15 minutes',
  'StorageAccountConflict: Storage account name "stcloudlabs" is globally unique and already in use',
  'NetworkSecurityGroupRuleConflict: Inbound rule priority 100 collides with default Azure policy',
  'SubscriptionCapacityReached: Maximum dynamic Public IP addresses (100) reached for current tier',
];

/**
 * Generate 120 realistic learner environments representing a live Azure Cloud Workshop.
 */
export const generateSeedData = () => {
  const environments = [];
  const now = new Date();
  const totalSteps = 8;

  // We want a realistic distribution among 120 learners:
  // - in_use: 76 learners
  // - failed: 8 learners
  // - provisioning: 12 learners
  // - ready: 14 learners
  // - deprovisioned: 10 learners
  // Total: 120

  for (let i = 1; i <= 120; i++) {
    const idPad = String(i).padStart(3, '0');
    const learnerId = `LRN-${idPad}`;
    const environmentId = `env-az-${idPad}`;

    const firstName = FIRST_NAMES[(i - 1) % FIRST_NAMES.length];
    const lastName = LAST_NAMES[(Math.floor((i - 1) / 3)) % LAST_NAMES.length];
    const learnerName = `${firstName} ${lastName}`;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@cloudlabs.io`;

    let status;
    let currentStep;
    let runtimeMinutes;
    let hourlyRate = 1.50; // standard Azure VM + storage hourly rate
    let failureReason = null;
    let provisionedAt = null;
    let stepStartedAt = new Date(now);
    let lastActivityAt = new Date(now);

    if (i <= 76) {
      // 76 Active Learners (in_use)
      status = 'in_use';
      // Distribution of steps: mostly in middle to later steps
      if (i <= 10) currentStep = 1;
      else if (i <= 25) currentStep = 2;
      else if (i <= 40) currentStep = 3;
      else if (i <= 55) currentStep = 4;
      else if (i <= 68) currentStep = 5;
      else currentStep = 6;

      // Realistic runtime: 25 to 140 minutes
      runtimeMinutes = 20 + (currentStep * 18) + (i % 15);
      provisionedAt = new Date(now.getTime() - runtimeMinutes * 60 * 1000);

      // Simulate stuck learners: learners with i = 18, 38, 52 are stuck for > 25 mins on step
      if ([18, 38, 52, 63].includes(i)) {
        const stuckMinutes = 28 + (i % 15); // 28 - 42 minutes stuck
        stepStartedAt = new Date(now.getTime() - stuckMinutes * 60 * 1000);
        lastActivityAt = new Date(now.getTime() - (stuckMinutes - 5) * 60 * 1000);
      } else {
        const activeMinutes = 3 + (i % 12);
        stepStartedAt = new Date(now.getTime() - activeMinutes * 60 * 1000);
        lastActivityAt = new Date(now.getTime() - (activeMinutes - 2) * 60 * 1000);
      }
    } else if (i <= 84) {
      // 8 Failed Environments (for instructor intervention / reprovisioning)
      status = 'failed';
      currentStep = (i % 4) + 1; // failed during step 1, 2, 3, or 4
      runtimeMinutes = 15 + (i % 20);
      provisionedAt = new Date(now.getTime() - (runtimeMinutes + 10) * 60 * 1000);
      stepStartedAt = new Date(now.getTime() - runtimeMinutes * 60 * 1000);
      lastActivityAt = new Date(now.getTime() - (runtimeMinutes - 2) * 60 * 1000);
      failureReason = FAILURE_REASONS[(i - 77) % FAILURE_REASONS.length];
    } else if (i <= 96) {
      // 12 Provisioning Environments (currently being deployed)
      status = 'provisioning';
      currentStep = 0;
      runtimeMinutes = 0;
      provisionedAt = null;
      stepStartedAt = new Date(now.getTime() - (1 + (i % 4)) * 60 * 1000);
      lastActivityAt = new Date(now);
      failureReason = null;
    } else if (i <= 110) {
      // 14 Ready Environments (provisioned, awaiting learner login)
      status = 'ready';
      currentStep = 1;
      runtimeMinutes = 5 + (i % 10);
      provisionedAt = new Date(now.getTime() - runtimeMinutes * 60 * 1000);
      stepStartedAt = new Date(now.getTime() - 2 * 60 * 1000);
      lastActivityAt = new Date(now.getTime() - 1 * 60 * 1000);
      failureReason = null;
    } else {
      // 10 Deprovisioned Environments (fast learners who finished early)
      status = 'deprovisioned';
      currentStep = totalSteps;
      runtimeMinutes = 140 + (i % 30);
      provisionedAt = new Date(now.getTime() - (runtimeMinutes + 20) * 60 * 1000);
      stepStartedAt = new Date(now.getTime() - 30 * 60 * 1000);
      lastActivityAt = new Date(now.getTime() - 25 * 60 * 1000);
      failureReason = null;
    }

    environments.push({
      learnerId,
      learnerName,
      email,
      environmentId,
      status,
      currentStep,
      totalSteps,
      stepStartedAt,
      lastActivityAt,
      provisionedAt,
      runtimeMinutes,
      hourlyRate,
      failureReason,
    });
  }

  return environments;
};

/**
 * Seed the database with 120 realistic records.
 */
export const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await connectDB();

    console.log('[Seed] Clearing existing Environment records...');
    const deleteResult = await Environment.deleteMany({});
    console.log(`[Seed] Deleted ${deleteResult.deletedCount} existing records.`);

    console.log('[Seed] Generating 120 realistic learner environments...');
    const seedRecords = generateSeedData();

    console.log('[Seed] Inserting records into database...');
    const inserted = await Environment.insertMany(seedRecords);
    console.log(`[Seed] Successfully inserted ${inserted.length} environments into MongoDB Atlas!`);

    // Print breakdown
    const breakdown = {
      total: inserted.length,
      in_use: inserted.filter((e) => e.status === 'in_use').length,
      failed: inserted.filter((e) => e.status === 'failed').length,
      provisioning: inserted.filter((e) => e.status === 'provisioning').length,
      ready: inserted.filter((e) => e.status === 'ready').length,
      deprovisioned: inserted.filter((e) => e.status === 'deprovisioned').length,
    };
    console.log('[Seed] Status breakdown:', breakdown);

    await disconnectDB();
    console.log('[Seed] Seeding completed cleanly.');
  } catch (error) {
    console.error(`[Seed] Error seeding database: ${error.message}`);
    process.exit(1);
  }
};

// Execute if run directly from CLI
if (process.argv[1]?.endsWith('seedData.js')) {
  seedDatabase();
}
