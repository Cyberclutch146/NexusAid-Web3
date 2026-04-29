/**
 * Get the user's avatar URL
 * Returns the Cloudinary uploaded profile picture, or a default avatar if not available
 */
export function getUserAvatar(avatarUrl: string | undefined | null, displayName?: string): string {
  // If there's a valid Cloudinary/uploaded avatar URL, use it
  if (avatarUrl && avatarUrl.trim() !== '') {
    return avatarUrl;
  }
  
  // Return default avatar
  return DEFAULT_AVATAR;
}

/**
 * Default avatar when no profile picture is uploaded
 */
export const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&h=200&q=80';

/**
 * Get initials from display name for fallback display
 */
export function getInitials(displayName: string | undefined | null): string {
  if (!displayName || displayName.trim() === '') {
    return 'U';
  }
  return displayName.charAt(0).toUpperCase();
}