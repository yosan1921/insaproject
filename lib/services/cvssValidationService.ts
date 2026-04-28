/**
 * CVSS Validation Engine
 * Validates whether CVSS-based risk analysis was completed correctly
 */

export interface CVSSMetrics {
    attackVector?: 'N' | 'A' | 'L' | 'P'; // Network, Adjacent, Local, Physical
    attackComplexity?: 'L' | 'H'; // Low, High
    privilegesRequired?: 'N' | 'L' | 'H'; // None, Low, High
    userInteraction?: 'N' | 'R'; // None, Required
    scope?: 'U' | 'C'; // Unchanged, Changed
    confidentiality?: 'N' | 'L' | 'H'; // None, Low, High
    integrity?: 'N' | 'L' | 'H'; // None, Low, High
    availability?: 'N' | 'L' | 'H'; // None, Low, High
}

export interface CVSSValidationResult {
    status: 'DONE' | 'PARTIALLY DONE' | 'NOT DONE';
    issues: string[];
    missing_fields: string[];
    calculation_valid: boolean;
    srs_compliance: boolean;
    recommendation: string;
}

const REQUIRED_METRICS = [
    'attackVector',
    'attackComplexity',
    'privilegesRequired',
    'userInteraction',
    'scope',
    'confidentiality',
    'integrity',
    'availability'
];

/**
 * STEP 1: Check if CVSS analysis exists
 */
function checkExecutionStatus(cvssScore?: number): boolean {
    return cvssScore !== undefined && cvssScore !== null;
}

/**
 * STEP 2: Validate input completeness
 */
function validateInputCompleteness(metrics?: CVSSMetrics): string[] {
    const missing: string[] = [];

    if (!metrics) {
        return REQUIRED_METRICS;
    }

    if (!metrics.attackVector) missing.push('Attack Vector (AV)');
    if (!metrics.attackComplexity) missing.push('Attack Complexity (AC)');
    if (!metrics.privilegesRequired) missing.push('Privileges Required (PR)');
    if (!metrics.userInteraction) missing.push('User Interaction (UI)');
    if (!metrics.scope) missing.push('Scope (S)');
    if (!metrics.confidentiality) missing.push('Confidentiality (C)');
    if (!metrics.integrity) missing.push('Integrity (I)');
    if (!metrics.availability) missing.push('Availability (A)');

    return missing;
}

/**
 * STEP 3: Validate CVSS calculation
 */
function validateCVSSCalculation(
    cvssScore?: number,
    cvssSeverity?: string
): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (cvssScore === undefined || cvssScore === null) {
        issues.push('CVSS score is missing');
        return { valid: false, issues };
    }

    // Check valid range
    if (cvssScore < 0.0 || cvssScore > 10.0) {
        issues.push(`CVSS score ${cvssScore} is out of valid range (0.0 - 10.0)`);
        return { valid: false, issues };
    }

    // Verify severity classification
    const expectedSeverity = getCVSSSeverityFromScore(cvssScore);
    if (cvssSeverity && cvssSeverity !== expectedSeverity) {
        issues.push(
            `Severity mismatch: score ${cvssScore} should be "${expectedSeverity}" but got "${cvssSeverity}"`
        );
        return { valid: false, issues };
    }

    return { valid: true, issues: [] };
}

/**
 * Get expected CVSS severity from score
 */
function getCVSSSeverityFromScore(score: number): string {
    if (score === 0.0) return 'NONE';
    if (score >= 9.0 && score <= 10.0) return 'CRITICAL';
    if (score >= 7.0 && score < 9.0) return 'HIGH';
    if (score >= 4.0 && score < 7.0) return 'MEDIUM';
    if (score >= 0.1 && score < 4.0) return 'LOW';
    return 'NONE';
}

/**
 * STEP 4: Check SRS compliance
 * SRS Requirement: "The system should analyze identified vulnerabilities using 
 * predefined qualitative and quantitative scoring metrics (e.g., CVSS, ALE, SLE models)"
 */
function checkSRSCompliance(data: {
    cvssScore?: number;
    likelihood?: number;
    impact?: number;
    riskLevel?: string;
    stored?: boolean;
    // Quantitative metrics (SRS requirement: ALE/SLE)
    assetValue?: number;
    exposureFactor?: number;
    sle?: number;
    aro?: number;
    ale?: number;
    // Inherent vs Residual (SRS requirement)
    inherentRisk?: number;
    residualRisk?: number;
}): { compliant: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check if CVSS is integrated with risk analysis
    if (data.cvssScore === undefined) {
        issues.push('CVSS not integrated with risk analysis module');
    }

    // Check if risk score is mapped to Likelihood and Impact (Qualitative)
    if (data.likelihood === undefined || data.impact === undefined) {
        issues.push('Risk score not mapped to Likelihood and Impact (Qualitative method missing)');
    }

    // Check if risk level is generated
    if (!data.riskLevel) {
        issues.push('Risk level not generated');
    }

    // Check if result is stored in risk register
    if (!data.stored) {
        issues.push('Result not stored in risk register');
    }

    // SRS Requirement: Quantitative analysis (ALE/SLE)
    const hasQuantitativeAnalysis =
        data.assetValue !== undefined &&
        data.exposureFactor !== undefined &&
        data.sle !== undefined &&
        data.aro !== undefined &&
        data.ale !== undefined;

    if (!hasQuantitativeAnalysis) {
        issues.push('Quantitative analysis (ALE/SLE) not completed - SRS requires both qualitative and quantitative methods');
    }

    // SRS Requirement: Inherent vs Residual risk
    const hasInherentResidual =
        data.inherentRisk !== undefined &&
        data.residualRisk !== undefined;

    if (!hasInherentResidual) {
        issues.push('Inherent and Residual risk levels not calculated - SRS requirement missing');
    }

    return { compliant: issues.length === 0, issues };
}

