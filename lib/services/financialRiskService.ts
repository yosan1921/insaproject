/**
 * Financial Risk Calculation Service
 * Implements ALE/SLE calculations for quantitative risk assessment
 * SRS Requirement: Quantitative scoring metrics (Financial Impact)
 */

export interface AssetValuation {
    assetId: string;
    assetName: string;
    assetValue: number; // in currency (e.g., USD)
    currency: string;
}

export interface FinancialRiskCalculation {
    assetValue: number; // Asset value in currency
    exposureFactor: number; // 0.0 - 1.0 (percentage of asset value at risk)
    sle: number; // Single Loss Expectancy = Asset Value × Exposure Factor
    aro: number; // Annual Rate of Occurrence (times per year)
    ale: number; // Annual Loss Expectancy = SLE × ARO
    currency: string;
}

/**
 * Calculate Single Loss Expectancy (SLE)
 * SLE = Asset Value × Exposure Factor
 * 
 * @param assetValue - Value of the asset in currency
 * @param exposureFactor - Percentage of asset value at risk (0.0 - 1.0)
 * @returns SLE in currency
 */
export function calculateSLE(assetValue: number, exposureFactor: number): number {
    if (assetValue < 0 || exposureFactor < 0 || exposureFactor > 1) {
        throw new Error('Invalid input: assetValue must be >= 0, exposureFactor must be 0-1');
    }
    return assetValue * exposureFactor;
}

/**
 * Calculate Annual Loss Expectancy (ALE)
 * ALE = SLE × ARO
 * 
 * @param sle - Single Loss Expectancy
 * @param aro - Annual Rate of Occurrence (times per year)
 * @returns ALE in currency
 */
export function calculateALE(sle: number, aro: number): number {
    if (sle < 0 || aro < 0) {
        throw new Error('Invalid input: SLE and ARO must be >= 0');
    }
    return sle * aro;
}

/**
 * Calculate complete financial risk metrics
 * 
 * @param assetValue - Value of the asset
 * @param exposureFactor - Percentage of asset at risk (0.0 - 1.0)
 * @param aro - Annual Rate of Occurrence
 * @param currency - Currency code (e.g., 'USD', 'EUR')
 * @returns Complete financial risk calculation
 */
export function calculateFinancialRisk(
    assetValue: number,
    exposureFactor: number,
    aro: number,
    currency: string = 'USD'
): FinancialRiskCalculation {
    const sle = calculateSLE(assetValue, exposureFactor);
    const ale = calculateALE(sle, aro);

    return {
        assetValue,
        exposureFactor,
        sle,
        aro,
        ale,
        currency,
    };
}

/**
 * Estimate Exposure Factor from Risk Score (1-25 scale)
 * Maps qualitative risk to quantitative exposure percentage
 * 
 * Risk Score → Exposure Factor:
 * 1-5 (Low): 10-20%
 * 6-10 (Medium-Low): 20-40%
 * 11-15 (Medium): 40-60%
 * 16-20 (Medium-High): 60-80%
 * 21-25 (High): 80-100%
 */
export function estimateExposureFactorFromRiskScore(riskScore: number): number {
    if (riskScore < 1 || riskScore > 25) {
        throw new Error('Risk score must be between 1 and 25');
    }

    // Linear mapping: riskScore 1-25 → exposureFactor 0.1-1.0
    // Formula: EF = 0.1 + (riskScore - 1) * (0.9 / 24)
    const exposureFactor = 0.1 + ((riskScore - 1) * (0.9 / 24));

    return Math.min(1.0, Math.max(0.1, exposureFactor));
}

/**
 * Estimate Annual Rate of Occurrence from Severity
 * Maps threat severity to estimated occurrence frequency
 * 
 * Severity → ARO:
 * critical: 12 times/year (monthly)
 * high: 4 times/year (quarterly)
 * medium: 2 times/year (semi-annually)
 * low: 0.5 times/year (once every 2 years)
 * info: 0.1 times/year (once every 10 years)
 */
export function estimateAROFromSeverity(severity: string): number {
    const aroMap: Record<string, number> = {
        critical: 12,
        high: 4,
        medium: 2,
        low: 0.5,
        info: 0.1,
    };

    return aroMap[severity.toLowerCase()] || 1;
}

/**
 * Format currency value for display
 */
export function formatCurrency(value: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
}

/**
 * Calculate total ALE for multiple risks
 */
export function calculateTotalALE(risks: FinancialRiskCalculation[]): number {
    return risks.reduce((total, risk) => total + risk.ale, 0);
}

/**
 * Categorize ALE by severity
 */
export function categorizeALE(ale: number): {
    level: string;
    color: string;
    description: string;
} {
    if (ale >= 1000000) {
        return {
            level: 'Critical',
            color: 'red',
            description: 'Severe financial impact requiring immediate action',
        };
    } else if (ale >= 100000) {
        return {
            level: 'High',
            color: 'orange',
            description: 'Significant financial impact requiring priority attention',
        };
    } else if (ale >= 10000) {
        return {
            level: 'Medium',
            color: 'yellow',
            description: 'Moderate financial impact requiring planning',
        };
    } else if (ale >= 1000) {
        return {
            level: 'Low',
            color: 'green',
            description: 'Minor financial impact, monitor and review',
        };
    } else {
        return {
            level: 'Minimal',
            color: 'blue',
            description: 'Negligible financial impact',
        };
    }
}
