/**
 * React Query Hooks for Officer Validation Dashboard
 *
 * This module exports all custom hooks for interacting with the API endpoints.
 * All hooks use React Query for caching, loading states, and error handling.
 */

// Mutation hooks (for POST requests that modify data)
export { useClaimOfficer } from './useClaimOfficer';
export { useValidateOfficer } from './useValidateOfficer';
export { useReleaseOfficer } from './useReleaseOfficer';

// Query hooks (for GET requests that fetch data)
export { useOfficerDetail } from './useOfficerDetail';
export { useValidationStats } from './useValidationStats';
export { useQueueStatus } from './useQueueStatus';
