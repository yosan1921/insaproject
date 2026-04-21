import { NextResponse } from "next/server";
import { AnalysisService } from "@/lib/services/updateanalysisService";

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const {
      analysisId,
      level,
      questionId,
      likelihood,
      impact,
      gap,
      threat,
      mitigation,
      impactLabel,
      likelihoodLabel,
      impactDescription,
      // New fields
      riskName,
      description,
      status,
      riskType,
      threatOpportunity,
      assignedTo,
      preMitigationProbability,
      preMitigationImpact,
      preMitigationCost,
      postMitigationProbability,
      postMitigationImpact,
      postMitigationCost,
      mitigationCost,
    } = body;

    if (!analysisId || !level || typeof questionId !== "number") {
      return NextResponse.json(
        { error: "analysisId, level and questionId are required" },
        { status: 400 }
      );
    }

    // Validate numeric inputs
    if (likelihood !== undefined && (likelihood < 1 || likelihood > 5)) {
      return NextResponse.json(
        { error: "likelihood must be between 1 and 5" },
        { status: 400 }
      );
    }
    if (impact !== undefined && (impact < 1 || impact > 5)) {
      return NextResponse.json(
        { error: "impact must be between 1 and 5" },
        { status: 400 }
      );
    }
    if (preMitigationProbability !== undefined && (preMitigationProbability < 0 || preMitigationProbability > 100)) {
      return NextResponse.json(
        { error: "preMitigationProbability must be between 0 and 100" },
        { status: 400 }
      );
    }
    if (preMitigationImpact !== undefined && (preMitigationImpact < 0 || preMitigationImpact > 100)) {
      return NextResponse.json(
        { error: "preMitigationImpact must be between 0 and 100" },
        { status: 400 }
      );
    }
    if (postMitigationProbability !== undefined && (postMitigationProbability < 0 || postMitigationProbability > 100)) {
      return NextResponse.json(
        { error: "postMitigationProbability must be between 0 and 100" },
        { status: 400 }
      );
    }
    if (postMitigationImpact !== undefined && (postMitigationImpact < 0 || postMitigationImpact > 100)) {
      return NextResponse.json(
        { error: "postMitigationImpact must be between 0 and 100" },
        { status: 400 }
      );
    }
    if (preMitigationCost !== undefined && preMitigationCost < 0) {
      return NextResponse.json(
        { error: "preMitigationCost must be >= 0" },
        { status: 400 }
      );
    }
    if (postMitigationCost !== undefined && postMitigationCost < 0) {
      return NextResponse.json(
        { error: "postMitigationCost must be >= 0" },
        { status: 400 }
      );
    }
    if (mitigationCost !== undefined && mitigationCost < 0) {
      return NextResponse.json(
        { error: "mitigationCost must be >= 0" },
        { status: 400 }
      );
    }
    if (status && !['Open', 'Closed'].includes(status)) {
      return NextResponse.json(
        { error: "status must be 'Open' or 'Closed'" },
        { status: 400 }
      );
    }
    if (riskType && !['Risk', 'Issue'].includes(riskType)) {
      return NextResponse.json(
        { error: "riskType must be 'Risk' or 'Issue'" },
        { status: 400 }
      );
    }
    if (threatOpportunity && !['Threat', 'Opportunity'].includes(threatOpportunity)) {
      return NextResponse.json(
        { error: "threatOpportunity must be 'Threat' or 'Opportunity'" },
        { status: 400 }
      );
    }

    const updated = await AnalysisService.updateQuestionAnalysis({
      analysisId,
      level,
      questionId,
      likelihood,
      impact,
      gap,
      threat,
      mitigation,
      impactLabel,
      likelihoodLabel,
      impactDescription,
      // New fields
      riskName,
      description,
      status,
      riskType,
      threatOpportunity,
      assignedTo,
      preMitigationProbability,
      preMitigationImpact,
      preMitigationCost,
      postMitigationProbability,
      postMitigationImpact,
      postMitigationCost,
      mitigationCost,
    });

    if (!updated) {
      return NextResponse.json(
        { error: "Analysis or question not found" },
        { status: 404 }
      );
    }

    // Option A: return the full updated analysis document
    // Option B: re-use your processed shape – here is Option B:

    const allAnalyses = [
      ...(updated.operational || []),
      ...(updated.tactical || []),
      ...(updated.strategic || []),
    ];

    const riskMatrix: { [key: string]: number } = {};
    allAnalyses.forEach((item: any) => {
      const key = `${item.analysis.likelihood}-${item.analysis.impact}`;
      riskMatrix[key] = (riskMatrix[key] || 0) + 1;
    });

    const riskMatrixArray = Object.entries(riskMatrix).map(
      ([key, count]) => {
        const [likelihood, impact] = key.split("-").map(Number);
        return { likelihood, impact, count };
      }
    );

    const formattedAnalysis = {
      _id: String(updated._id),
      company: updated.company,
      category: updated.category,
      date: updated.createdAt,
      analyses: allAnalyses.map((a: any) => ({
        questionId: a.questionId,
        level: a.level,
        question: a.question,
        answer: a.answer,

        // New fields
        riskName: a.analysis?.riskName || '',
        description: a.analysis?.description || '',
        status: a.analysis?.status || 'Open',
        riskType: a.analysis?.riskType || 'Risk',
        threatOpportunity: a.analysis?.threatOpportunity || 'Threat',
        assignedTo: a.analysis?.assignedTo || '',

        // Pre-Mitigation
        preMitigationProbability: a.analysis?.preMitigation?.probability || 0,
        preMitigationImpact: a.analysis?.preMitigation?.impact || 0,
        preMitigationScore: a.analysis?.preMitigation?.score || 0,
        preMitigationCost: a.analysis?.preMitigation?.cost || 0,

        // Current values
        likelihood: a.analysis?.likelihood || 0,
        impact: a.analysis?.impact || 0,
        riskScore: a.analysis?.riskScore || 0,
        riskLevel: a.analysis?.riskLevel || "UNKNOWN",

        // Post-Mitigation
        postMitigationProbability: a.analysis?.postMitigation?.probability || 0,
        postMitigationImpact: a.analysis?.postMitigation?.impact || 0,
        postMitigationScore: a.analysis?.postMitigation?.score || 0,
        postMitigationCost: a.analysis?.postMitigation?.cost || 0,

        // Mitigation details
        mitigationCost: a.analysis?.mitigationCost || 0,
        gap: a.analysis?.gap || "",
        threat: a.analysis?.threat || "",
        mitigation: a.analysis?.mitigation || "",
        impactLabel: a.analysis?.impactLabel || "",
        impactDescription: a.analysis?.impactDescription || "",
      })),
      riskMatrix: riskMatrixArray,
      summary: updated.summary,
    };

    return NextResponse.json({
      success: true,
      assessment: formattedAnalysis,
    });
  } catch (error) {
    console.error("❌ Error updating processed analysis:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message || "Failed to update analysis" },
      { status: 500 }
    );
  }
}
