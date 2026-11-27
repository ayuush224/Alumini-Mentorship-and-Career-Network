export interface IAvailabilitySlot {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // "09:00" (HH:MM 24h format)
  endTime: string;   // "11:00"
}

export interface MenteeGoalInput {
  studentId: string;
  institutionId?: string;
  department?: string;
  graduationYear?: number;
  targetRole?: string;
  targetIndustry?: string;
  careerGoal?: string;
  currentSkills?: string[];
  skillsToLearn?: string[];
  knowledgeGaps?: string[];
  problemDescription?: string;
  preferredMentoringStyle?: "hands_on" | "strategic" | "structured" | "casual" | "any";
  preferredLanguage?: string;
  meetingPreference?: "remote" | "in_person" | "hybrid";
  availabilitySchedule?: IAvailabilitySlot[];
}

export interface MentorReliabilityStats {
  requestsReceived?: number;
  requestsAnswered?: number;
  requestsAccepted?: number;
  avgResponseTimeHours?: number;
  sessionsScheduled?: number;
  sessionsCompleted?: number;
  sessionsCancelled?: number;
}

export interface MentorCandidate {
  mentorId: string;
  name: string;
  institutionId?: string;
  isVerified?: boolean;
  verificationStatus?: string;
  isDeleted?: boolean;
  department?: string;
  graduationYear?: number;
  company: string;
  jobTitle: string;
  industry: string;
  yearsOfExperience: number;
  skills: string[];
  skillsCanTeach: string[];
  topicsCanMentor: string[];
  mentoringExperience?: string;
  preferredMentoringStyle?: string;
  languages?: string[];
  meetingPreference?: "remote" | "in_person" | "hybrid";
  timezone?: string;
  maxMentees: number;
  activeMentees: number;
  pendingReservations?: number;
  acceptingRequests?: boolean;
  status?: string; // "available" | "near_capacity" | "at_capacity" | "paused"
  availability?: "open" | "waitlist" | "stopped";
  availabilitySchedule?: IAvailabilitySlot[];
  reliabilityStats?: MentorReliabilityStats;
  averageRating?: number;
  reviewCount?: number;
  avatarUrl?: string;
  headline?: string;
  expertiseTags?: string[];
  capabilityEmbedding?: number[];
}

export interface ScoreBreakdown {
  semantic: number;
  skillCoverage: number;
  careerRelevance: number;
  mentoringCapability: number;
  seniority: number;
  availability: number;
  reliability: number;
  rating: number;
}

export interface ScoredRecommendation {
  mentorId: string;
  name: string;
  avatarUrl?: string;
  headline?: string;
  company: string;
  jobTitle: string;
  industry: string;
  expertiseTags: string[];
  yearsOfExperience: number;
  finalScore: number;
  scoreBreakdown: ScoreBreakdown;
  reasons: string[];
  sharedSkills: string[];
  canTeachSkills: string[];
  remainingSpots: number;
  maxMentees: number;
  activeMentees: number;
  isAtCapacity: boolean;
  hasPendingRequest: boolean;
  hasActiveMentorship: boolean;
  compatibleTimes: string[];
}

export interface EngineWeights {
  semantic: number;            // Initial: 0.25 (25%)
  skillCoverage: number;       // Initial: 0.20 (20%)
  careerRelevance: number;     // Initial: 0.15 (15%)
  mentoringCapability: number; // Initial: 0.10 (10%)
  seniority: number;           // Initial: 0.10 (10%)
  availability: number;        // Initial: 0.10 (10%)
  reliability: number;         // Initial: 0.05 (5%)
  rating: number;              // Initial: 0.05 (5%)
}

export interface EngineConfig {
  weights: EngineWeights;
  seniorityMu: number;          // Default: 3.5
  senioritySigma: number;       // Default: 2.0
  bayesianPriorMean: number;    // Default: 4.0
  bayesianConfidenceC: number;  // Default: 3.0
  diversityLambda: number;      // Default: 0.75 (75% relevance, 25% diversity)
  retrievalCandidatePoolSize: number; // Default: 75
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  weights: {
    semantic: 0.25,
    skillCoverage: 0.20,
    careerRelevance: 0.15,
    mentoringCapability: 0.10,
    seniority: 0.10,
    availability: 0.10,
    reliability: 0.05,
    rating: 0.05,
  },
  seniorityMu: 3.5,
  senioritySigma: 2.0,
  bayesianPriorMean: 4.0,
  bayesianConfidenceC: 3.0,
  diversityLambda: 0.75,
  retrievalCandidatePoolSize: 75,
};
