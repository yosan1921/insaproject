import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import RiskAnalysis, { IRiskAnalysis, IQuestionAnalysis } from "@/models/RiskAnalysis";

export type AnalysisLevel = "operational" | "tactical" | "strategic";

export interface UpdateQuestionAnalysisInput {
  analysisId: string;
  level: AnalysisLevel;
  questionId: number;
  // Editable fields 
  likelihood?: number;
  impact?: number;
  gap?: string;
  threat?: string;
  mitigation?: string;
  impactLabel?: string;
  likelihoodLabel?: string;
  impactDescription?: string;

  // New fields
  riskName?: string;
  description?: string;
  status?: 'Open' | 'Closed';
  riskType?: 'Risk' | 'Issue';
  threatOpportunity?: 'Threat' | 'Opportunity';
  assignedTo?: string;

  // Pre-Mitigation
  preMitigationProbability?: number;
  preMitigationImpact?: number;
  preMitigationCost?: number;

  // Post-Mitigation
  postMitigationProbability?: number;
  postMitigationImpact?: number;
  postMitigationCost?: number;

  // Mitigation cost
  mitigationCost?: number;
}


function computeRiskScoreAndLevel(likelihood: number, impact: number) {
  const riskScore = (likelihood || 0) * (impact || 0);

  let riskLevel = "VERY_LOW";
  let riskColor = "#10b981"; // green

  if (riskScore >= 21) {
    riskLevel = "CRITICAL";
    riskColor = "#dc2626"; // red
  } else if (riskScore >= 16) {
    riskLevel = "HIGH";
    riskColor = "#ef4444"; // orange-red
  } else if (riskScore >= 9) {
    riskLevel = "MEDIUM";
    riskColor = "#f97316"; // orange
  } else if (riskScore >= 4) {
    riskLevel = "LOW";
    riskColor = "#f59e0b"; // amber
  }

  return { riskScore, riskLevel, riskColor };
}

export class AnalysisService {
  static async getById(analysisId: string): Promise<IRiskAnalysis | null> {
    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(analysisId)) {
      return null;
    }

    const doc = await RiskAnalysis.findById(analysisId);
    return doc;
  }

  static async updateQuestionAnalysis(
    input: UpdateQuestionAnalysisInput
  ): Promise<IRiskAnalysis | null> {
    const { analysisId, level, questionId } = input;

    await dbConnect();

    if (!mongoose.Types.ObjectId.isValid(analysisId)) {
      throw new Error("Invalid analysisId");
    }

    const analysis = await RiskAnalysis.findById(analysisId);
    if (!analysis) {
      return null;
    }

    const levelArray = analysis[level] as unknown as IQuestionAnalysis[];
    if (!Array.isArray(levelArray)) {
      throw new Error(`Invalid level array: ${level}`);
    }

    const item = levelArray.find((q) => q.questionId === questionId);
    if (!item) {
      return null;
    }

    // Apply partial updates
    if (typeof input.likelihood === "number") {
      item.analysis.likelihood = input.likelihood;
    }
    if (typeof input.impact === "number") {
      item.analysis.impact = input.impact;
    }
    if (typeof input.gap === "string") {
      item.analysis.gap = input.gap;
    }
    if (typeof input.threat === "string") {
      item.analysis.threat = input.threat;
    }
    if (typeof input.mitigation === "string") {
      item.analysis.mitigation = input.mitigation;
    }
    if (typeof input.impactLabel === "string") {
      item.analysis.impactLabel = input.impactLabel;
    }
    if (typeof input.likelihoodLabel === "string") {
      item.analysis.likelihoodLabel = input.likelihoodLabel;
    }
    if (typeof input.impactDescription === "string") {
      item.analysis.impactDescription = input.impactDescription;
    }

    // New fields
    if (typeof input.riskName === "string") {
      item.analysis.riskName = input.riskName;
    }
    if (typeof input.description === "string") {
      item.analysis.description = input.description;
    }
    if (input.status) {
      item.analysis.status = input.status;
    }
    if (input.riskType) {
      item.analysis.riskType = input.riskType;
    }
    if (input.threatOpportunity) {
      item.analysis.threatOpportunity = input.threatOpportunity;
    }
    if (typeof input.assignedTo === "string") {
      item.analysis.assignedTo = input.assignedTo;
    }

    // Pre-Mitigation
    if (!item.analysis.preMitigation) {
      item.analysis.preMitigation = { probability: 0, impact: 0, score: 0, cost: 0 };
    }
    if (typeof input.preMitigationProbability === "number") {
      item.analysis.preMitigation.probability = input.preMitigationProbability;
    }
    if (typeof input.preMitigationImpact === "number") {
      item.analysis.preMitigation.impact = input.preMitigationImpact;
    }
    if (typeof input.preMitigationCost === "number") {
      item.analysis.preMitigation.cost = input.preMitigationCost;
    }
    // Calculate pre-mitigation score
    item.analysis.preMitigation.score =
      (item.analysis.preMitigation.probability / 100) * (item.analysis.preMitigation.impact / 100) * 100;

    // Post-Mitigation
    if (!item.analysis.postMitigation) {
      item.analysis.postMitigation = { probability: 0, impact: 0, score: 0, cost: 0 };
    }
    if (typeof input.postMitigationProbability === "number") {
      item.analysis.postMitigation.probability = input.postMitigationProbability;
    }
    if (typeof input.postMitigationImpact === "number") {
      item.analysis.postMitigation.impact = input.postMitigationImpact;
    }
    if (typeof input.postMitigationCost === "number") {
      item.analysis.postMitigation.cost = input.postMitigationCost;
    }
    // Calculate post-mitigation score
    item.analysis.postMitigation.score =
      (item.analysis.postMitigation.probability / 100) * (item.analysis.postMitigation.impact / 100) * 100;

    // Mitigation cost
    if (typeof input.mitigationCost === "number") {
      item.analysis.mitigationCost = input.mitigationCost;
    }

    // Recompute derived fields if likelihood/impact changed
    const { likelihood, impact } = item.analysis;
    const { riskScore, riskLevel, riskColor } = computeRiskScoreAndLevel(
      likelihood,
      impact
    );
    item.analysis.riskScore = riskScore;
    item.analysis.riskLevel = riskLevel;
    item.analysis.riskColor = riskColor;

    await analysis.save();

    return analysis;
  }
}
