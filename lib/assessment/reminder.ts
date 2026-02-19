/**
 * Assessment Reminder System
 * 
 * Tracks whether users completed or skipped the pillars assessment
 * and provides reminder logic for the chat experience.
 */

export type AssessmentStatus = 'complete' | 'skipped' | 'never_ask' | 'not_started';

export function getAssessmentStatus(): AssessmentStatus {
  if (typeof window === 'undefined') return 'not_started';
  
  const complete = localStorage.getItem('soulprint_pillars_complete');
  const skipped = localStorage.getItem('soulprint_pillars_skipped');
  const neverAsk = localStorage.getItem('soulprint_pillars_never_ask');
  
  if (complete === 'true') return 'complete';
  if (neverAsk === 'true') return 'never_ask';
  if (skipped === 'true') return 'skipped';
  return 'not_started';
}

export function setNeverAskAgain(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('soulprint_pillars_never_ask', 'true');
}

export function getMessagesSinceSkip(): number {
  if (typeof window === 'undefined') return 0;
  const count = localStorage.getItem('soulprint_messages_since_skip');
  return count ? parseInt(count, 10) : 0;
}

export function incrementMessageCount(): number {
  if (typeof window === 'undefined') return 0;
  const current = getMessagesSinceSkip();
  const newCount = current + 1;
  localStorage.setItem('soulprint_messages_since_skip', String(newCount));
  return newCount;
}

export function resetMessageCount(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('soulprint_messages_since_skip', '0');
}

export function shouldShowReminder(): boolean {
  const status = getAssessmentStatus();
  if (status !== 'skipped') return false;
  
  const messageCount = getMessagesSinceSkip();
  // Show reminder after 5 messages, then every 20 messages
  if (messageCount === 5) return true;
  if (messageCount > 5 && messageCount % 20 === 0) return true;
  return false;
}

export function getWelcomeMessage(aiName: string): string {
  const status = getAssessmentStatus();
  
  if (status === 'skipped') {
    return `Hey! I'm ${aiName}. I've got your memories loaded and I'm ready to learn more about you as we chat. Whenever you're ready, just say "let's do the assessment" and we can fill out your SoulPrint profile together. What's on your mind?`;
  }
  
  return `Hey! I'm ${aiName}. I've got your memories loaded. What's on your mind?`;
}

export function getReminderMessage(): string {
  return `By the way, I can understand you better if we do that quick assessment together. Just say "let's do the assessment" whenever you're ready — or "never ask again" if you'd rather skip it permanently. 😊`;
}

export function getAssessmentPromptInjection(): string | null {
  const status = getAssessmentStatus();
  
  if (status === 'skipped') {
    return `[System note: User skipped the personality assessment during onboarding. You can learn about them through natural conversation. If they say "let's do the assessment" or similar, guide them through the 36 questions conversationally. If they say "never ask again" about the assessment, acknowledge and stop mentioning it.]`;
  }
  
  return null;
}
