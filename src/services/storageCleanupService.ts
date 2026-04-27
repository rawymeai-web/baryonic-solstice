import { supabase } from '../utils/supabaseClient';

const IMAGES_BUCKET = 'images';
const COMPLETED_STATUSES = ['Completed', 'delivered', 'shipped', 'sent_to_print'];
const PURGEABLE_STATUSES = ['cancelled', 'failed', 'draft', 'Draft Intent', 'pending_payment'];
const DAYS_BEFORE_PURGE = 7;

export interface CleanupTarget {
  orderNumber: string;
  status: string;
  createdAt: string;
  reason: 'cancelled_order' | 'completed_old';
  estimatedFiles: number;
}

export interface CleanupResult {
  orderNumber: string;
  deletedFiles: string[];
  skippedFiles: string[];
  error?: string;
}

export interface CleanupSummary {
  targets: CleanupTarget[];
  results: CleanupResult[];
  totalDeleted: number;
  totalSkipped: number;
  totalErrors: number;
}

/**
 * Lists all files in the images bucket for a given order folder.
 * Returns paths of files that are safe to delete (spreads & cover).
 * NEVER deletes dna_image_url files — those are kept in heroes table separately.
 */
async function listOrderFiles(orderNumber: string): Promise<{ deletable: string[]; protected: string[] }> {
  const { data, error } = await supabase.storage
    .from(IMAGES_BUCKET)
    .list(orderNumber, { limit: 100 });

  if (error || !data) {
    return { deletable: [], protected: [] };
  }

  const deletable: string[] = [];
  const protectedFiles: string[] = [];

  for (const file of data) {
    const fullPath = `${orderNumber}/${file.name}`;
    // Protect DNA/character reference images (used for re-generation)
    if (file.name.includes('dna') || file.name.includes('character') || file.name.includes('ref')) {
      protectedFiles.push(fullPath);
    } else {
      // Spread illustrations and cover images — safe to delete
      deletable.push(fullPath);
    }
  }

  return { deletable, protected: protectedFiles };
}

/**
 * Scans all orders and returns those eligible for cleanup.
 * Does NOT delete anything — just reports.
 */
export async function scanForCleanup(): Promise<CleanupTarget[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('order_number, status, created_at')
    .order('created_at', { ascending: false });

  if (error || !orders) {
    console.error('Failed to fetch orders for cleanup scan:', error);
    return [];
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_BEFORE_PURGE);

  const targets: CleanupTarget[] = [];

  for (const order of orders) {
    const orderDate = new Date(order.created_at);
    const isCancelled = PURGEABLE_STATUSES.includes(order.status);
    const isOldCompleted =
      COMPLETED_STATUSES.includes(order.status) && orderDate < cutoffDate;

    if (!isCancelled && !isOldCompleted) continue;

    // Estimate file count (avoid listing every order — just flag it)
    targets.push({
      orderNumber: order.order_number,
      status: order.status,
      createdAt: order.created_at,
      reason: isCancelled ? 'cancelled_order' : 'completed_old',
      estimatedFiles: isCancelled ? 10 : 10, // cover + ~9 spreads
    });
  }

  return targets;
}

/**
 * Runs a dry-run and returns what WOULD be deleted, without deleting.
 */
export async function dryRunCleanup(targets: CleanupTarget[]): Promise<{
  orderNumber: string;
  willDelete: string[];
  willKeep: string[];
}[]> {
  const preview: { orderNumber: string; willDelete: string[]; willKeep: string[] }[] = [];

  for (const target of targets) {
    const { deletable, protected: keep } = await listOrderFiles(target.orderNumber);
    preview.push({
      orderNumber: target.orderNumber,
      willDelete: deletable,
      willKeep: keep,
    });
  }

  return preview;
}

/**
 * Deletes image files from the storage bucket for the given order.
 * Keeps DNA/character reference files.
 * Returns the result for logging.
 */
async function purgeOrderImages(orderNumber: string): Promise<CleanupResult> {
  const { deletable, protected: skipped } = await listOrderFiles(orderNumber);

  if (deletable.length === 0) {
    return { orderNumber, deletedFiles: [], skippedFiles: skipped };
  }

  const { error } = await supabase.storage
    .from(IMAGES_BUCKET)
    .remove(deletable);

  if (error) {
    return { orderNumber, deletedFiles: [], skippedFiles: skipped, error: error.message };
  }

  return { orderNumber, deletedFiles: deletable, skippedFiles: skipped };
}

