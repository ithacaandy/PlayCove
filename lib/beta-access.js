// Fail closed when beta access is enabled but cannot be verified.
export async function checkBetaAccess(supabase, enabled) {
  if (!enabled) return { allowed: true, unavailable: false };
  try {
    const { data, error } = await supabase.rpc('my_beta_access');
    return { allowed: !error && data === true, unavailable: !!error };
  } catch {
    return { allowed: false, unavailable: true };
  }
}
