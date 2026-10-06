/**
 * React Query Hooks for Officer Validation Dashboard
 *
 * This module exports all custom hooks for interacting with the API endpoints.
 * All hooks use React Query for caching, loading states, and error handling.
 */

// Mutation hooks (for POST requests that modify data)
export { useValidateOfficer } from './useValidateOfficer';

// Query hooks (for GET requests that fetch data)
export { useOfficerDetail } from './useOfficerDetail';
export { useOfficerList } from './useOfficerList';
export type { OfficerListItem, OfficerListStatus } from './useOfficerList';
export { useValidationStats } from './useValidationStats';
