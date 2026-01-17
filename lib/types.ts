// ============================================================================
// Core Types for Officer Validation Dashboard
// ============================================================================

/**
 * Validation status for an officer match
 */
export type ValidationStatus =
  | 'pending'          // Not yet reviewed
  | 'being_reviewed'   // Currently locked by a validator
  | 'correct'          // Validated as correct match
  | 'incorrect'        // Validated as incorrect match
  | 'needs_review';    // Needs expert review

/**
 * Officer information from the matched POST record
 */
export interface OfficerInfo {
  mention_uid: string;
  provisional_case_name: string;
  document_link?: string;
  matched_post_id: string;
  match_probability: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  matched_agency: string;
  total_employment_stints: number;
}

/**
 * Employment history record (actual database structure with post_ prefix)
 */
export interface EmploymentHistory {
  post_agency_name: string;
  post_start_date: string;
  post_end_date?: string | null;
  post_separation_reason?: string | null;
  post_person_nbr?: string;
  post_first_name?: string;
  post_middle_name?: string | null;
  post_last_name?: string;
  // Additional fields that may be present
  state?: string;
  county?: string;
  post_suffix?: string | null;
  post_agency_type?: string;
}

/**
 * Citation evidence from documents
 */
export interface Citation {
  file_name: string;
  file_id: string;
  page_number: number;
  quote: string;
  agency_name: string;
  blob_url: string;
}

/**
 * Validation metadata
 */
export interface ValidationMetadata {
  status: ValidationStatus;
  validated_by: string | null;
  validated_at: string | null;
  notes: string | null;
}

/**
 * Complete JSONB data structure stored in database
 */
export interface OfficerValidationData {
  officer_info: OfficerInfo;
  matched_officer_employment_history: EmploymentHistory[];
  // other_officers_with_same_name is a flat array of employment records, not nested
  other_officers_with_same_name: EmploymentHistory[];
  citations: Citation[];
  citation_count: number;
  validation: ValidationMetadata;
}

/**
 * Database record structure for officer_validations table
 */
export interface OfficerValidation {
  id: string;
  mention_uid: string;
  provisional_case_name: string;
  data: OfficerValidationData;
  being_reviewed_by: string | null;
  being_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Request to claim next available officer
 */
export interface ClaimOfficerRequest {
  validatorId: string;
}

/**
 * Response from claiming an officer
 */
export interface ClaimOfficerResponse {
  success: boolean;
  officer: OfficerValidation | null;
  message?: string;
}

/**
 * Request to validate an officer
 */
export interface ValidateOfficerRequest {
  mentionUid: string;
  validatorId: string;
  status: 'correct' | 'incorrect' | 'needs_review';
  notes?: string;
}

/**
 * Response from validating an officer
 */
export interface ValidateOfficerResponse {
  success: boolean;
  officer: OfficerValidation;
  message?: string;
}

/**
 * Request to release an officer without validation
 */
export interface ReleaseOfficerRequest {
  mentionUid: string;
  validatorId: string;
}

/**
 * Response from releasing an officer
 */
export interface ReleaseOfficerResponse {
  success: boolean;
  message?: string;
}

/**
 * Validation statistics across all officers
 */
export interface ValidationStats {
  total: number;
  pending: number;
  inReview: number;
  validated: number;
  correct: number;
  incorrect: number;
  needsReview: number;
  successRate: number;
}

/**
 * Queue status information
 */
export interface QueueStatus {
  available: number;
  inReview: number;
  yourOfficer: {
    mention_uid: string;
    officer_name: string;
    started_at: string;
    time_elapsed_minutes: number;
  } | null;
}

// ============================================================================
// UI Component Props Types
// ============================================================================

/**
 * Props for ProgressStats component
 */
export interface ProgressStatsProps {
  stats: ValidationStats;
  isLoading?: boolean;
}

/**
 * Props for QueueStatus component
 */
export interface QueueStatusProps {
  queueStatus: QueueStatus;
  isLoading?: boolean;
  onClaimOfficer: () => void;
  onReleaseOfficer: () => void;
  isClaimingOfficer?: boolean;
  isReleasingOfficer?: boolean;
}

/**
 * Props for OfficerDetail component
 */
export interface OfficerDetailProps {
  officer: OfficerValidation | null;
  isLoading?: boolean;
  onValidate: (status: 'correct' | 'incorrect' | 'needs_review', notes?: string) => void;
  isValidating?: boolean;
}

/**
 * Props for CitationCard component
 */
export interface CitationCardProps {
  citation: Citation;
}
