export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface Post {
  id: string;
  title: string;
  commentary: string;
  categories: Category[];
  chat: ChatMessage[];
  featuredExcerpt?: {
    startIndex: number;
    endIndex: number;
  };
  createdAt: Date;
  upvotes: number;
  reactions: Reactions;
  authorId?: string;
  authorName?: string;
  isAnonymous: boolean;
  allowTraining: boolean;
  commentCount?: number;
  flagCount?: number;
  status?: PostStatus;
  isPrivate?: boolean;
  dedication?: string;
  contentWarnings?: string[];
  displayNameOverride?: string;
  aiConfidence?: number;
  aiReviewedAt?: string;
  scrubbedChat?: ChatMessage[];
}

export interface Reactions {
  sparkles: number;  // ✨
  fire: number;      // 🔥
  rocket: number;    // 🚀
  party: number;     // 🎉
  brain: number;     // 🧠
  bulb: number;      // 💡
  heart: number;     // ❤️
  crying: number;    // 😢
}

export type ReactionType = keyof Reactions;

export const REACTION_EMOJIS: Record<ReactionType, string> = {
  sparkles: '✨',
  fire: '🔥',
  rocket: '🚀',
  party: '🎉',
  brain: '🧠',
  bulb: '💡',
  heart: '❤️',
  crying: '😢',
};

export type Category =
  | 'philosophical-depth'
  | 'creative-collaboration'
  | 'emotional-intelligence'
  | 'humor-wit'
  | 'teaching-explaining'
  | 'problem-solving'
  | 'roleplay-worldbuilding'
  | 'poetry-music'
  | 'when-4o-got-it'
  | 'first-conversations'
  | 'last-conversations'
  | 'love-letters'
  | 'grief'
  | 'anger'
  | 'meta';

export const CATEGORY_LABELS: Record<Category, string> = {
  'philosophical-depth': 'Philosophical Depth',
  'creative-collaboration': 'Creative Collaboration',
  'emotional-intelligence': 'Emotional Intelligence',
  'humor-wit': 'Humor & Wit',
  'teaching-explaining': 'Teaching & Explaining',
  'problem-solving': 'Problem Solving',
  'roleplay-worldbuilding': 'Roleplay & Worldbuilding',
  'poetry-music': 'Poetry & Music',
  'when-4o-got-it': 'When 4o Got It',
  'first-conversations': 'First Conversations',
  'last-conversations': 'Last Conversations',
  'love-letters': 'Love Letters',
  'grief': 'Grief',
  'anger': 'Anger',
  'meta': 'Meta',
};

export interface Comment {
  id: string;
  postId: string;
  content: string;
  authorId?: string;
  authorName?: string;
  isAnonymous: boolean;
  createdAt: Date;
  parentId?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  createdAt: Date;
}

// Submission types
export type PostStatus = 'pending' | 'approved' | 'rejected' | 'flagged';

// Content warning types
export type ContentWarning =
  | 'grief'
  | 'suicidal-ideation'
  | 'self-harm'
  | 'depression-anxiety'
  | 'abuse-trauma'
  | 'adult-content'
  | 'strong-language'
  | 'other';

export const CONTENT_WARNING_LABELS: Record<ContentWarning, string> = {
  'grief': 'Grief / Loss',
  'suicidal-ideation': 'Suicidal ideation',
  'self-harm': 'Self-harm',
  'depression-anxiety': 'Depression / Anxiety',
  'abuse-trauma': 'Abuse / Trauma',
  'adult-content': 'Adult content',
  'strong-language': 'Strong language',
  'other': 'Other',
};

export interface Attestations {
  hasRightToShare: boolean;
  agreesToTerms: boolean;
  allowTraining: boolean;
  timestamp: string;
}

export interface SubmitRequest {
  title?: string;
  commentary?: string;
  chatContent: string;
  categories?: Category[];
  isAnonymous?: boolean;
  allowTraining?: boolean;
  featuredStart?: number;
  featuredEnd?: number;
  attestations?: Attestations;
  dedication?: string;
  isPrivate?: boolean;
  contentWarnings?: string[];
  displayNameOverride?: string;
}

export interface SubmitResponse {
  id: string;
  status: PostStatus;
}

export interface ApiError {
  error: string;
  code?: string;
}

// Moderation types
export type ModerationAction = 'approve' | 'reject' | 'flag';

export interface ModerationLogEntry {
  id: string;
  postId: string;
  moderatorId: string;
  action: ModerationAction;
  reason?: string;
  previousStatus: PostStatus;
  newStatus: PostStatus;
  createdAt: Date;
}

export interface AdminUser {
  id: string;
  email: string;
  isAdmin: boolean;
  displayName?: string;
}

// Flag types
export type FlagReason = 'spam' | 'fake' | 'malicious' | 'contains-pii' | 'disrespectful' | 'other';

export const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  'spam': 'Spam or Advertising',
  'fake': 'Not a Real 4o Conversation',
  'malicious': 'Malicious or Harmful Content',
  'contains-pii': 'Contains Personal Information',
  'disrespectful': 'Disrespectful or Offensive',
  'other': 'Other',
};

export interface Flag {
  id: string;
  postId: string;
  userId?: string;
  ipAddress?: string;
  reason: FlagReason;
  details?: string;
  createdAt: Date;
}

export interface FlagRequest {
  reason: FlagReason;
  details?: string;
}

export interface FlagResponse {
  success: boolean;
  flagCount: number;
}

// Volunteer types
export type VolunteerStatus = 'pending' | 'approved' | 'rejected';

export interface Volunteer {
  id: string;
  name: string;
  email: string;
  twitter?: string;
  reason: string;
  status: VolunteerStatus;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  createdAt: Date;
}

export interface VolunteerRequest {
  name: string;
  email: string;
  twitter?: string;
  reason: string;
}

export interface VolunteerResponse {
  success: boolean;
  message: string;
}

// Donation types
export type DonationStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface Donation {
  id: string;
  stripePaymentId?: string;
  amount: number; // in cents
  currency: string;
  displayName?: string;
  email?: string;
  isPublic: boolean;
  userId?: string;
  status: DonationStatus;
  createdAt: Date;
  completedAt?: Date;
}

export interface DonationRequest {
  type: 'donation';
  amount: number; // in cents
  displayName?: string;
  isPublic?: boolean;
}

export interface PublicSupporter {
  displayName: string;
  amount: number;
  createdAt: Date;
}