/**
 * STEP 5: Check previous analysis
 */
function checkPreviousAnalysis(
    currentCVSS?: number,
    previousCVSS?: number
): { checked: boolean; issue?: string } {
    if (previousCVSS === undefined) {
        return { checked: true }; // No previous analysis, OK
    }

    if (currentCVSS === undefined) {
        return { checked: false, issue: 'Previous CVSS existed but was ignored' };
    }

    // Previous CVSS was either reused or updated
    return { checked: true };
}

/**
 * Main validation function
 */
export function validateCVSSAnalysis(params: {
    cvssScore?: number;
    cvssSeverity?: string;
    cvssMetrics?: CVSSMetrics;
    likelihood?: number;
    impact?: number;
    riskLevel?: string;
    stored?: boolean;
    previousCVSS?: number;
    // Quantitative metrics (SRS: ALE/SLE)
    assetValue?: number;
    exposureFactor?: number;
    sle?: number;
    aro?: number;
    ale?: number;
    // Inherent vs Residual (SRS requirement)
    inherentRisk?: number;
    residualRisk?: number;
}): CVSSValidationResult {
    const issues: string[] = [];
    let status: 'DONE' | 'PARTIALLY DONE' | 'NOT DONE' = 'DONE';

    // STEP 1: Check execution status
    const hasAnalysis = checkExecutionStatus(params.cvssScore);
    if (!hasAnalysis) {
        return {
            status: 'NOT DONE',
            issues: ['CVSS analysis was not performed'],
            missing_fields: REQUIRED_METRICS,
            calculation_valid: false,
            srs_compliance: false,
            recommendation: 'Run CVSS analysis'
        };
    }

    // STEP 2: Validate input completeness
    const missingFields = validateInputCompleteness(params.cvssMetrics);
    if (missingFields.length > 0) {
        issues.push('INCOMPLETE: Missing required CVSS metrics');
        status = 'PARTIALLY DONE';
    }

    // STEP 3: Validate CVSS calculation
    const calculationResult = validateCVSSCalculation(
        params.cvssScore,
        params.cvssSeverity
    );
    if (!calculationResult.valid) {
        issues.push('INVALID CALCULATION');
        issues.push(...calculationResult.issues);
        status = 'PARTIALLY DONE';
    }

    // STEP 4: Check SRS compliance
    const complianceResult = checkSRSCompliance({
        cvssScore: params.cvssScore,
        likelihood: params.likelihood,
        impact: params.impact,
        riskLevel: params.riskLevel,
        stored: params.stored,
        assetValue: params.assetValue,
        exposureFactor: params.exposureFactor,
        sle: params.sle,
        aro: params.aro,
        ale: params.ale,
        inherentRisk: params.inherentRisk,
        residualRisk: params.residualRisk
    });
    if (!complianceResult.compliant) {
        issues.push('NOT SRS COMPLIANT');
        issues.push(...complianceResult.issues);
        status = 'PARTIALLY DONE';
    }

    // STEP 5: Check previous analysis
    const historyCheck = checkPreviousAnalysis(
        params.cvssScore,
        params.previousCVSS
    );
    if (!historyCheck.checked && historyCheck.issue) {
        issues.push('NO HISTORY CHECK');
        issues.push(historyCheck.issue);
        status = 'PARTIALLY DONE';
    }

    // STEP 6 & 8: Determine final status and recommendation
    let recommendation = '';
    if (missingFields.length > 0) {
        recommendation = 'Provide missing CVSS metrics: ' + missingFields.join(', ');
    } else if (!calculationResult.valid) {
        recommendation = 'Recalculate CVSS properly';
    } else if (!complianceResult.compliant) {
        recommendation = 'Integrate with full risk model';
    } else {
        recommendation = 'CVSS analysis is complete and valid';
        status = 'DONE';
    }

    return {
        status,
        issues,
        missing_fields: missingFields,
        calculation_valid: calculationResult.valid,
        srs_compliance: complianceResult.compliant,
        recommendation
    };
}
