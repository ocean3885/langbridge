function parseCsvEnv(value: string | undefined): Set<string> {
  if (!value) return new Set();
  return new Set(
    value
      .split(',')
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function getConfiguredSuperAdminUserIds(): string[] {
  return Array.from(parseCsvEnv(process.env.SUPER_ADMIN_USER_IDS));
}

export async function isSuperAdmin(input: {
  userId: string;
  email?: string | null;
}): Promise<boolean> {
  const email = input.email?.trim().toLowerCase() ?? null;

  const envAdminIds = new Set(getConfiguredSuperAdminUserIds());
  const envAdminEmails = parseCsvEnv(process.env.SUPER_ADMIN_EMAILS);

  const matchedById = envAdminIds.has(input.userId.toLowerCase());
  const matchedByEmail = email ? envAdminEmails.has(email) : false;

  return matchedById || matchedByEmail;
}
