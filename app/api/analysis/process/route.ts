import { NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Questionnaire from "@/models/Questionnaire";
import RiskAnalysis from "@/models/RiskAnalysis";
import { performRiskAnalysis } from "@/lib/services/riskAnalyzer";

export async function POST(request: Request) {
  try {

    const { questionnaireId } = await request.json();

    if (!questionnaireId) {
      return NextResponse.json({
        success: false,
        error: "Questionnaire ID is required"
      }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: "OPENROUTER_API_KEY not configured"
      }, { status: 500 });
    }

    await dbConnect();

    const questionnaire = await Questionnaire.findById(questionnaireId);
    if (!questionnaire) {
      return NextResponse.json({
        success: false,
        error: "Questionnaire not found"
      }, { status: 404 });
    }

    const existingAnalysis = await RiskAnalysis.findOne({ questionnaireId });
    if (existingAnalysis) {
      return NextResponse.json({
        success: false,
        error: "This questionnaire has already been analyzed. View results in the Processed Assessments section."
      }, { status: 400 });
    }

    console.log(` Starting analysis for questionnaire: ${questionnaireId}`);
    console.log(` Total questions: ${questionnaire.questions?.length || 0}`);

    // check if questionnaire has a category 
    const inferCategoryFromQuestions = (questions: { level?: string }[] | undefined): 'operational' | 'tactical' | 'strategic' => {
      if (!questions || questions.length === 0) return 'operational';
      const counts: Record<'operational' | 'tactical' | 'strategic', number> = { operational: 0, tactical: 0, strategic: 0 };
      for (const q of questions) {
        const lvl = q?.level ? String(q.level).toLowerCase() : '';
        if (lvl === 'operational' || lvl === 'tactical' || lvl === 'strategic') {
          counts[lvl as 'operational' | 'tactical' | 'strategic']++;
        }
      }
      const sorted = (Object.entries(counts) as [string, number][]).sort((a, b) => b[1] - a[1]);
      return (sorted[0] && (sorted[0][0] as 'operational' | 'tactical' | 'strategic')) || 'operational';
    };

    const categoryToUse = questionnaire.category || inferCategoryFromQuestions(questionnaire.questions);
    if (!questionnaire.category) {
      questionnaire.category = categoryToUse;
    }

    if (!questionnaire.questions || questionnaire.questions.length === 0) {
      return NextResponse.json({
        success: false,
        error: "No questions found in this questionnaire"
      }, { status: 400 });
    }

    const { acquireAnalysisLock, releaseAnalysisLock } = await import('@/lib/services/analysisLock');
    const lock = await acquireAnalysisLock(String(questionnaire._id));
    if (!lock || !lock.acquired) {
      return NextResponse.json({ success: false, error: 'Analysis already in progress for this questionnaire' }, { status: 409 });
    }

    let analysisResults: any;
    const questionnaireIdStr = String(questionnaire._id);

    try {
      console.log(`🔒 Analysis lock acquired for questionnaire: ${questionnaireIdStr}`);

      // Add timeout wrapper (5 minutes max)
      const ANALYSIS_TIMEOUT = 5 * 60 * 1000; // 5 minutes
      const analysisPromise = performRiskAnalysis(questionnaire.questions, apiKey);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Analysis timeout: exceeded 5 minutes')), ANALYSIS_TIMEOUT)
      );

      analysisResults = await Promise.race([analysisPromise, timeoutPromise]);
      console.log(`✅ Analysis completed successfully for questionnaire: ${questionnaireIdStr}`);

    } catch (analysisError) {
      console.error(`❌ Analysis failed for questionnaire ${questionnaireIdStr}:`, analysisError);
      throw analysisError;
    } finally {
      // Ensure lock is always released
      try {
        await releaseAnalysisLock(questionnaireIdStr);
        console.log(`🔓 Analysis lock released for questionnaire: ${questionnaireIdStr}`);
      } catch (lockError) {
        console.error(`❌ Failed to release analysis lock for ${questionnaireIdStr}:`, lockError);
        // Force release by directly updating the lock in database if needed
        // This prevents permanent locks
      }
    }

    const riskAnalysis = new RiskAnalysis({
      questionnaireId: questionnaire._id,
      company: questionnaire.company,
      category: categoryToUse,
      metadata: analysisResults.metadata,
      operational: analysisResults.operational,
      tactical: analysisResults.tactical,
      strategic: analysisResults.strategic,
      summary: analysisResults.summary
    });

    await riskAnalysis.save();

    questionnaire.status = 'analyzed';
    await questionnaire.save();

    console.log(` Analysis completed for questionnaire: ${questionnaireId}`);

    // Register assessment — non-blocking, won't affect analysis result
    try {
      const { registerAssessment } = await import('@/lib/services/registrationService');
      const reg = await registerAssessment({
        questionnaireId: String(questionnaire._id),
        analysisId: String(riskAnalysis._id),
        company: questionnaire.company,
        summary: analysisResults.summary,
      });
      if (reg.success) {
        console.log(`✅ Assessment registered: ${reg.certificateNumber}`);
      } else {
        console.warn(`⚠️ Assessment registration returned unsuccessful: ${reg.error || 'Unknown error'}`);
      }
    } catch (regErr) {
      console.error('❌ Registration step failed (non-critical):', regErr instanceof Error ? regErr.message : regErr);
    }

    // Send notifications — non-blocking
    try {
      const { notifyAnalysisComplete, notifyCriticalRisk } = await import('@/lib/services/notificationService');
      const overall = analysisResults.summary?.overall;
      const overallRisk = overall?.riskDistribution?.CRITICAL > 0 ? 'CRITICAL' :
        overall?.riskDistribution?.HIGH > 0 ? 'HIGH' :
          overall?.riskDistribution?.MEDIUM > 0 ? 'MEDIUM' : 'LOW';

      await notifyAnalysisComplete({
        company: questionnaire.company,
        analysisId: String(riskAnalysis._id),
        overallRisk,
      });
      console.log(`✅ Analysis completion notification sent`);

      if (overall?.riskDistribution?.CRITICAL > 0) {
        await notifyCriticalRisk({
          company: questionnaire.company,
          analysisId: String(riskAnalysis._id),
          criticalCount: overall.riskDistribution.CRITICAL,
        });
        console.log(`✅ Critical risk notification sent (${overall.riskDistribution.CRITICAL} critical risks)`);
      }
    } catch (notifErr) {
      console.error('❌ Notification failed (non-critical):', notifErr instanceof Error ? notifErr.message : notifErr);
    }

    return NextResponse.json({
      success: true,
      message: "Analysis completed successfully",
      analysisId: String(riskAnalysis._id),
      summary: analysisResults.summary.overall
    });

  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error(" Error processing analysis:", errMsg);
    return NextResponse.json({
      success: false,
      error: errMsg || "Failed to process analysis"
    }, { status: 500 });
  }
}
