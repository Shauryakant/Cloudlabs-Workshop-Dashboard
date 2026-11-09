import Environment from '../models/Environment.js';

const SIMULATION_FAILURE_REASONS = [
  'QuotaExceeded: Regional vCPU quota (24 cores) exceeded for Standard_D4s_v5 in East US',
  'ResourceDeploymentFailure: Subnet IP address exhaustion in 10.0.0.0/24 virtual network',
  'AuthorizationFailed: Managed Identity lacks Key Vault Secrets Officer role on kv-cloudlabs',
  'TemplateDeploymentTimeout: VM extension "CustomScript" failed to complete within 15 minutes',
  'StorageAccountConflict: Storage account name "stcloudlabs" is globally unique and already in use',
  'NetworkSecurityGroupRuleConflict: Inbound rule priority 100 collides with default Azure policy',
];

class SimulationService {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.tickCount = 0;
    this.lastTickAt = null;
    this.intervalMs = 15000; // default 15s tick
  }

  /**
   * Execute a single realistic simulation tick.
   * Modifies workshop state with controlled, realistic probabilities:
   * 1. Increases runtime for active environments
   * 2. Moves some provisioning environments to ready
   * 3. Moves some ready environments to in_use
   * 4. Advances learner progress across workshop steps
   * 5. Deprovisions finished environments
   * 6. Triggers occasional realistic Azure failures
   */
  async simulateTick() {
    try {
      this.tickCount += 1;
      this.lastTickAt = new Date();
      const events = [];

      // Check current counts to maintain operational equilibrium
      const [failedCount, inUseCount, provisioningCount] = await Promise.all([
        Environment.countDocuments({ status: 'failed' }),
        Environment.countDocuments({ status: 'in_use' }),
        Environment.countDocuments({ status: 'provisioning' }),
      ]);

      // 0. Equilibrium Guardrail: Replenish active pool if in_use drops below 70
      if (inUseCount < 70 && provisioningCount < 6) {
        const finishedEnvs = await Environment.find({ status: 'deprovisioned' }).limit(2);
        for (const env of finishedEnvs) {
          env.status = 'provisioning';
          env.currentStep = 0;
          env.runtimeMinutes = 0;
          env.provisionedAt = null;
          env.stepStartedAt = new Date();
          env.lastActivityAt = new Date();
          env.failureReason = null;
          await env.save();
          events.push(`Recycled ${env.learnerName} (${env.environmentId}) -> provisioning`);
        }
      }

      // 1. Advance runtime for all active 'in_use' environments (+1 minute per tick)
      const runtimeUpdate = await Environment.updateMany(
        { status: 'in_use' },
        {
          $inc: { runtimeMinutes: 1 },
          $set: { lastActivityAt: new Date() },
        }
      );
      if (runtimeUpdate.modifiedCount > 0) {
        events.push(`+1m runtime for ${runtimeUpdate.modifiedCount} active environments`);
      }

      // 2. Progress provisioning -> ready (~40% chance for up to 2 environments)
      const provisioningEnvs = await Environment.find({ status: 'provisioning' }).limit(3);
      for (const env of provisioningEnvs) {
        if (Math.random() < 0.40) {
          env.status = 'ready';
          env.provisionedAt = new Date();
          env.lastActivityAt = new Date();
          await env.save();
          events.push(`${env.environmentId} provisioned -> ready`);
        }
      }

      // 3. Progress ready -> in_use (~35% chance for up to 2 environments)
      const readyEnvs = await Environment.find({ status: 'ready' }).limit(3);
      for (const env of readyEnvs) {
        if (Math.random() < 0.35) {
          env.status = 'in_use';
          env.currentStep = 1;
          env.stepStartedAt = new Date();
          env.lastActivityAt = new Date();
          await env.save();
          events.push(`${env.environmentId} started lab -> in_use`);
        }
      }

      // 4. Progress active learners through steps
      const activeEnvs = await Environment.find({ status: 'in_use' }).limit(10);
      for (const env of activeEnvs) {
        // Preserve designated stuck learners (ending in 018 or 038) for instructor visibility
        if (env.learnerId.endsWith('018') || env.learnerId.endsWith('038')) {
          continue;
        }

        const rand = Math.random();

        // Step progression
        if (rand < 0.20 && env.currentStep < env.totalSteps) {
          env.currentStep += 1;
          env.stepStartedAt = new Date();
          env.lastActivityAt = new Date();
          await env.save();
          events.push(`${env.learnerName} advanced to step ${env.currentStep}`);
        }
        // Workshop completion: Only deprovision if active pool is healthy (>= 65)
        else if (rand < 0.25 && env.currentStep >= env.totalSteps && inUseCount >= 65) {
          env.status = 'deprovisioned';
          env.lastActivityAt = new Date();
          await env.save();
          events.push(`${env.learnerName} completed workshop -> deprovisioned`);
        }
        // Failure guardrail: Max 8 simultaneous failures allowed in workshop
        else if (rand > 0.985 && failedCount < 8) {
          env.status = 'failed';
          env.failureReason =
            SIMULATION_FAILURE_REASONS[
              Math.floor(Math.random() * SIMULATION_FAILURE_REASONS.length)
            ];
          env.lastActivityAt = new Date();
          await env.save();
          events.push(`${env.environmentId} failed: ${env.failureReason.split(':')[0]}`);
        }
      }

      return {
        success: true,
        tick: this.tickCount,
        timestamp: this.lastTickAt,
        events,
      };
    } catch (error) {
      console.error(`[Simulation] Error during tick #${this.tickCount}:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Start recurring background simulation timer
   * @param {number} [intervalMs=15000] Interval in milliseconds
   */
  startSimulation(intervalMs = 15000) {
    if (this.isRunning) {
      console.log('[Simulation] Simulation is already running');
      return;
    }

    this.intervalMs = intervalMs;
    this.isRunning = true;
    console.log(`[Simulation] Background workshop simulation started (interval: ${this.intervalMs}ms)`);

    this.intervalId = setInterval(async () => {
      await this.simulateTick();
    }, this.intervalMs);
  }

  /**
   * Stop recurring background simulation timer
   */
  stopSimulation() {
    if (!this.isRunning) return;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    console.log('[Simulation] Background workshop simulation stopped');
  }

  /**
   * Get current simulation status
   */
  getStatus() {
    return {
      isRunning: this.isRunning,
      intervalMs: this.intervalMs,
      tickCount: this.tickCount,
      lastTickAt: this.lastTickAt,
    };
  }
}

// Export singleton instance
export const simulationService = new SimulationService();
export default simulationService;
