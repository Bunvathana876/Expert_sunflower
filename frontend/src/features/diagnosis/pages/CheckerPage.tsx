import type React from "react";
import { useReducer, useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Search,
  X,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Stethoscope,
  Layers,
  HelpCircle,
} from "lucide-react";
import { useSymptomsGrouped, useSubmitDiagnosis } from "../hooks";
import { previewDiagnosis } from "../api";
import { checkerReducer, initialCheckerState, countDefiniteAnswers } from "../reducer";
import { CategorySelector } from "../components/CategorySelector";
import { SymptomToggle } from "../components/SymptomToggle";
import { LiveCandidateList } from "../components/LiveCandidateList";
import { AnalysisProgressModal } from "../components/AnalysisProgressModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import type { Answer, DiagnosisResponse, SymptomItem } from "@/types/api";

export function CheckerPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const { data: groupedSymptoms, isLoading, isError, refetch } = useSymptomsGrouped();
  const submitMutation = useSubmitDiagnosis();

  const [state, dispatch] = useReducer(checkerReducer, initialCheckerState);
  const [previewData, setPreviewData] = useState<DiagnosisResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Active abort controller ref to cancel in-flight previews
  const abortControllerRef = useRef<AbortController | null>(null);

  // Automatically select the first category once symptoms are loaded
  useEffect(() => {
    if (groupedSymptoms && groupedSymptoms.length > 0 && state.activeCategoryId === null) {
      const firstGroup = groupedSymptoms[0];
      if (firstGroup) {
        dispatch({ type: "SELECT_CATEGORY", categoryId: firstGroup.category.id });
      }
    }
  }, [groupedSymptoms, state.activeCategoryId]);

  const categories = useMemo(
    () => (groupedSymptoms ? groupedSymptoms.map((g) => g.category) : []),
    [groupedSymptoms],
  );

  const allSymptomsMap = useMemo(() => {
    const map = new Map<number, SymptomItem>();
    if (!groupedSymptoms) return map;
    for (const group of groupedSymptoms) {
      for (const s of group.symptoms) {
        map.set(s.id, s);
      }
    }
    return map;
  }, [groupedSymptoms]);

  const activeGroup = useMemo(
    () => groupedSymptoms?.find((g) => g.category.id === state.activeCategoryId),
    [groupedSymptoms, state.activeCategoryId],
  );

  const totalSymptoms = useMemo(() => {
    if (!groupedSymptoms) return 0;
    return groupedSymptoms.reduce((acc, g) => acc + g.symptoms.length, 0);
  }, [groupedSymptoms]);

  const answeredCount = countDefiniteAnswers(state.answers);

  // Debounced live preview (400ms) with AbortController
  useEffect(() => {
    if (answeredCount === 0) {
      setPreviewData(null);
      setIsPreviewLoading(false);
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setIsPreviewLoading(true);

    const timer = setTimeout(() => {
      previewDiagnosis(state.answers, i18n.language, controller.signal)
        .then((data) => {
          setPreviewData(data);
          setIsPreviewLoading(false);
        })
        .catch((err: unknown) => {
          if (err instanceof DOMException && err.name === "AbortError") {
            return;
          }
          setIsPreviewLoading(false);
        });
    }, 400);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [state.answers, answeredCount, i18n.language]);

  const handleAnswer = (symptomId: number, answer: Answer) => {
    dispatch({ type: "SET_ANSWER", symptomId, answer });
  };

  const handleClearAll = () => {
    if (window.confirm(t("checker.clear_confirm"))) {
      dispatch({ type: "RESET" });
      setPreviewData(null);
    }
  };

  // Filter symptoms across all categories when searching
  const filteredSymptoms = useMemo(() => {
    if (!searchQuery.trim() || !groupedSymptoms) return null;
    const query = searchQuery.toLowerCase().trim();
    const results: Array<{ symptom: SymptomItem; categoryLabel: string }> = [];

    for (const group of groupedSymptoms) {
      for (const s of group.symptoms) {
        if (s.label.toLowerCase().includes(query) || s.code.toLowerCase().includes(query)) {
          results.push({ symptom: s, categoryLabel: group.category.label });
        }
      }
    }
    return results;
  }, [searchQuery, groupedSymptoms]);

  // Quick picks: popular / common symptoms for sunflowers
  const quickPickSymptoms = useMemo(() => {
    if (!groupedSymptoms) return [];
    const prominentKeywords = [
      "spot",
      "rot",
      "wilt",
      "yellow",
      "mold",
      "blight",
      "ដំបៅ",
      "រលួយ",
      "ស្វិត",
      "លឿង",
    ];
    const picks: SymptomItem[] = [];
    for (const group of groupedSymptoms) {
      for (const s of group.symptoms) {
        if (prominentKeywords.some((kw) => s.label.toLowerCase().includes(kw))) {
          picks.push(s);
          if (picks.length >= 6) return picks;
        }
      }
    }
    return picks;
  }, [groupedSymptoms]);

  // Selected symptoms array for the active tray
  const selectedSymptomsList = useMemo(() => {
    const list: Array<{ id: number; item: SymptomItem | undefined; answer: Answer }> = [];
    for (const [idStr, answer] of Object.entries(state.answers)) {
      if (answer !== "unknown") {
        const id = Number(idStr);
        list.push({ id, item: allSymptomsMap.get(id), answer });
      }
    }
    return list;
  }, [state.answers, allSymptomsMap]);

  const handleSubmit = async () => {
    if (answeredCount === 0) return;

    try {
      setIsAnalyzing(true);
      const minAnimationDelay = new Promise((resolve) => setTimeout(resolve, 1400));
      const submitPromise = submitMutation.mutateAsync({
        answers: state.answers,
        locale: i18n.language,
      });

      const [result] = await Promise.all([submitPromise, minAnimationDelay]);

      if (result.session_id) {
        void navigate(`/check/${result.session_id}`);
      } else {
        void navigate("/check/result", { state: { result } });
      }
    } catch {
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div aria-busy="true" className="space-y-6">
        <Skeleton height="2.5rem" width="45%" className="rounded-xl" />
        <Skeleton height="1.25rem" width="65%" className="rounded-lg" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} height="4.5rem" className="rounded-xl" />
          ))}
        </div>
        <Skeleton height="16rem" className="rounded-2xl" />
      </div>
    );
  }

  if (isError || !groupedSymptoms) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-6">
      {/* Real-Time Animated Analysis Progress Modal */}
      <AnalysisProgressModal isOpen={isAnalyzing} symptomCount={answeredCount} />

      {/* Header & Search Bar */}
      <div className="sf-glass-card p-5 sm:p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl" aria-hidden="true">
                🩺
              </span>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                {t("checker.title")}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              {t("checker.subtitle")}
            </p>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 self-start md:self-auto bg-slate-100 dark:bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-200/80 dark:border-slate-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-slate-700 dark:text-slate-300">
              {t("checker.answered_count", { count: answeredCount, total: totalSymptoms })}
            </span>
          </div>
        </div>

        {/* Global Symptom Search Input */}
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("checker.search_placeholder")}
            className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700/80 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              aria-label="Clear search"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Quick Picks for common sunflower symptoms */}
        {!searchQuery && quickPickSymptoms.length > 0 && (
          <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/60">
            <div className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
              <Sparkles size={12} className="text-amber-500" />
              <span>{t("checker.quick_picks_title")}</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickPickSymptoms.map((qp) => {
                const answer = state.answers[qp.id];
                const isSelected = answer === "yes";

                return (
                  <button
                    key={qp.id}
                    type="button"
                    onClick={() => handleAnswer(qp.id, isSelected ? "unknown" : "yes")}
                    className={`sf-chip text-xs ${isSelected ? "sf-chip--active" : ""}`}
                  >
                    <span>{isSelected ? "✓" : "+"}</span>
                    <span>{qp.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Selected Symptoms Interactive Tray (removable chips + clear-all) */}
      {selectedSymptomsList.length > 0 && (
        <div className="sf-glass-card p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                {t("checker.selected_tray_title")} ({selectedSymptomsList.length})
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearAll}
              className="text-xs font-medium text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
            >
              <RotateCcw size={12} />
              <span>{t("checker.clear_all")}</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedSymptomsList.map(({ id, item, answer }) => (
              <span
                key={id}
                className={`sf-chip sf-chip--removable ${
                  answer === "yes"
                    ? "bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800"
                    : "bg-rose-50 text-rose-900 dark:bg-rose-950/60 dark:text-rose-200 border-rose-300 dark:border-rose-800"
                }`}
              >
                <span className="text-[0.7rem] font-bold">{answer === "yes" ? "✓" : "✗"}</span>
                <span>{item?.label ?? `Symptom #${id}`}</span>
                <button
                  type="button"
                  onClick={() => handleAnswer(id, "unknown")}
                  className="sf-chip__remove-btn"
                  aria-label={`Remove ${item?.label ?? "symptom"}`}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Interactive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Plant Part Tabs + Symptom Checklist */}
        <div className="lg:col-span-2 space-y-4">
          {searchQuery ? (
            /* Search Results View */
            <div className="sf-glass-card p-4 space-y-3">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Search Results ({filteredSymptoms?.length ?? 0})
              </div>

              {filteredSymptoms && filteredSymptoms.length > 0 ? (
                <div className="space-y-2">
                  {filteredSymptoms.map(({ symptom, categoryLabel }) => (
                    <div key={symptom.id} className="space-y-1">
                      <div className="text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider pl-1">
                        {categoryLabel}
                      </div>
                      <SymptomToggle
                        symptom={symptom}
                        currentAnswer={state.answers[symptom.id] ?? "unknown"}
                        onAnswer={handleAnswer}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs">
                  {t("checker.no_search_results", { query: searchQuery })}
                </div>
              )}
            </div>
          ) : (
            /* Standard Plant Part Navigation */
            <>
              <CategorySelector
                categories={categories}
                activeCategoryId={state.activeCategoryId}
                onSelect={(id) => dispatch({ type: "SELECT_CATEGORY", categoryId: id })}
              />

              {activeGroup && (
                <div className="sf-glass-card p-4 sm:p-5 space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-200/60 dark:border-slate-800">
                    <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                      <Layers size={16} className="text-amber-500" />
                      <span>{activeGroup.category.label}</span>
                      <span className="text-xs font-normal text-slate-400">
                        ({activeGroup.symptoms.length})
                      </span>
                    </h2>
                  </div>

                  <div className="space-y-2">
                    {activeGroup.symptoms.map((symptom) => (
                      <SymptomToggle
                        key={symptom.id}
                        symptom={symptom}
                        currentAnswer={state.answers[symptom.id] ?? "unknown"}
                        onAnswer={handleAnswer}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Next Best Questions Recommendation */}
          {previewData?.next_best_questions && previewData.next_best_questions.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 space-y-2.5">
              <div className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <HelpCircle size={15} />
                <span>{t("checker.next_best_title")}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {previewData.next_best_questions.slice(0, 4).map((q) => (
                  <div
                    key={q.symptom}
                    className="p-2.5 rounded-lg bg-white/80 dark:bg-slate-900/60 border border-amber-500/20 flex justify-between items-center text-xs"
                  >
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate mr-2">
                      {q.symptom}
                    </span>
                    <span className="text-[0.7rem] font-bold text-emerald-700 dark:text-emerald-400 shrink-0 bg-emerald-100/80 dark:bg-emerald-950 px-1.5 py-0.5 rounded">
                      +{Math.round(q.information_gain * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Live Candidates Sidebar + Submit Action */}
        <div className="space-y-4 lg:sticky lg:top-24">
          {/* Analyze Primary Action Box */}
          <div className="sf-glass-card p-5 space-y-4 border-amber-500/30">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                Diagnostic Action
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Submit observed evidence to run the mathematical expert system analysis.
              </p>
            </div>

            <button
              type="button"
              disabled={answeredCount === 0 || submitMutation.isPending || isAnalyzing}
              onClick={() => void handleSubmit()}
              className="w-full py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              <Stethoscope size={18} />
              <span>
                {answeredCount > 0
                  ? t("checker.analyze_count", { count: answeredCount })
                  : t("checker.get_result")}
              </span>
              <ArrowRight size={16} />
            </button>

            {submitMutation.isError && (
              <p className="text-xs text-rose-500 text-center font-medium">
                {t("checker.submit_error")}
              </p>
            )}
          </div>

          {/* Live Candidates Preview Sidebar */}
          <div className="sf-glass-card p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t("checker.live_candidates_title")}
            </h3>
            <LiveCandidateList results={previewData?.results ?? []} isLoading={isPreviewLoading} />
          </div>
        </div>
      </div>
    </div>
  );
}
