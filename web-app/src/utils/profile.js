export function getUserDisplayName(user) {
  return user?.name || user?.email || user?.phone || 'Customer';
}

export function getUserInitials(user) {
  const source = user?.name || user?.email || user?.phone || 'Customer';
  const parts = source
    .replace(/@.*/, '')
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
}

export function getUserProfileImage(user) {
  return user?.profileImageUrl || user?.avatarUrl || user?.imageUrl || user?.photoUrl || null;
}
