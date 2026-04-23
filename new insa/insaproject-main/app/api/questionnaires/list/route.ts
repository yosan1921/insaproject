import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Questionnaire from "@/models/Questionnaire";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const role = (session.user as any).role;
    const userId = (session.user as any).id;

    let questionnaireIds: any[] | null = null;

    // Staff and Risk Analyst: only see questionnaires linked to assigned analyses
    if (role === 'Staff' || role === 'Risk Analyst') {
      const mongoose = await import('mongoose');
      const { default: Assignment } = await import('@/models/Assignment');
      const { default: RiskAnalysis } = await import('@/models/RiskAnalysis');

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const assignments = await Assignment.find({ assignedTo: userObjectId }).select('analysisId').lean();
      const analysisIds = assignments.map((a: any) => a.analysisId);

      if (analysisIds.length === 0) {
        return NextResponse.json({ success: true, questionnaires: [] });
      }

      const analyses = await RiskAnalysis.find({ _id: { $in: analysisIds } }).select('questionnaireId').lean();
      questionnaireIds = analyses.map((a: any) => a.questionnaireId);
    }

    const filter = questionnaireIds ? { _id: { $in: questionnaireIds } } : {};

    const questionnaires = await Questionnaire.find(filter)
      .sort({ createdAt: -1 })
      .select('title company filledBy role filledDate status questions category')
      .lean();

    const formattedQuestionnaires = questionnaires.map(q => ({
      _id: q._id.toString(),
      title: q.title,
      company: q.company,
      filledBy: q.filledBy,
      role: q.role,
      date: q.filledDate,
      status: q.status || 'pending',
      responseCount: q.questions?.length || 0,
      questions: q.questions || [],
      category: q.category || 'operational'
    }));

    return NextResponse.json({
      success: true,
      questionnaires: formattedQuestionnaires
    });
  } catch (error) {
    console.error("Error listing questionnaires:", error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({
      error: message || "Failed to list questionnaires"
    }, { status: 500 });
  }
}
