/**
 * Regular Expression Utilities
 * 
 * Safely escapes all special regex characters from user-provided, model-generated,
 * or variable names (character names, prop names, location keys, styles).
 */

export function escapeRegExp(str: string): string {
    if (!str || typeof str !== 'string') return '';
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
