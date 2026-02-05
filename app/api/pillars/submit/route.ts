/**
 * POST /api/pillars/submit
 * Save pillar answers (all 36 at once or incrementally)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import {
  PillarAnswer,
  validatePillarAnswer,
  getQuestionPillar,
  getQuestionType,
  QUESTIONS,
} from '@/lib/soulprint/types';

export const maxDuration = 30;

interface SubmitRequest {
  answers: Array<{
    questionIndex: number;
    value: number | string;
  }>;
}

export async function POST(request: NextRequest) {
  try {
    // Auth
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request
    const body: SubmitRequest = await request.json();
    const { answers } = body;

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'answers array required' },
        { status: 400 }
      );
    }

    // Validate and transform answers
    const pillarAnswers: PillarAnswer[] = [];
    const errors: string[] = [];

    for (const answer of answers) {
      const { questionIndex, value } = answer;
      
      if (questionIndex < 0 || questionIndex >= 36) {
        errors.push(`Invalid question index: ${questionIndex}`);
        continue;
      }

      const questionType = getQuestionType(questionIndex);
      const pillar = getQuestionPillar(questionIndex);

      const pillarAnswer: PillarAnswer = {
        questionIndex,
        pillar,
        questionType,
        sliderValue: questionType === 'slider' ? (value as number) : undefined,
        textValue: questionType === 'text' ? (value as string) : undefined,
      };

      const validationError = validatePillarAnswer(pillarAnswer);
      if (validationError) {
        errors.push(`Q${questionIndex}: ${validationError}`);
        continue;
      }

      pillarAnswers.push(pillarAnswer);
    }

    if (errors.length > 0 && pillarAnswers.length === 0) {
      return NextResponse.json(
        { success: false, error: 'All answers invalid', errors },
        { status: 400 }
      );
    }

    // Upsert answers to database
    const upsertData = pillarAnswers.map(a => ({
      user_id: user.id,
      question_index: a.questionIndex,
      pillar: a.pillar,
      question_type: a.questionType,
      slider_value: a.sliderValue ?? null,
      text_value: a.textValue ?? null,
    }));

    const { error: upsertError } = await supabase
      .from('pillar_answers')
      .upsert(upsertData, {
        onConflict: 'user_id,question_index',
      });

    if (upsertError) {
      console.error('[Pillars Submit] Database error:', upsertError);
      return NextResponse.json(
        { success: false, error: 'Failed to save answers', details: upsertError.message },
        { status: 500 }
      );
    }

    // Check if all 36 questions are answered
    const { count: answeredCount } = await supabase
      .from('pillar_answers')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id);

    const isComplete = (answeredCount || 0) >= 36;

    // Update user profile if complete
    if (isComplete) {
      await supabase
        .from('user_profiles')
        .upsert({
          user_id: user.id,
          pillars_completed: true,
          pillars_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' });
    }

    console.log(`[Pillars Submit] User ${user.id}: Saved ${pillarAnswers.length} answers, total ${answeredCount}/36`);

    return NextResponse.json({
      success: true,
      data: {
        answersStored: pillarAnswers.length,
        totalAnswered: answeredCount || 0,
        isComplete,
        errors: errors.length > 0 ? errors : undefined,
      },
    });

  } catch (error) {
    console.error('[Pillars Submit] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/pillars/submit
 * Get current pillar progress
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Get all answers
    const { data: answers, error } = await supabase
      .from('pillar_answers')
      .select('question_index, pillar, question_type, slider_value, text_value')
      .eq('user_id', user.id)
      .order('question_index');

    if (error) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch answers' },
        { status: 500 }
      );
    }

    // Calculate progress per pillar
    const pillarProgress: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const answer of answers || []) {
      pillarProgress[answer.pillar]++;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalAnswered: answers?.length || 0,
        isComplete: (answers?.length || 0) >= 36,
        pillarProgress,
        answers: answers?.map(a => ({
          questionIndex: a.question_index,
          value: a.question_type === 'slider' ? a.slider_value : a.text_value,
        })),
      },
    });

  } catch (error) {
    console.error('[Pillars Get] Error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
