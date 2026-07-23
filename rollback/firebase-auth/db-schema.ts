export type UserRole = "admin" | "staff";
export type LeadStatus = "new" | "contacted" | "interested" | "appointment_scheduled" | "converted" | "closed";
export type AppointmentStatus = "pending" | "approved" | "completed" | "cancelled" | "no_show";

export type StaffUserDocument = {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type GoldRateDocument = {
  id: string;
  karat: "18K" | "22K" | "24K";
  pricePerGram: number;
  marketPricePerGram: number | null;
  adjustmentPercent: number;
  source: string;
  isAutomatic: boolean;
  isPublished: boolean;
  updatedBy: string;
  updatedAt: string;
};

export type GoldRateHistoryDocument = GoldRateDocument & { historyId: string };

export type RateEnquiryDocument = {
  id: string;
  name: string;
  phone: string;
  branch: string;
  source: string;
  consent: boolean;
  status: LeadStatus;
  createdAt: string;
};

export type LeadDocument = {
  id: string;
  name: string;
  phone: string;
  email: string;
  source: string;
  branch: string;
  status: LeadStatus;
  priority: "low" | "normal" | "high" | "urgent";
  assignedTo: string;
  assignedName: string;
  assignedAt: string | null;
  notes: string;
  nextFollowUp: string | null;
  firstContactedAt: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type FollowUpActivityDocument = {
  id: string;
  leadId: string;
  actorEmail: string;
  actorName: string;
  status: LeadStatus;
  note: string;
  nextFollowUp: string | null;
  createdAt: string;
};

export type AppointmentDocument = {
  id: string;
  leadId: string;
  name: string;
  phone: string;
  email: string;
  branch: string;
  appointmentDate: string;
  timeSlot: string;
  status: AppointmentStatus;
  assignedTo: string;
  assignedName: string;
  customerNote: string;
  staffNote: string;
  createdAt: string;
  updatedAt: string;
};

export type BranchDocument = {
  id: string;
  name: string;
  slug: string;
  address: string;
  phone: string;
  email: string;
  businessHours: string;
  mapsUrl: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BlogPostDocument = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  status: "draft" | "published";
  metaTitle: string;
  metaDescription: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type NotificationDocument = {
  id: string;
  type: string;
  title: string;
  message: string;
  entityId: string;
  audienceRole: "admin" | "all" | "assigned";
  recipientEmail: string;
  readBy: string[];
  createdAt: string;
};

export type AnalyticsEventDocument = {
  id: string;
  eventName: string;
  sessionId: string;
  pagePath: string;
  referrerHost: string;
  campaign: string;
  createdAt: string;
};

export type AuditLogDocument = {
  id: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  createdAt: string;
};

export type LoginAttemptDocument = {
  key: string;
  count: number;
  expiresAt: string;
};

export type SubmissionLimitDocument = LoginAttemptDocument;

export const COLLECTIONS = {
  users: "users",
  goldRates: "goldRates",
  goldRateHistory: "goldRateHistory",
  rateEnquiries: "rateEnquiries",
  leads: "leads",
  followUpActivities: "followUpActivities",
  appointments: "appointments",
  branches: "branches",
  blogPosts: "blogPosts",
  notifications: "notifications",
  analyticsEvents: "analyticsEvents",
  auditLogs: "auditLogs",
  loginAttempts: "loginAttempts",
  submissionLimits: "submissionLimits",
} as const;
