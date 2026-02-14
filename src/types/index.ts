// User and Role Types
export type UserRole = 'client' | 'admin';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClientProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  goals?: string;
  injuryNotes?: string;
  emergencyContact?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Credits and Transactions
export interface CreditBalance {
  id: string;
  clientId: string;
  balance: number;
  createdAt: Date;
  updatedAt: Date;
}

export type TransactionType = 'purchase' | 'consume' | 'refund' | 'comp' | 'referral';

export interface CreditTransaction {
  id: string;
  clientId: string;
  type: TransactionType;
  amount: number;
  description: string;
  referenceId?: string; // For booking ID, referral ID, etc.
  createdAt: Date;
}

// Scheduling and Booking
export interface Slot {
  id: string;
  startTime: Date;
  endTime: Date;
  capacity: number; // Max 6 for group sessions
  bookedCount: number;
  status: 'available' | 'full' | 'cancelled';
  location?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type BookingStatus = 'booked' | 'attended' | 'no_show' | 'cancelled';

export interface Booking {
  id: string;
  slotId: string;
  clientId: string;
  status: BookingStatus;
  creditsUsed: number;
  cancellationReason?: string;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Training Programmes
export interface Exercise {
  id: string;
  name: string;
  category: ExerciseCategory;
  description?: string;
}

export enum ExerciseCategory {
  CHEST = 'Chest',
  BACK = 'Back',
  LEGS = 'Legs',
  SHOULDERS = 'Shoulders',
  ARMS = 'Arms',
  CORE = 'Core',
  CARDIO = 'Cardio',
  OTHER = 'Other'
}

export interface ProgrammeExercise {
  id: string;
  exerciseId: string;
  prescribedSets: number;
  prescribedReps: string; // e.g., "8-10", "5", "AMRAP"
  prescribedWeight?: number;
  notes?: string;
  order: number;
}

export interface Programme {
  id: string;
  name: string;
  description?: string;
  exercises: ProgrammeExercise[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProgrammeAssignment {
  id: string;
  clientId: string;
  programmeId: string;
  assignedAt: Date;
  isActive: boolean;
  notes?: string;
}

// Workout Logging
export interface Workout {
  id: string;
  clientId: string;
  date: Date;
  programmeId?: string;
  completed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkoutExercise {
  id: string;
  workoutId: string;
  exerciseId: string;
  order: number;
}

export interface SetEntry {
  id: string;
  workoutExerciseId: string;
  weight: number;
  reps: number;
  notes?: string;
  timestamp: Date;
}

// Referrals
export type ReferralStatus = 'pending' | 'completed' | 'rewarded';

export interface Referral {
  id: string;
  referrerId: string;
  referredId?: string;
  status: ReferralStatus;
  rewardCredits: number;
  rewardTransactionId?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Pricing and Payments
export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  price: number; // in pounds (£)
  discountPercent?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  clientId: string;
  creditPackId: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  paymentMethod?: string;
  transactionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Analytics and Progress
export interface OneRMRecord {
  exerciseId: string;
  estimatedOneRM: number;
  date: Date;
  weight: number;
  reps: number;
}

export type TimeFilter = '1m' | '3m' | '6m' | '1y' | 'all';

export interface AnalyticsData {
  exerciseId: string;
  records: OneRMRecord[];
  currentOneRM: number;
  trend: 'increasing' | 'decreasing' | 'stable';
}

// Navigation and UI State
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Admin: undefined;
  BookingDetail: { slotId: string };
  WorkoutLogging: { exerciseId: string };
  ProgrammeDetail: { programmeId: string };
  ClientDetail: { clientId: string };
};

export type TabParamList = {
  Dashboard: undefined;
  Booking: undefined;
  Workout: undefined;
  Analytics: undefined;
};

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
