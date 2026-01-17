import { redirect } from 'next/navigation';

/**
 * Root page - Redirects to /dashboard
 *
 * All validator interactions happen on the dashboard,
 * so we redirect immediately to avoid confusion.
 */
export default function Home() {
  redirect('/dashboard');
}
