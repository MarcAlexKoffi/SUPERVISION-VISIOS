export function parseDate(date: any): Date {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  
  // Handle Firestore Timestamp format {_seconds, _nanoseconds}
  if (date._seconds !== undefined) return new Date(date._seconds * 1000);
  if (date.seconds !== undefined) return new Date(date.seconds * 1000);
  
  // Handle Firestore SDK Timestamp object (if somehow still present)
  if (date.toDate && typeof date.toDate === 'function') return date.toDate();
  
  // Handle ISO strings or other string formats
  if (typeof date === 'string') return new Date(date);
  
  return new Date(); // Fallback
}
