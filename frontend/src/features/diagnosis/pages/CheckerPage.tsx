import type React from "react";
import { useReducer, useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
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
  CheckCircle2,
  ClipboardList,
  Lightbulb,
  ChevronsUpDown,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { enqueueOfflineDiagnosis } from "@/lib/offlineQueue";
import { useSymptomsGrouped, useSubmitDiagnosis } from "../hooks";
import { previewDiagnosis } from "../api";
import { checkerReducer, initialCheckerState, countDefiniteAnswers } from "../reducer";
import { CategorySelector } from "../components/CategorySelector";
import { SymptomToggle } from "../components/SymptomToggle";
import { LiveCandidateList } from "../components/LiveCandidateList";
import { AnalysisProgressModal } from "../components/AnalysisProgressModal";
import { Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/ErrorState";
import { SunflowerIcon } from "@/components/ui/SunflowerIcon";
import type { Answer, DiagnosisResponse, SymptomItem } from "@/types/api";

export function CheckerPage(): React.JSX.Element {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedCategory = searchParams.get("category");

  const { data: groupedSymptoms, isLoading, isError, refetch } = useSymptomsGrouped();
  const submitMutation = useSubmitDiagnosis();

  const [state, dispatch] = useReducer(checkerReducer, initialCheckerState);
  const [previewData, setPreviewData] = useState<DiagnosisResponse | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [isFrequentOpen, setIsFrequentOpen] = useState(false);

  // Active abort controller ref to cancel in-flight previews
  const abortControllerRef = useRef<AbortController | null>(null);

  // Automatically select the first category once symptoms are loaded
  useEffect(() => {
    if (groupedSymptoms && groupedSymptoms.length > 0 && state.activeCategoryId === null) {
      const firstGroup =
        groupedSymptoms.find((group) => group.category.code === requestedCategory) ??
        groupedSymptoms[0];
      if (firstGroup) {
        dispatch({ type: "SELECT_CATEGORY", categoryId: firstGroup.category.id });
      }
    }
  }, [groupedSymptoms, state.activeCategoryId, requestedCategory]);

  const categories = useMemo(
    () => (groupedSymptoms ? groupedSymptoms.map((g) => g.category) : []),
    [groupedSymptoms],
  );

  const categorySymptomCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    if (!groupedSymptoms) return counts;
    for (const group of groupedSymptoms) {
      counts[group.category.id] = group.symptoms.length;
    }
    return counts;
  }, [groupedSymptoms]);

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

  const symptomToCategoryMap = useMemo(() => {
    const map = new Map<number, string>();
    if (!groupedSymptoms) return map;
    for (const group of groupedSymptoms) {
      for (const s of group.symptoms) {
        map.set(s.id, group.category.label);
      }
    }
    return map;
  }, [groupedSymptoms]);

  const activeGroup = useMemo(
    () => groupedSymptoms?.find((g) => g.category.id === state.activeCategoryId),
    [groupedSymptoms, state.activeCategoryId],
  );

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

  // Selected symptoms array for the observation sidebar
  const selectedSymptomsList = useMemo(() => {
    const list: Array<{
      id: number;
      item: SymptomItem | undefined;
      answer: Answer;
      categoryLabel: string;
    }> = [];
    for (const [idStr, answer] of Object.entries(state.answers)) {
      if (answer !== "unknown") {
        const id = Number(idStr);
        list.push({
          id,
          item: allSymptomsMap.get(id),
          answer,
          categoryLabel: symptomToCategoryMap.get(id) ?? "",
        });
      }
    }
    return list;
  }, [state.answers, allSymptomsMap, symptomToCategoryMap]);

  const handleSubmit = async () => {
    if (answeredCount === 0 || isAnalyzing || submitMutation.isPending) return;

    // Check offline status immediately
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      try {
        setIsAnalyzing(true);
        await enqueueOfflineDiagnosis({
          answers: state.answers,
          locale: i18n.language,
        });
        setOfflineSaved(true);
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

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
      // If offline or network dropped during request, save offline automatically
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueOfflineDiagnosis({
          answers: state.answers,
          locale: i18n.language,
        });
        setOfflineSaved(true);
      }
      setIsAnalyzing(false);
    }
  };

  if (isLoading) {
    return (
      <div aria-busy="true" className="space-y-6">
        <Skeleton height="6rem" className="rounded-3xl" />
        <Skeleton height="11rem" className="rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <Skeleton height="24rem" className="rounded-3xl" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton height="24rem" className="rounded-3xl" />
          </div>
        </div>
      </div>
    );
  }

  if (isError || !groupedSymptoms) {
    return <ErrorState onRetry={() => void refetch()} />;
  }

  const isSubmitting = isAnalyzing || submitMutation.isPending;

  return (
    <div className="space-y-6 pb-28 lg:pb-8">
      {/* Real-Time Animated Analysis Progress Modal */}
      <AnalysisProgressModal isOpen={isAnalyzing} symptomCount={answeredCount} />

      {/* Offline Saved Notification */}
      {offlineSaved && (
        <div className="p-5 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/40 text-emerald-950 dark:text-emerald-200 rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-sm sm:text-base">{t("offline.saved_offline_title")}</h3>
              <p className="text-xs sm:text-sm mt-0.5 text-emerald-800 dark:text-emerald-300">
                {t("offline.saved_offline_desc")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setOfflineSaved(false);
              dispatch({ type: "RESET" });
            }}
            className="sf-btn sf-btn--primary sf-btn--sm shrink-0 cursor-pointer"
          >
            {t("checker.reset")}
          </button>
        </div>
      )}

      {/* =========================================================================
          COMPACT BOTANICAL HEADER & 3-STEP USER JOURNEY
          ========================================================================= */}
      <header
        className="rounded-3xl bg-gradient-to-br from-[#163F27] via-[#1B432C] to-[#224D3A] dark:from-[#0D1C13] dark:via-[#122318] dark:to-[#172D20] text-white p-5 sm:p-6 lg:p-7 shadow-md border border-[#2B543E] dark:border-white/10"
        aria-labelledby="checker-heading"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center p-2 shrink-0 shadow-xs">
              <SunflowerIcon
                name="diagnosis"
                size={24}
                className="w-full h-full object-contain"
                alt=""
              />
            </div>
            <div>
              <h1
                id="checker-heading"
                className="text-xl sm:text-2xl font-extrabold text-[#F8F7F1] tracking-tight leading-tight"
              >
                {t("checker.title")}
              </h1>
              <p className="text-xs sm:text-sm text-[#D3E4D7] mt-0.5">{t("checker.subtitle")}</p>
            </div>
          </div>

          {/* Evaluated Count Pill */}
          <div className="self-start md:self-auto flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-xs font-semibold text-[#F8F7F1]">
            <span className="w-2 h-2 rounded-full bg-[#E4AD45] animate-pulse" />
            <span>
              {t("checker.answered_count", {
                count: answeredCount,
                total: groupedSymptoms.reduce((acc, g) => acc + g.symptoms.length, 0),
              })}
            </span>
          </div>
        </div>

        {/* 3-Step Clear Guide */}
        <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center justify-start sm:justify-center gap-2 sm:gap-4 text-xs sm:text-sm font-semibold">
          <div className="flex items-center gap-2 text-[#F8F7F1]">
            <span className="w-5 h-5 rounded-full bg-[#E4AD45] text-[#163F27] font-black text-xs flex items-center justify-center shadow-xs shrink-0 select-none">
              1
            </span>
            <span>{t("checker.step_choose_part")}</span>
          </div>

          <span className="hidden sm:inline-block text-white/30" aria-hidden="true">
            &rarr;
          </span>

          <div className="flex items-center gap-2 text-[#D3E4D7]">
            <span className="w-5 h-5 rounded-full bg-white/20 text-[#F8F7F1] font-bold text-xs flex items-center justify-center shadow-xs shrink-0 select-none">
              2
            </span>
            <span>{t("checker.step_select_symptoms")}</span>
          </div>

          <span className="hidden sm:inline-block text-white/30" aria-hidden="true">
            &rarr;
          </span>

          <div className="flex items-center gap-2 text-[#D3E4D7]">
            <span className="w-5 h-5 rounded-full bg-white/20 text-[#F8F7F1] font-bold text-xs flex items-center justify-center shadow-xs shrink-0 select-none">
              3
            </span>
            <span>{t("checker.step_get_diagnosis")}</span>
          </div>
        </div>
      </header>

      {/* =========================================================================
          ROW 1 — FULL WIDTH CARD: SELECT PLANT PART
          Positioned ABOVE BOTH bottom cards, spanning full container width.
          ========================================================================= */}
      <section
        className="w-full bg-white dark:bg-[#192720] rounded-3xl p-5 sm:p-7 border border-stone-200/80 dark:border-white/[0.08] shadow-xs"
        aria-label={t("checker.select_plant_part")}
      >
        <CategorySelector
          categories={categories}
          activeCategoryId={state.activeCategoryId}
          onSelect={(id) => {
            setSearchQuery("");
            dispatch({ type: "SELECT_CATEGORY", categoryId: id });
          }}
          symptomCounts={categorySymptomCounts}
        />
      </section>

      {/* =========================================================================
          ROW 2 — TWO COLUMNS (Beginning at the same vertical position)
          Left: Select Symptoms (~65% width)
          Right: Your Observations (~35% width)
          ========================================================================= */}
      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 items-start">
        {/* =====================================================================
            CARD 2: SELECT SYMPTOMS (Left Column ~65%)
            Contains: Active part title, Search, Collapsible frequent observations,
            and Scrollable symptom list.
            ===================================================================== */}
        <section
          className="w-full lg:w-[65%] space-y-6"
          aria-label={t("checker.observed_symptoms")}
        >
          <div className="bg-white dark:bg-[#192720] rounded-3xl p-5 sm:p-7 border border-stone-200/80 dark:border-white/[0.08] shadow-xs space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-1">
              <div className="flex items-center gap-2">
                <Layers size={18} className="text-[#87A774]" />
                <h3 className="text-base sm:text-lg font-bold text-[#1B3B2B] dark:text-[#EFF5EF]">
                  {searchQuery
                    ? `${t("common.search")} (${filteredSymptoms?.length ?? 0})`
                    : (activeGroup?.category.label ?? t("checker.observed_symptoms"))}
                </h3>
                {!searchQuery && activeGroup && (
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                    {activeGroup.symptoms.length}
                  </span>
                )}
              </div>

              <div className="text-xs text-[#607366] dark:text-[#94A79C] font-medium">
                {t("checker.tap_if_observed")}
              </div>
            </div>

            {/* Search Input (Remains OUTSIDE the scroll area) */}
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("checker.search_placeholder")}
                className="w-full pl-10 pr-10 py-3 text-xs sm:text-sm rounded-xl bg-stone-50 dark:bg-[#14231B] border border-stone-200/80 dark:border-white/[0.08] focus:border-[#224D3A] dark:focus:border-[#87A774] focus:ring-2 focus:ring-[#224D3A]/10 outline-none transition-all placeholder:text-stone-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 cursor-pointer"
                  aria-label={t("common.clear", "Clear")}
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Collapsible Frequent Observations */}
            {!searchQuery && quickPickSymptoms.length > 0 && (
              <div className="rounded-2xl border border-stone-200/70 dark:border-white/[0.06] bg-stone-50/60 dark:bg-[#14231B]/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsFrequentOpen((prev) => !prev)}
                  className="w-full px-4 py-2.5 text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center justify-between gap-2 hover:bg-stone-100/70 dark:hover:bg-[#1A2C21] transition-colors cursor-pointer"
                  aria-expanded={isFrequentOpen}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={14} className="text-[#E4AD45]" />
                    <span>
                      {t("checker.frequent_observations_toggle", {
                        count: quickPickSymptoms.length,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-[0.7rem] text-stone-400 dark:text-stone-500 font-normal">
                    <span>
                      {isFrequentOpen
                        ? t("checker.collapse_frequent")
                        : t("checker.expand_frequent")}
                    </span>
                    {isFrequentOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </div>
                </button>

                {isFrequentOpen && (
                  <div className="p-3 pt-1 border-t border-stone-200/60 dark:border-white/[0.06] flex flex-wrap gap-1.5 animate-in fade-in duration-200">
                    {quickPickSymptoms.map((qp) => {
                      const answer = state.answers[qp.id];
                      const isSelected = answer === "yes";

                      return (
                        <button
                          key={qp.id}
                          type="button"
                          onClick={() => handleAnswer(qp.id, isSelected ? "unknown" : "yes")}
                          className={`text-xs px-3 py-1.5 rounded-xl border font-medium transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? "bg-[#224D3A] text-white border-[#224D3A] dark:bg-[#87A774] dark:text-[#0E1712] dark:border-[#87A774] font-semibold shadow-2xs"
                              : "bg-white hover:bg-stone-50 dark:bg-[#192720] text-stone-700 dark:text-stone-200 border-stone-200 dark:border-stone-700"
                          }`}
                        >
                          <span className="font-bold text-[0.7rem]">{isSelected ? "✓" : "+"}</span>
                          <span>{qp.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Scrollable Symptom List */}
            <div
              role="region"
              aria-label={
                searchQuery
                  ? t("common.search")
                  : (activeGroup?.category.label ?? t("checker.observed_symptoms"))
              }
              tabIndex={0}
              className="max-h-[460px] sm:max-h-[500px] lg:max-h-[540px] overflow-y-auto overscroll-contain pr-1 sm:pr-1.5 space-y-2.5 sf-custom-scrollbar focus:outline-none focus-visible:ring-1 focus-visible:ring-[#224D3A]/30 rounded-2xl"
            >
              {searchQuery ? (
                filteredSymptoms && filteredSymptoms.length > 0 ? (
                  filteredSymptoms.map(({ symptom, categoryLabel }) => (
                    <SymptomToggle
                      key={symptom.id}
                      symptom={symptom}
                      categoryLabel={categoryLabel}
                      currentAnswer={state.answers[symptom.id] ?? "unknown"}
                      onAnswer={handleAnswer}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center text-stone-400 dark:text-stone-500 text-xs sm:text-sm">
                    {t("checker.no_search_results", { query: searchQuery })}
                  </div>
                )
              ) : activeGroup ? (
                activeGroup.symptoms.map((symptom) => (
                  <SymptomToggle
                    key={symptom.id}
                    symptom={symptom}
                    currentAnswer={state.answers[symptom.id] ?? "unknown"}
                    onAnswer={handleAnswer}
                  />
                ))
              ) : null}

              {/* Scroll Hint */}
              {!searchQuery && activeGroup && activeGroup.symptoms.length > 5 && (
                <div className="text-[0.7rem] font-medium text-stone-400 dark:text-stone-500 text-center pt-2 flex items-center justify-center gap-1 select-none">
                  <ChevronsUpDown size={13} />
                  <span>{t("checker.scroll_hint")}</span>
                </div>
              )}
            </div>
          </div>

          {/* Next Best Questions Recommendation */}
          {previewData?.next_best_questions && previewData.next_best_questions.length > 0 && (
            <div className="p-5 rounded-3xl bg-[#FDF9EE] dark:bg-[#1C180E] border border-[#E4AD45]/30 space-y-3 shadow-2xs">
              <div className="text-xs font-bold text-[#8A6318] dark:text-[#E4AD45] flex items-center gap-1.5">
                <HelpCircle size={15} />
                <span>{t("checker.next_best_title")}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {previewData.next_best_questions.slice(0, 4).map((q) => (
                  <div
                    key={q.symptom}
                    className="p-2.5 rounded-xl bg-white/90 dark:bg-[#192720] border border-[#E4AD45]/20 flex justify-between items-center text-xs gap-2 min-w-0"
                  >
                    <span className="font-medium text-stone-800 dark:text-stone-200 truncate min-w-0 flex-1">
                      {q.symptom}
                    </span>
                    <span className="text-[0.68rem] font-bold text-[#8A6318] dark:text-[#E4AD45] shrink-0 bg-[#E4AD45]/15 px-2 py-0.5 rounded-full">
                      +{Math.round(q.information_gain * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* =====================================================================
            CARD 3: YOUR OBSERVATIONS (Right Column ~35%)
            Begins at the exact same vertical position as Card 2.
            Sticky on desktop.
            ===================================================================== */}
        <section
          className="w-full lg:w-[35%] space-y-6 lg:sticky lg:top-20"
          aria-label={t("checker.your_observations")}
        >
          <div className="bg-white dark:bg-[#192720] rounded-3xl p-5 sm:p-7 border border-stone-200/80 dark:border-white/[0.08] shadow-xs space-y-5">
            {/* Header: Title, Count, Clear All */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/60 dark:border-white/[0.08]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#EDF5EE] dark:bg-[#14231B] text-[#224D3A] dark:text-[#87A774] flex items-center justify-center shrink-0">
                  <ClipboardList size={16} />
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-[#1B3B2B] dark:text-[#EFF5EF] leading-tight">
                    {t("checker.your_observations")}
                  </h3>
                  <span className="text-[0.7rem] text-[#607366] dark:text-[#94A79C] font-medium">
                    {t("checker.symptoms_selected", { count: selectedSymptomsList.length })}
                  </span>
                </div>
              </div>

              {selectedSymptomsList.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw size={12} />
                  <span>{t("checker.clear_all")}</span>
                </button>
              )}
            </div>

            {/* Selected Symptoms Cards or Empty State */}
            {selectedSymptomsList.length > 0 ? (
              <div className="max-h-[220px] sm:max-h-[260px] overflow-y-auto overscroll-contain pr-1 space-y-2 sf-custom-scrollbar">
                {selectedSymptomsList.map(({ id, item, categoryLabel }) => (
                  <div
                    key={id}
                    className="p-2.5 sm:p-3 rounded-xl bg-stone-50 dark:bg-[#14231B] border border-stone-200/70 dark:border-white/[0.06] flex items-center justify-between gap-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      {categoryLabel && (
                        <span className="text-[0.62rem] font-bold uppercase tracking-wider text-[#607366] dark:text-[#94A79C] block mb-0.5">
                          {categoryLabel}
                        </span>
                      )}
                      <p className="text-xs sm:text-sm font-semibold text-stone-800 dark:text-stone-200 leading-snug break-words">
                        {item?.label ?? `Symptom #${id}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAnswer(id, "unknown")}
                      className="w-7 h-7 rounded-lg text-stone-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                      aria-label={`${t("checker.remove_symptom")} ${item?.label ?? ""}`}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-5 rounded-2xl bg-stone-50/70 dark:bg-[#14231B]/40 border border-dashed border-stone-200/80 dark:border-white/[0.08] text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-400 dark:text-stone-500 flex items-center justify-center mx-auto">
                  <ClipboardList size={20} />
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-stone-700 dark:text-stone-300">
                  {t("checker.no_observations_title")}
                </h4>
                <p className="text-[0.75rem] text-[#607366] dark:text-[#94A79C] leading-relaxed max-w-xs mx-auto">
                  {t("checker.no_observations_desc")}
                </p>
              </div>
            )}

            {/* Desktop Primary "Analyze Symptoms" Action */}
            <div className="pt-1 space-y-2">
              <button
                type="button"
                disabled={answeredCount === 0 || isSubmitting}
                onClick={() => void handleSubmit()}
                className="w-full py-3.5 px-5 rounded-2xl font-bold text-sm sm:text-base bg-gradient-to-r from-[#224D3A] to-[#163F27] hover:from-[#193B2C] hover:to-[#102E1C] dark:from-[#87A774] dark:to-[#739360] text-white dark:text-[#0E1712] shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin shrink-0" />
                    <span>{t("common.loading")}</span>
                  </>
                ) : (
                  <>
                    <Stethoscope size={18} className="shrink-0" />
                    <span>
                      {answeredCount > 0
                        ? t("checker.analyze_count", { count: answeredCount })
                        : t("checker.get_result")}
                    </span>
                    <ArrowRight size={16} className="shrink-0" />
                  </>
                )}
              </button>

              {/* Explanatory helper message when disabled */}
              {answeredCount === 0 && (
                <p className="text-[0.72rem] text-stone-500 dark:text-stone-400 text-center font-medium leading-tight">
                  {t("checker.select_min_one")}
                </p>
              )}

              {submitMutation.isError && (
                <p className="text-xs text-rose-500 text-center font-medium mt-1">
                  {t("checker.submit_error")}
                </p>
              )}
            </div>

            {/* Helpful Tip Guidance Card */}
            <div className="p-4 rounded-2xl bg-[#EDF5EE] dark:bg-[#14231B] border border-[#87A774]/30 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-bold text-[#224D3A] dark:text-[#87A774]">
                <Lightbulb size={15} className="text-[#E4AD45] shrink-0" />
                <span>{t("checker.helpful_tip_title")}</span>
              </div>
              <p className="text-[0.75rem] text-[#4A584E] dark:text-[#9BB5A8] leading-relaxed">
                {t("checker.helpful_tip_desc")}
              </p>
            </div>

            {/* Live Diagnosis Candidates Preview */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#607366] dark:text-[#94A79C] flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[#87A774]" />
                  <span>{t("checker.live_matches_preliminary")}</span>
                </h4>
                {answeredCount > 0 && (
                  <span className="text-[0.65rem] font-bold px-2 py-0.5 rounded-full bg-[#EDF5EE] dark:bg-[#14231B] text-[#224D3A] dark:text-[#87A774]">
                    {answeredCount} obs
                  </span>
                )}
              </div>
              <LiveCandidateList
                results={previewData?.results ?? []}
                isLoading={isPreviewLoading}
              />
            </div>
          </div>
        </section>
      </div>

      {/* =========================================================================
          MOBILE STICKY BOTTOM ACTION BAR
          Positioned above the mobile bottom navigation dock.
          ========================================================================= */}
      <div className="fixed bottom-[74px] sm:bottom-[76px] inset-x-0 z-30 px-3 sm:px-4 lg:hidden pointer-events-none pb-[env(safe-area-inset-bottom)]">
        <div className="pointer-events-auto max-w-md mx-auto w-full rounded-2xl bg-white/95 dark:bg-[#14221A]/95 backdrop-blur-lg border border-stone-200/90 dark:border-white/10 shadow-lg shadow-black/10 p-2.5 sm:p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 pl-1">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                answeredCount > 0
                  ? "bg-[#224D3A] dark:bg-[#87A774] animate-pulse"
                  : "bg-stone-300 dark:bg-stone-600"
              }`}
              aria-hidden="true"
            />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#1B3B2B] dark:text-[#EFF5EF] truncate">
                {answeredCount > 0
                  ? t("checker.mobile_selected_label", { count: answeredCount })
                  : t("checker.select_min_one")}
              </span>
              <span className="text-[0.65rem] text-[#607366] dark:text-[#94A79C] truncate">
                {answeredCount > 0
                  ? t("checker.symptoms_selected", { count: answeredCount })
                  : t("checker.tap_if_observed")}
              </span>
            </div>
          </div>

          <button
            type="button"
            disabled={answeredCount === 0 || isSubmitting}
            onClick={() => void handleSubmit()}
            className="py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#224D3A] text-white dark:bg-[#87A774] dark:text-[#0E1712] shadow-sm flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all select-none"
          >
            {isSubmitting ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <>
                <Stethoscope size={15} />
                <span>
                  {answeredCount > 0
                    ? `${t("checker.mobile_analyze_now")} (${answeredCount})`
                    : t("checker.get_result")}
                </span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
