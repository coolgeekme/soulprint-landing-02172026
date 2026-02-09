/**
 * Quality Refinement Background Cron Job
 *
 * Runs daily to find and improve low-quality soulprint sections.
 * Processes max 10 profiles per run (5 unscored + 5 low-quality).
 *
 * Phase 4: Quality Scoring - Automatic quality improvement
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  calculateQualityBreakdown,
  hasLowQualityScores,
  scoreSoulprintSection,
  getLowQualitySections,
  QualityBreakdown,
  SectionType,
} from '@/lib/evaluation/quality-scoring';

// Lazy initialization to avoid build-time errors
let _supabaseAdmin: SupabaseClient | null = null;
function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
  }
  return _supabaseAdmin;
}

interface RLMSoulprintResponse {
  soulprint: string;
  archetype: string;
  soul_md: string;
  identity_md: string;
  agents_md: string;
  user_md: string;
  tools_md: string;
  memory_log: string;
  conversation_count: number;
}

interface ProfileWithQuality {
  user_id: string;
  soul_md: string | null;
  identity_md: string | null;
  user_md: string | null;
  agents_md: string | null;
  tools_md: string | null;
  quality_breakdown: QualityBreakdown | null;
}

interface RefinementResult {
  user_id: string;
  sections_refined: string[];
  error?: string;
}

export async function GET(req: NextRequest) {
  // Verify cron secret (optional but recommended)
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Allow in development or if no secret set
    if (process.env.NODE_ENV === 'production' && process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = getSupabaseAdmin();
  const results: RefinementResult[] = [];
  let profilesChecked = 0;
  let sectionsRefined = 0;
  const errors: string[] = [];

  try {
    console.log('[QualityRefinement] Cron job started');

    // ============================================
    // STEP 1: Find profiles needing attention
    // ============================================

    // 1a. Unscored profiles (quality_breakdown IS NULL)
    const { data: unscoredProfiles, error: unscoredError } = await supabase
      .from('user_profiles')
      .select('user_id, soul_md, identity_md, user_md, agents_md, tools_md, quality_breakdown')
      .is('quality_breakdown', null)
      .in('import_status', ['quick_ready', 'complete'])
      .limit(5);

    if (unscoredError) {
      console.error('[QualityRefinement] Failed to fetch unscored profiles:', unscoredError);
      errors.push(`Unscored query failed: ${unscoredError.message}`);
    }

    // 1b. Low-quality profiles (any metric below 60)
    const { data: lowQualityUserIds, error: lowQualityError } = await supabase.rpc(
      'find_low_quality_profiles',
      { threshold_score: 60 }
    );

    if (lowQualityError) {
      console.error('[QualityRefinement] Failed to fetch low-quality profiles:', lowQualityError);
      errors.push(`Low-quality query failed: ${lowQualityError.message}`);
    }

    // Fetch full profiles for low-quality users
    let lowQualityProfiles: ProfileWithQuality[] = [];
    if (lowQualityUserIds && lowQualityUserIds.length > 0) {
      const userIds = lowQualityUserIds.slice(0, 5).map((row: { user_id: string }) => row.user_id);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, soul_md, identity_md, user_md, agents_md, tools_md, quality_breakdown')
        .in('user_id', userIds);

      if (error) {
        console.error('[QualityRefinement] Failed to fetch low-quality profile details:', error);
        errors.push(`Low-quality details fetch failed: ${error.message}`);
      } else {
        lowQualityProfiles = (data || []) as ProfileWithQuality[];
      }
    }

    const allProfiles = [
      ...(unscoredProfiles || []),
      ...lowQualityProfiles,
    ].slice(0, 10); // Max 10 profiles per run

    console.log('[QualityRefinement] Found profiles to process:', {
      unscored: unscoredProfiles?.length || 0,
      lowQuality: lowQualityProfiles.length,
      total: allProfiles.length,
    });

    if (allProfiles.length === 0) {
      return NextResponse.json({
        message: 'No profiles need refinement',
        profiles_checked: 0,
        sections_refined: 0,
        errors: errors.length > 0 ? errors : undefined,
      });
    }

    // ============================================
    // STEP 2: Process each profile
    // ============================================

    for (const profile of allProfiles) {
      profilesChecked++;

      try {
        console.log(`[QualityRefinement] Processing ${profile.user_id}`);

        // For unscored profiles, calculate quality first
        let qualityBreakdown: QualityBreakdown | null = profile.quality_breakdown;

        if (!qualityBreakdown) {
          console.log(`[QualityRefinement] Scoring unscored profile ${profile.user_id}`);

          qualityBreakdown = await calculateQualityBreakdown({
            soul_md: profile.soul_md,
            identity_md: profile.identity_md,
            user_md: profile.user_md,
            agents_md: profile.agents_md,
            tools_md: profile.tools_md,
          });

          // Save initial scores
          await supabase
            .from('user_profiles')
            .update({
              quality_breakdown: qualityBreakdown,
              quality_scored_at: new Date().toISOString(),
            })
            .eq('user_id', profile.user_id);

          console.log(`[QualityRefinement] Initial scoring complete for ${profile.user_id}`);
        }

        // Check if refinement is needed
        if (!hasLowQualityScores(qualityBreakdown, 60)) {
          console.log(`[QualityRefinement] Profile ${profile.user_id} has good quality, skipping`);
          results.push({
            user_id: profile.user_id,
            sections_refined: [],
          });
          continue;
        }

        // Identify which sections need refinement
        const lowQualitySections = getLowQualitySections(qualityBreakdown, 60);
        const sectionsToRefine = Array.from(new Set(lowQualitySections.map(s => s.section)));

        console.log(`[QualityRefinement] Profile ${profile.user_id} needs refinement:`, {
          sections: sectionsToRefine,
          details: lowQualitySections,
        });

        // ============================================
        // STEP 3: Refine low-quality sections via RLM
        // ============================================

        // Get conversation chunks for context
        const { data: chunks, error: chunksError } = await supabase
          .from('conversation_chunks')
          .select('content')
          .eq('user_id', profile.user_id)
          .limit(50);

        if (chunksError || !chunks || chunks.length === 0) {
          console.warn(`[QualityRefinement] No chunks found for ${profile.user_id}, skipping refinement`);
          results.push({
            user_id: profile.user_id,
            sections_refined: [],
            error: 'No conversation chunks available',
          });
          continue;
        }

        // Call RLM to regenerate ALL sections (we'll extract only what we need)
        const rlmUrl = process.env.RLM_SERVICE_URL || 'https://soulprint-landing.onrender.com';

        console.log(`[QualityRefinement] Calling RLM for ${profile.user_id}...`);

        const response = await fetch(`${rlmUrl}/create-soulprint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            conversations: chunks.map(c => c.content),
            user_id: profile.user_id,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`RLM call failed: ${response.status} - ${errorText}`);
        }

        const rlmResult: RLMSoulprintResponse = await response.json();

        // Map section types to RLM response fields
        const sectionFieldMap: Record<SectionType, keyof RLMSoulprintResponse> = {
          soul: 'soul_md',
          identity: 'identity_md',
          user: 'user_md',
          agents: 'agents_md',
          tools: 'tools_md',
        };

        // Extract and score only the refined sections
        const updates: Record<string, unknown> = {};
        const refinedSections: string[] = [];
        const newQualityBreakdown = { ...qualityBreakdown };

        for (const sectionType of sectionsToRefine) {
          const fieldName = sectionFieldMap[sectionType];
          const refinedContent = rlmResult[fieldName] as string;

          if (!refinedContent || typeof refinedContent !== 'string') {
            console.warn(`[QualityRefinement] RLM did not return ${sectionType} section, skipping`);
            continue;
          }

          // Re-score the refined section
          const newScore = await scoreSoulprintSection(sectionType as SectionType, refinedContent);

          // Update the section content and quality score
          updates[fieldName] = refinedContent;
          newQualityBreakdown[sectionType] = newScore;
          refinedSections.push(sectionType);
          sectionsRefined++;

          console.log(`[QualityRefinement] Refined ${sectionType} for ${profile.user_id}:`, {
            old: qualityBreakdown[sectionType],
            new: newScore,
          });
        }

        // ============================================
        // STEP 4: Update database atomically
        // ============================================

        if (refinedSections.length > 0) {
          updates.quality_breakdown = newQualityBreakdown;
          updates.quality_scored_at = new Date().toISOString();

          const { error: updateError } = await supabase
            .from('user_profiles')
            .update(updates)
            .eq('user_id', profile.user_id);

          if (updateError) {
            throw new Error(`Database update failed: ${updateError.message}`);
          }

          console.log(`[QualityRefinement] Successfully refined ${profile.user_id}:`, refinedSections);
        }

        results.push({
          user_id: profile.user_id,
          sections_refined: refinedSections,
        });

      } catch (profileError) {
        const errorMsg = profileError instanceof Error ? profileError.message : String(profileError);
        console.error(`[QualityRefinement] Profile ${profile.user_id} failed:`, profileError);

        errors.push(`${profile.user_id}: ${errorMsg}`);
        results.push({
          user_id: profile.user_id,
          sections_refined: [],
          error: errorMsg,
        });
      }
    }

    console.log('[QualityRefinement] Cron job completed', {
      profiles_checked: profilesChecked,
      sections_refined: sectionsRefined,
      errors: errors.length,
    });

    return NextResponse.json({
      message: 'Quality refinement completed',
      profiles_checked: profilesChecked,
      sections_refined: sectionsRefined,
      results,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error) {
    console.error('[QualityRefinement] Cron job failed:', error);
    return NextResponse.json(
      {
        error: 'Quality refinement failed',
        details: error instanceof Error ? error.message : String(error),
        profiles_checked: profilesChecked,
        sections_refined: sectionsRefined,
      },
      { status: 500 }
    );
  }
}