/**
 * Executes the cleanup for all given targets.
 * Reports back per-order results.
 */
export async function executeCleanup(
  targets: CleanupTarget[],
  onProgress?: (current: number, total: number, orderNumber: string) => void
): Promise<CleanupSummary> {
  const results: CleanupResult[] = [];

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    onProgress?.(i + 1, targets.length, target.orderNumber);
    const result = await purgeOrderImages(target.orderNumber);
    results.push(result);
  }

  const totalDeleted = results.reduce((sum, r) => sum + r.deletedFiles.length, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.skippedFiles.length, 0);
  const totalErrors = results.filter(r => r.error).length;

  return { targets, results, totalDeleted, totalSkipped, totalErrors };
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE-BASED FULL PURGE  (images + DB rows)
// ─────────────────────────────────────────────────────────────────────────────

export interface DatePurgeScanResult {
  orderCount: number;
  orderNumbers: string[];
  cutoffLabel: string;  // human-readable, e.g. "26 Mar 2026"
}

export interface DatePurgeProgress {
  stage: 'images' | 'records';
  current: number;
  total: number;
  orderNumber: string;
}

export interface DatePurgeSummary {
  deletedImageFiles: number;
  deletedOrderRows: number;
  errors: string[];
}

/**
 * Dry-run: returns all orders created BEFORE the given cutoff date.
 * Nothing is deleted.
 */
export async function scanDatePurge(cutoffDate: Date): Promise<DatePurgeScanResult> {
  const iso = cutoffDate.toISOString();
  const { data, error } = await supabase
    .from('orders')
    .select('order_number')
    .lt('created_at', iso)
    .order('created_at', { ascending: true });

  if (error || !data) throw new Error(error?.message || 'Failed to query orders');

  const label = cutoffDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return {
    orderCount: data.length,
    orderNumbers: data.map(o => o.order_number),
    cutoffLabel: label,
  };
}

/**
 * Full purge: deletes all bucket images then all DB rows for orders
 * created before the given cutoff date.
 * Calls onProgress at each step.
 */
export async function executeDatePurge(
  scan: DatePurgeScanResult,
  onProgress?: (p: DatePurgeProgress) => void
): Promise<DatePurgeSummary> {
  const errors: string[] = [];
  let deletedImageFiles = 0;
  let deletedOrderRows = 0;

  const total = scan.orderNumbers.length;

  // ── Step 1: Delete bucket images for each order ──
  for (let i = 0; i < total; i++) {
    const orderNumber = scan.orderNumbers[i];
    onProgress?.({ stage: 'images', current: i + 1, total, orderNumber });

    try {
      const { data: files } = await supabase.storage
        .from(IMAGES_BUCKET)
        .list(orderNumber, { limit: 200 });

      if (files && files.length > 0) {
        const paths = files.map(f => `${orderNumber}/${f.name}`);
        const { error } = await supabase.storage.from(IMAGES_BUCKET).remove(paths);
        if (error) {
          errors.push(`[images] ${orderNumber}: ${error.message}`);
        } else {
          deletedImageFiles += paths.length;
        }
      }
    } catch (e: any) {
      errors.push(`[images] ${orderNumber}: ${e.message}`);
    }
  }

  // ── Step 2: Delete order_jobs rows first (FK constraint) ──
  for (let i = 0; i < total; i++) {
    const orderNumber = scan.orderNumbers[i];
    onProgress?.({ stage: 'records', current: i + 1, total, orderNumber });

    try {
      // Remove dependent jobs
      await supabase.from('order_jobs').delete().eq('order_id', orderNumber);
    } catch (_) { /* non-critical */ }
  }

  // ── Step 3: Delete order rows ONE AT A TIME to avoid statement timeout ──
  // Supabase anon key has ~30s timeout; batching large JSONB rows exceeds it.
  for (let i = 0; i < total; i++) {
    const orderNumber = scan.orderNumbers[i];
    onProgress?.({ stage: 'records', current: i + 1, total, orderNumber });

    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('order_number', orderNumber);

    if (error) {
      errors.push(`[db] ${orderNumber}: ${error.message}`);
    } else {
      deletedOrderRows++;
    }
  }

  return { deletedImageFiles, deletedOrderRows, errors };
}
