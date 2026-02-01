
export type Priority = "Low" | "Medium" | "High";

export type EntityType = "knowledge" | "job" | "client" | "task" | "subscription";

export type SocialPlatform = 'YouTube' | 'Twitter/X' | 'Skool' | 'GitHub' | 'Other';

export interface BaseEntity {
  id: string;
  type: EntityType;
  title: string;
  createdAt: string;
  updatedAt: string;
  priority?: Priority;
  notes?: string;
  tags?: string[];
  links?: string[];
  relatedIds?: string[];
  lastAccessedAt?: string;
}

export interface KnowledgeEntity extends BaseEntity {
  type: "knowledge";
  category: KnowledgeCategory;
  summary: string;
  promptResponse: string;
  platform?: SocialPlatform;
  handleOrChannel?: string;
  contentLink?: string;
}

export type JobStatus = "Apply" | "Applied" | "Interview" | "Rejected" | "Offer" | "Active-Gig";
export type JobCategory = "Discovery" | "Pipeline";
export type GigPlatformStatus = "Scouting" | "Assessing" | "Waitlisted" | "Active";

export interface JobEntity extends BaseEntity {
  type: "job";
  jobCategory: JobCategory;
  company: string;
  role: string;
  jobLink: string;
  status: JobStatus;
  platformStatus?: GigPlatformStatus;
  followUpDate?: string;
  deadlineDate?: string;
  payRange?: string;
  hourlyRate?: number;
  confidenceScore?: number;
  aiScoutTags?: string[];
}

export interface ClientEntity extends BaseEntity {
  type: "client";
  industry: string;
  status: "Active" | "Inactive";
}

export interface TaskEntity extends BaseEntity {
  type: "task";
  clientId?: string;
  dueDate?: string;
  description?: string;
  status: "Todo" | "In Progress" | "Done";
  isFocused?: boolean;
  timeSpentMinutes?: number; // Tracking velocity
}

export interface SubscriptionEntity extends BaseEntity {
  type: "subscription";
  cost: number;
  billingCycle: "Monthly" | "Yearly";
  whyExists: string;
  keep: boolean;
  usageScore?: number; // 1-10 based on how often it's linked to tasks
}

export type Entity = KnowledgeEntity | JobEntity | ClientEntity | TaskEntity | SubscriptionEntity;

export type KnowledgeCategory = 
  | 'ai-code' 
  | 'design' 
  | 'media' 
  | 'business' 
  | 'automation' 
  | 'teaching' 
  | 'productivity' 
  | 'people';

export interface CategoryInfo {
  id: KnowledgeCategory;
  label: string;
  icon: string;
  prompt: string;
}
