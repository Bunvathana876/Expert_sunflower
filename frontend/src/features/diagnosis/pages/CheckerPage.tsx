import type React from "react";
import { useReducer, useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router";
import { useTranslation } from "react-i18next";
import {
  Search,
  Leaf,
  X,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Stethoscope,
  Layers,
  HelpCircle,
  CheckCircle2,
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
  const [offlineSaved, setOfflineSaved] = useState(false);

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
    <div className="space-y-6 pb-6">
      <AnalysisProgressModal isOpen={isAnalyzing} symptomCount={answeredCount} />

      {offlineSaved && (
        <div className="rounded-2xl border border-[#80A67C]/40 bg-[#E8F1E6] p-5 text-[#244A34] dark:bg-[#19382A] dark:text-[#D9EAD7]" role="status">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <h2 className="font-bold">{t("offline.saved_offline_title")}</h2>
                <p className="mt-1 text-sm leading-6">{t("offline.saved_offline_desc")}</p>
              </div>
            </div>
            <button type="button" onClick={() => { setOfflineSaved(false); dispatch({ type: "RESET" }); }} className="rounded-full bg-[#224D3A] px-4 py-2 text-sm font-semibold text-white dark:bg-[#A8C695] dark:text-[#112519]">
              {t("checker.reset_all")}
            </button>
          </div>
        </div>
      )}

      {/* A friendly introduction and clear three-part workflow, not a progress quiz. */}
      <header className="overflow-hidden rounded-[1.75rem] border border-[#D9E5D6] bg-[#F8F7F1] px-6 py-7 shadow-sm dark:border-white/10 dark:bg-[#172B20] sm:px-8 sm:py-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="max-w-2xl space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#C8DABF] bg-white/85 px-3 py-1.5 text-xs font-bold text-[#396449] dark:border-[#72966C]/35 dark:bg-[#21392A] dark:text-[#C0D6B4]">
              <Stethoscope size={15} aria-hidden="true" />
              {i18n.language.startsWith("km") ? "ពិនិត្យសុខភាពដំណាំ" : "PLANT HEALTH CHECK"}
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#1C412D] dark:text-[#F3F6EF] sm:text-4xl">
              {t("checker.title")}
            </h1>
            <p className="max-w-xl text-sm leading-7 text-[#4E6654] dark:text-[#C3D6C5] sm:text-base">
              {t("checker.subtitle")}
            </p>
          </div>
          <div className="flex w-fit items-center gap-2 rounded-xl border border-[#CBDDC7] bg-white px-4 py-2 text-[#244F38] dark:border-[#638469]/40 dark:bg-[#213C2B] dark:text-[#D6E7D4]">
            <CheckCircle2 size={18} className="text-[#648A57]" aria-hidden="true" />
            <span className="text-sm font-semibold">
              {answeredCount} / {totalSymptoms}
              <span className="ml-1 font-normal opacity-80">
                {i18n.language.startsWith("km") ? "បានសម្គាល់" : "marked"}
              </span>
            </span>
          </div>
        </div>
        <div className="mt-7 grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label={i18n.language.startsWith("km") ? "ដំណាក់កាលពិនិត្យ" : "Diagnosis steps"}>
          {[
            { number: "1", label: i18n.language.startsWith("km") ? "ជ្រើសផ្នែកដំណាំ" : "Choose plant part" },
            { number: "2", label: i18n.language.startsWith("km") ? "សម្គាល់រោគសញ្ញា" : "Mark symptoms" },
            { number: "3", label: i18n.language.startsWith("km") ? "ពិនិត្យលទ្ធផល" : "Review results" },
          ].map((step) => (
            <div key={step.number} className="flex items-center gap-3 rounded-xl border border-[#D9E5D6] bg-white/65 px-3 py-2.5 dark:border-white/10 dark:bg-[#21372A]">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#E5EFDF] text-sm font-bold text-[#28513A] dark:bg-[#314E37] dark:text-[#D5E7CC]">{step.number}</span>
              <span className="text-sm font-semibold text-[#365444] dark:text-[#D4E0D3]">{step.label}</span>
            </div>
          ))}
        </div>
      </header>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-2xl border border-[#DEE7DA] bg-white/90 p-5 shadow-sm dark:border-white/10 dark:bg-[#192B21] sm:p-6" aria-label={t("checker.select_plant_part")}>
            <div className="mb-5 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#E9F1E5] text-[#2E6446] dark:bg-[#263F2C] dark:text-[#B8D4AD]">
                <Leaf size={20} aria-hidden="true" />
              </span>
              <div className="space-y-1">
                <h2 className="text-lg font-bold text-[#1F422F] dark:text-[#F2F5EF]">{t("checker.select_plant_part")}</h2>
                <p className="text-sm leading-6 text-[#6A796C] dark:text-[#B6C9B9]">
                  {i18n.language.startsWith("km")
                    ? "ជ្រើសរើសកន្លែងដែលអ្នកសង្កេតឃើញបញ្ហា។"
                    : "Where do you notice a problem on your sunflower?"}
                </p>
              </div>
            </div>
            <CategorySelector
              categories={categories}
              activeCategoryId={state.activeCategoryId}
              onSelect={(id) => dispatch({ type: "SELECT_CATEGORY", categoryId: id })}
              symptomCounts={Object.fromEntries(groupedSymptoms.map((group) => [group.category.id, group.symptoms.length]))}
            />
          </section>

          <section className="overflow-hidden rounded-2xl border border-[#DEE7DA] bg-white/95 shadow-sm dark:border-white/10 dark:bg-[#192B21]" aria-label={i18n.language.startsWith("km") ? "រោគសញ្ញា" : "Symptom selection"}>
            <div className="border-b border-[#E2E9DF] p-5 dark:border-white/10 sm:p-6">
              <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                <div>
                  <h2 className="flex items-center gap-2 text-lg font-bold text-[#1F422F] dark:text-[#F2F5EF]">
                    <Layers size={19} className="text-[#729963]" aria-hidden="true" />
                    {searchQuery
                      ? (i18n.language.startsWith("km") ? "លទ្ធផលស្វែងរក" : "Search results")
                      : (activeGroup?.category.label ?? t("checker.select_plant_part"))}
                  </h2>
                  <p className="mt-1 text-sm text-[#6A796C] dark:text-[#B6C9B9]">
                    {i18n.language.startsWith("km")
                      ? "ចុចលើរោគសញ្ញាដែលអ្នកសង្កេតឃើញ។ អ្នកមិនចាំបាច់សម្គាល់ទាំងអស់ទេ។"
                      : "Tap the symptoms you can see. You don't need to check every item."}
                  </p>
                </div>
                <span className="w-fit rounded-full bg-[#EDF3EA] px-3 py-1 text-xs font-bold text-[#48644E] dark:bg-[#263F2C] dark:text-[#C2D8BD]">
                  {searchQuery ? (filteredSymptoms?.length ?? 0) : (activeGroup?.symptoms.length ?? 0)}
                  {" "}{i18n.language.startsWith("km") ? "រោគសញ្ញា" : "symptoms"}
                </span>
              </div>
              <div className="relative">
                <Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#77917D]" aria-hidden="true" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder={t("checker.search_placeholder")}
                  aria-label={t("checker.search_placeholder")}
                  className="min-h-12 w-full rounded-xl border border-[#D6E2D4] bg-[#F8FAF6] py-3 pl-11 pr-11 text-sm text-[#254332] outline-none transition-colors placeholder:text-[#809387] focus:border-[#77A46F] focus:ring-2 focus:ring-[#87A774]/25 dark:border-[#47604A] dark:bg-[#13251B] dark:text-[#F2F5EF] dark:placeholder:text-[#A0B5A4]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#667D70] hover:bg-[#E7F0E5] dark:text-[#BCD0C0] dark:hover:bg-[#28412E]"
                    aria-label={t("common.close")}
                  >
                    <X size={17} aria-hidden="true" />
                  </button>
                )}
              </div>

              {!searchQuery && quickPickSymptoms.length > 0 && (
                <details className="group mt-4 rounded-xl border border-[#E4EBE0] bg-[#FAFBF8] dark:border-white/10 dark:bg-[#1F3426]">
                  <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-semibold text-[#45674B] marker:hidden dark:text-[#C3D8BD]">
                    <Sparkles size={16} className="text-[#8C9C54]" aria-hidden="true" />
                    {i18n.language.startsWith("km") ? "រោគសញ្ញាដែលបានណែនាំ" : "Suggested symptoms"}
                    <span className="ml-auto text-xs font-normal opacity-70">
                      {i18n.language.startsWith("km") ? "បង្ហាញ / លាក់" : "Show / hide"}
                    </span>
                  </summary>
                  <div className="flex flex-wrap gap-2 border-t border-[#E4EBE0] p-3 dark:border-white/10">
                    {quickPickSymptoms.map((symptom) => {
                      const isSelected = state.answers[symptom.id] === "yes";
                      return (
                        <button
                          key={symptom.id}
                          type="button"
                          aria-pressed={isSelected}
                          onClick={() => handleAnswer(symptom.id, isSelected ? "unknown" : "yes")}
                          className={isSelected
                            ? "inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[#224D3A] px-3 py-2 text-xs font-semibold text-white dark:bg-[#A7C58C] dark:text-[#102416]"
                            : "inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[#D7E3D4] bg-white px-3 py-2 text-xs font-medium text-[#3A5745] hover:border-[#8CB785] dark:border-[#4A654E] dark:bg-[#1B3022] dark:text-[#E1EEE0]"}
                        >
                          <span aria-hidden="true">{isSelected ? "✓" : "+"}</span>
                          {symptom.label}
                        </button>
                      );
                    })}
                  </div>
                </details>
              )}
            </div>

            {/* Only the symptom rows scroll; search, categories, and analysis remain visible. */}
            <div
              role="region"
              aria-label={i18n.language.startsWith("km") ? "បញ្ជីរោគសញ្ញាដែលអាចរមូរបាន" : "Scrollable symptom list"}
              tabIndex={0}
              className="max-h-[52vh] space-y-2 overflow-y-auto overscroll-contain px-4 py-4 pr-3 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#87A774] sm:max-h-[480px] sm:px-5 sm:py-5 sm:pr-4 lg:max-h-[520px]"
              style={{ scrollbarGutter: "stable" }}
            >
              {searchQuery ? (
                filteredSymptoms && filteredSymptoms.length > 0 ? (
                  filteredSymptoms.map(({ symptom, categoryLabel }) => (
                    <div key={symptom.id}>
                      <p className="mb-1 ml-1 text-xs font-medium text-[#738777] dark:text-[#AFC3B1]">{categoryLabel}</p>
                      <SymptomToggle symptom={symptom} currentAnswer={state.answers[symptom.id] ?? "unknown"} onAnswer={handleAnswer} />
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-10 text-center text-sm text-[#668070] dark:text-[#B4C7B8]">
                    {t("checker.no_search_results", { query: searchQuery })}
                  </div>
                )
              ) : activeGroup && activeGroup.symptoms.length > 0 ? (
                activeGroup.symptoms.map((symptom) => (
                  <SymptomToggle key={symptom.id} symptom={symptom} currentAnswer={state.answers[symptom.id] ?? "unknown"} onAnswer={handleAnswer} />
                ))
              ) : (
                <p className="py-8 text-center text-sm text-[#668070] dark:text-[#B4C7B8]">
                  {i18n.language.startsWith("km") ? "មិនមានរោគសញ្ញាសម្រាប់ផ្នែកនេះទេ។" : "No symptoms are listed for this plant part."}
                </p>
              )}
            </div>
            {(searchQuery ? (filteredSymptoms?.length ?? 0) : (activeGroup?.symptoms.length ?? 0)) > 5 && (
              <p className="flex items-center gap-2 border-t border-[#E2E9DF] px-5 py-2.5 text-xs font-medium text-[#66816C] dark:border-white/10 dark:text-[#BED1C0]">
                <span aria-hidden="true">↓</span>
                {i18n.language.startsWith("km")
                  ? "រមូរក្នុងបញ្ជីនេះ ដើម្បីមើលរោគសញ្ញាបន្ថែម។"
                  : "Scroll inside this list to see more symptoms."}
              </p>
            )}
          </section>

          {previewData?.next_best_questions && previewData.next_best_questions.length > 0 && (
            <section className="rounded-2xl border border-[#DADFBF] bg-[#F9F8ED] p-5 dark:border-[#7F8052]/40 dark:bg-[#2A3022]" aria-labelledby="suggested-checks-heading">
              <h2 id="suggested-checks-heading" className="flex items-center gap-2 text-sm font-bold text-[#5E6538] dark:text-[#E1E5BC]">
                <HelpCircle size={17} aria-hidden="true" />
                {t("checker.next_best_title")}
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[#56644B] dark:text-[#D5DDC5]">
                {previewData.next_best_questions.slice(0, 4).map((question) => (
                  <li key={question.symptom}>{question.symptom}</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24" aria-label={i18n.language.startsWith("km") ? "សង្ខេបរោគសញ្ញា" : "Diagnosis summary"}>
          <section className="overflow-hidden rounded-2xl border border-[#D6E4D3] bg-white shadow-sm dark:border-white/10 dark:bg-[#192B21]">
            <div className="border-b border-[#E2E9DF] bg-[#F1F5EC] px-5 py-4 dark:border-white/10 dark:bg-[#213B2A]">
              <h2 className="text-base font-bold text-[#244A34] dark:text-[#EDF3EA]">
                {i18n.language.startsWith("km") ? "រោគសញ្ញាដែលបានសម្គាល់" : "Your observations"}
              </h2>
              <p className="mt-1 text-sm text-[#627969] dark:text-[#C0D0C1]">
                {answeredCount === 0
                  ? (i18n.language.startsWith("km") ? "ជ្រើសរើសយ៉ាងតិចមួយរោគសញ្ញា។" : "Select at least one observed symptom to begin.")
                  : t("checker.answered_count", { count: answeredCount, total: totalSymptoms })}
              </p>
            </div>

            <div className="space-y-4 p-5">
              {selectedSymptomsList.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex justify-between gap-3">
                    <span className="text-xs font-bold uppercase tracking-wide text-[#6A826C] dark:text-[#B6CAB6]">{t("checker.selected_tray_title")}</span>
                    <button type="button" onClick={handleClearAll} className="inline-flex items-center gap-1 text-xs font-semibold text-[#986745] hover:underline dark:text-[#E6AD87]">
                      <RotateCcw size={13} aria-hidden="true" />
                      {t("checker.clear_all")}
                    </button>
                  </div>
                  <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
                    {selectedSymptomsList.map(({ id, item, answer }) => (
                      <li key={id} className="flex items-start justify-between gap-2 rounded-xl border border-[#DCE8D9] bg-[#F7FAF5] p-2.5 dark:border-white/10 dark:bg-[#213B2A]">
                        <span className="min-w-0 flex items-start gap-2 text-xs leading-5 text-[#35553F] dark:text-[#DDEBD9]">
                          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-[#658A58]" aria-hidden="true" />
                          <span>{item?.label ?? (i18n.language.startsWith("km") ? "រោគសញ្ញា" : "Symptom") + " #" + id} {answer === "no" ? "✕" : ""}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleAnswer(id, "unknown")}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#68846F] hover:bg-[#DCEBDA] dark:text-[#BDD2BD] dark:hover:bg-[#304B36]"
                          aria-label={t("checker.mark_clear") + ": " + (item?.label ?? String(id))}
                        >
                          <X size={15} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-[#D0DEC9] bg-[#F8FAF6] px-4 py-6 text-center dark:border-[#536A54] dark:bg-[#182C20]">
                  <Leaf size={24} className="mx-auto mb-2 text-[#91AD82]" aria-hidden="true" />
                  <p className="text-sm leading-6 text-[#708575] dark:text-[#BED0BE]">
                    {i18n.language.startsWith("km") ? "រោគសញ្ញាដែលអ្នកជ្រើសរើសនឹងបង្ហាញនៅទីនេះ។" : "Symptoms you mark will appear here."}
                  </p>
                </div>
              )}

              <button
                type="button"
                disabled={answeredCount === 0 || submitMutation.isPending || isAnalyzing}
                onClick={() => void handleSubmit()}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#224D3A] px-4 py-3 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#193B2C] disabled:cursor-not-allowed disabled:bg-[#D5E1D2] disabled:text-[#66806C] dark:bg-[#A9C58F] dark:text-[#102417] dark:hover:bg-[#B9D5A1] dark:disabled:bg-[#3C5641] dark:disabled:text-[#A9BCA8]"
              >
                <Stethoscope size={19} aria-hidden="true" />
                {answeredCount ? t("checker.analyze_count", { count: answeredCount }) : t("checker.get_result")}
                <ArrowRight size={17} aria-hidden="true" />
              </button>
              {submitMutation.isError && (
                <p className="text-sm font-medium leading-6 text-[#B34F46] dark:text-[#F5B7A7]" role="alert">{t("checker.submit_error")}</p>
              )}
            </div>
          </section>

          {answeredCount > 0 && (
            <section className="rounded-2xl border border-[#D6E4D3] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#192B21]">
              <h2 className="text-sm font-bold text-[#244A34] dark:text-[#EEF3EC]">{t("checker.live_candidates_title")}</h2>
              <p className="mt-1 mb-3 text-xs leading-5 text-[#708476] dark:text-[#B8CCBA]">
                {i18n.language.startsWith("km") ? "លទ្ធផលបឋមដែលអាចផ្លាស់ប្តូរបានតាមរោគសញ្ញា។" : "Early matches can change as you select symptoms."}
              </p>
              <LiveCandidateList results={previewData?.results ?? []} isLoading={isPreviewLoading} />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
