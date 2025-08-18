/**
 * Admin configuration for TeaKE
 * Manages admin user permissions
 */

// List of admin email addresses
const ADMIN_EMAILS = [
  "kulubiidris@gmail.com"

];

/**
 * Check if a user is an admin based on their email
 * @param email - The user's email address
 * @returns true if the user is an admin, false otherwise
 */
export function isUserAdmin(email: string): boolean {
  if (!email) {
    return false;
  }
  
  // Normalize email to lowercase for comparison
  const normalizedEmail = email.toLowerCase().trim();
  
  // Check if the email is in the admin list
  return ADMIN_EMAILS.some(adminEmail => 
    adminEmail.toLowerCase().trim() === normalizedEmail
  );
}

/**
 * Get all admin emails
 * @returns Array of admin email addresses
 */
export function getAdminEmails(): string[] {
  return [...ADMIN_EMAILS];
}

/**
 * Add an admin email (runtime only, not persisted)
 * @param email - Email to add to admin list
 */
export function addAdminEmail(email: string): void {
  if (email && !ADMIN_EMAILS.includes(email)) {
    ADMIN_EMAILS.push(email);
  }
}

/**
 * Remove an admin email (runtime only, not persisted)
 * @param email - Email to remove from admin list
 */
export function removeAdminEmail(email: string): void {
  const index = ADMIN_EMAILS.indexOf(email);
  if (index > -1) {
    ADMIN_EMAILS.splice(index, 1);
  }
}
