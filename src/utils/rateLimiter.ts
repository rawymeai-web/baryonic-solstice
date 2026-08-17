import { supabase } from '@/utils/supabaseClient';

/**
 * Checks if a request is within rate limits.
 * Default is 8 requests per hour per IP/Email.
 */
export async function checkRateLimit(
  ip: string, 
  email: string | null, 
  limit = 8, 
  windowHours = 1
): Promise<{ allowed: boolean; remaining: number; resetTime: Date }> {
  try {
    const timeWindow = new Date();
    timeWindow.setHours(timeWindow.getHours() - windowHours);
    
    // Construct OR query to match either same IP or same Email
    let orFilter = `details->>ip.eq.${ip}`;
    if (email && email.trim() !== '') {
      orFilter += `,details->>email.eq.${email}`;
    }

    const { data: logs, error } = await supabase
      .from('event_audit_log')
      .select('created_at')
      .eq('event_type', 'dna_generation_request')
      .or(orFilter)
      .gt('created_at', timeWindow.toISOString());

    if (error) {
      console.error('[RateLimiter] Database log fetch error:', error);
      // Fall open on db error to prevent blocking users
      return { allowed: true, remaining: 1, resetTime: new Date() };
    }

    const count = logs?.length || 0;
    const allowed = count < limit;
    const remaining = Math.max(0, limit - count);

    // Calculate reset time (when oldest query falls out of the window)
    let oldestLogTime = timeWindow;
    if (logs && logs.length > 0) {
      const times = logs.map(l => new Date(l.created_at).getTime());
      oldestLogTime = new Date(Math.min(...times));
    }
    const resetTime = new Date(oldestLogTime.getTime() + windowHours * 60 * 60 * 1000);

    return { allowed, remaining, resetTime };
  } catch (err) {
    console.error('[RateLimiter] Error verifying rate limits:', err);
    return { allowed: true, remaining: 1, resetTime: new Date() };
  }
}

/**
 * Logs a request event in the audit log for rate tracking.
 */
export async function logRequest(ip: string, email: string | null) {
  try {
    await supabase.from('event_audit_log').insert({
      event_type: 'dna_generation_request',
      details: { ip, email, timestamp: new Date().toISOString() }
    });
  } catch (err) {
    console.error('[RateLimiter] Failed to write event log:', err);
  }
}
