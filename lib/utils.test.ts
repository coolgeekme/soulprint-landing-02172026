import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn() class name utility', () => {
  it('merges multiple class names', () => {
    const result = cn('text-base', 'font-bold', 'text-blue-500');
    expect(result).toBe('text-base font-bold text-blue-500');
  });

  it('handles conditional classes (false values excluded)', () => {
    const isActive = false;
    const result = cn('base-class', isActive && 'active-class', 'always-here');
    expect(result).toBe('base-class always-here');

    const result2 = cn('base-class', true && 'included', 'end');
    expect(result2).toBe('base-class included end');
  });

  it('handles undefined and null values', () => {
    const result = cn('text-base', undefined, null, 'text-blue-500');
    expect(result).toBe('text-base text-blue-500');
  });

  it('deduplicates conflicting Tailwind classes (last wins)', () => {
    const result = cn('p-4', 'p-8');
    expect(result).toBe('p-8');

    const result2 = cn('mt-2', 'mt-4', 'mt-6');
    expect(result2).toBe('mt-6');
  });

  it('deduplicates conflicting color classes', () => {
    const result = cn('bg-red-500', 'bg-blue-500');
    expect(result).toBe('bg-blue-500');

    const result2 = cn('text-gray-500', 'text-green-400', 'text-purple-600');
    expect(result2).toBe('text-purple-600');
  });

  it('returns empty string for no arguments', () => {
    const result = cn();
    expect(result).toBe('');
  });

  it('handles array-style class names via clsx', () => {
    const result = cn(['text-base', 'font-bold'], 'text-blue-500');
    expect(result).toBe('text-base font-bold text-blue-500');

    const result2 = cn(['p-4', 'p-8']); // Should deduplicate
    expect(result2).toBe('p-8');
  });
});
