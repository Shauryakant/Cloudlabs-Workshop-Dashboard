import mongoose from 'mongoose';

export const ENVIRONMENT_STATUSES = [
  'provisioning',
  'ready',
  'in_use',
  'failed',
  'deprovisioned',
];

const environmentSchema = new mongoose.Schema(
  {
    learnerId: {
      type: String,
      required: [true, 'Learner ID is required'],
      trim: true,
      unique: true,
      index: true,
    },
    learnerName: {
      type: String,
      required: [true, 'Learner name is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: [true, 'Learner email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
      index: true,
    },
    environmentId: {
      type: String,
      required: [true, 'Environment ID is required'],
      trim: true,
      unique: true,
      index: true,
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: ENVIRONMENT_STATUSES,
        message: 'Invalid status: {VALUE}. Must be one of: ' + ENVIRONMENT_STATUSES.join(', '),
      },
      default: 'provisioning',
      index: true,
    },
    currentStep: {
      type: Number,
      required: true,
      min: [0, 'Current step cannot be negative'],
      default: 1,
      index: true,
    },
    totalSteps: {
      type: Number,
      required: true,
      min: [1, 'Total steps must be at least 1'],
      default: 8,
    },
    stepStartedAt: {
      type: Date,
      default: Date.now,
    },
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    provisionedAt: {
      type: Date,
      default: null,
    },
    runtimeMinutes: {
      type: Number,
      required: true,
      min: [0, 'Runtime minutes cannot be negative'],
      default: 0,
      index: true,
    },
    hourlyRate: {
      type: Number,
      required: true,
      min: [0, 'Hourly rate cannot be negative'],
      default: 1.5,
    },
    failureReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for estimated spend
environmentSchema.virtual('estimatedSpend').get(function () {
  const rate = this.hourlyRate || 0;
  const runtime = this.runtimeMinutes || 0;
  return Number(((runtime / 60) * rate).toFixed(2));
});

// Virtual for completion percentage
environmentSchema.virtual('completionPercentage').get(function () {
  if (!this.totalSteps || this.totalSteps <= 0) return 0;
  return Math.min(100, Math.round((this.currentStep / this.totalSteps) * 100));
});

// Compound indexes for common queries
environmentSchema.index({ status: 1, currentStep: 1 });
environmentSchema.index({ status: 1, lastActivityAt: -1 });

const Environment = mongoose.model('Environment', environmentSchema);

export default Environment;
