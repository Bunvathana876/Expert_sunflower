import type React from "react";
import type { DailyChecksTrend, TopSymptom, NoMatchPattern } from "@/types/api";
import {
  OutbreakTrendChart,
  SymptomDistributionChart,
  ConfidenceDistributionChart,
  DiagnosticHealthGauges,
} from "./AdminCharts";

export interface OverviewChartsSectionProps {
  checksTotal: number;
  checksTrend30d: DailyChecksTrend[];
  topSymptoms: TopSymptom[];
  noMatchPatterns: NoMatchPattern[];
  pendingFeedbackCount: number;
}

export function OverviewChartsSection({
  checksTotal,
  checksTrend30d,
  topSymptoms,
  noMatchPatterns,
  pendingFeedbackCount,
}: OverviewChartsSectionProps): React.JSX.Element {
  return (
    <>
      {/* Diagnostic Health & Quality Gauges */}
      <section className="sf-glass-card sf-defer-section bg-white/85 dark:bg-[#2A3420]/80 backdrop-blur-md p-6 border border-stone-200/80 dark:border-white/10 shadow-lg rounded-2xl">
        <DiagnosticHealthGauges
          checksTotal={checksTotal}
          noMatchPatterns={noMatchPatterns}
          pendingFeedback={pendingFeedbackCount}
          topSymptomsCount={topSymptoms.length}
        />
      </section>

      {/* Outbreak & 30-Day Activity Area Chart */}
      <section className="sf-glass-card sf-defer-section bg-white/85 dark:bg-[#2A3420]/80 backdrop-blur-md p-6 border border-stone-200/80 dark:border-white/10 shadow-lg rounded-2xl">
        <OutbreakTrendChart data={checksTrend30d} />
      </section>

      {/* Two Column Section: Top Symptoms Distribution & Diagnostic Confidence Bands */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Symptom Distribution Chart */}
        <section className="sf-glass-card sf-defer-section bg-white/85 dark:bg-[#2A3420]/80 backdrop-blur-md p-6 border border-stone-200/80 dark:border-white/10 shadow-lg rounded-2xl">
          <SymptomDistributionChart topSymptoms={topSymptoms} />
        </section>

        {/* Confidence Rating Distribution */}
        <section className="sf-glass-card sf-defer-section bg-white/85 dark:bg-[#2A3420]/80 backdrop-blur-md p-6 border border-stone-200/80 dark:border-white/10 shadow-lg rounded-2xl">
          <ConfidenceDistributionChart
            checksTotal={checksTotal}
            noMatchPatterns={noMatchPatterns}
          />
        </section>
      </div>
    </>
  );
}
