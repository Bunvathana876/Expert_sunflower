import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { CheckerPage } from "../pages/CheckerPage";
import * as DiagnosisHooks from "../hooks";
import * as DiagnosisApi from "../api";
import "@/i18n";

const mockNavigate = vi.fn();
vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockGroupedSymptoms = [
  {
    category: { id: 1, code: "leaf", sort_order: 1, label: "Leaves" },
    symptoms: [
      { id: 101, code: "leaf_spot", label: "Brown leaf spots", is_environmental: false },
      { id: 102, code: "leaf_yellow", label: "Yellowing foliage", is_environmental: false },
    ],
  },
  {
    category: { id: 2, code: "stem", sort_order: 2, label: "Stems" },
    symptoms: [
      { id: 201, code: "stem_canker", label: "Stem canker lesion", is_environmental: false },
    ],
  },
];

describe("CheckerPage UX and Interaction", () => {
  const mockMutateAsync = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.spyOn(DiagnosisHooks, "useSymptomsGrouped").mockReturnValue({
      data: mockGroupedSymptoms,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    } as unknown as ReturnType<typeof DiagnosisHooks.useSymptomsGrouped>);

    vi.spyOn(DiagnosisHooks, "useSubmitDiagnosis").mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: false,
      isError: false,
    } as unknown as ReturnType<typeof DiagnosisHooks.useSubmitDiagnosis>);

    vi.spyOn(DiagnosisApi, "previewDiagnosis").mockResolvedValue({
      results: [],
      next_best_questions: [],
    } as unknown as Awaited<ReturnType<typeof DiagnosisApi.previewDiagnosis>>);
  });

  // 1. Selecting a symptom
  it("selects a symptom when row is clicked and gives visual feedback", () => {
    render(
      <MemoryRouter>
        <CheckerPage />
      </MemoryRouter>,
    );

    const symptomRow = screen.getByRole("checkbox", { name: /Brown leaf spots/i });
    expect(symptomRow).toHaveAttribute("aria-checked", "false");

    fireEvent.click(symptomRow);
    expect(symptomRow).toHaveAttribute("aria-checked", "true");
  });

  // 2. Deselecting a symptom
  it("deselects a symptom when row is clicked a second time", () => {
    render(
      <MemoryRouter>
        <CheckerPage />
      </MemoryRouter>,
    );

    const symptomRow = screen.getByRole("checkbox", { name: /Brown leaf spots/i });
    fireEvent.click(symptomRow);
    expect(symptomRow).toHaveAttribute("aria-checked", "true");

    fireEvent.click(symptomRow);
    expect(symptomRow).toHaveAttribute("aria-checked", "false");
  });

  // 3. Updating selected count
  it("updates selected symptom count across sidebar and action bar", () => {
    render(
      <MemoryRouter>
        <CheckerPage />
      </MemoryRouter>,
    );

    // Initial state: 0 selected
    expect(screen.getByText(/0 selected/i)).toBeInTheDocument();

    const symptomRow1 = screen.getByRole("checkbox", { name: /Brown leaf spots/i });
    fireEvent.click(symptomRow1);

    expect(screen.getAllByText(/1 selected/i).length).toBeGreaterThan(0);

    const symptomRow2 = screen.getByRole("checkbox", { name: /Yellowing foliage/i });
    fireEvent.click(symptomRow2);

    expect(screen.getAllByText(/2 selected/i).length).toBeGreaterThan(0);
  });

  // 4. Enabling and disabling Analyze Symptoms
  it("disables Analyze button when count is 0 and enables when symptoms selected", () => {
    render(
      <MemoryRouter>
        <CheckerPage />
      </MemoryRouter>,
    );

    const [desktopBtn] = screen.getAllByRole("button", { name: /Analyze/i });
    expect(desktopBtn).toBeDefined();
    if (!desktopBtn) throw new Error("Analyze button not found");
    expect(desktopBtn).toBeDisabled();
    expect(
      screen.getAllByText(/Select at least one observed symptom to analyze/i).length,
    ).toBeGreaterThan(0);

    // Select a symptom
    const symptomRow = screen.getByRole("checkbox", { name: /Brown leaf spots/i });
    fireEvent.click(symptomRow);

    expect(desktopBtn).toBeEnabled();
    expect(screen.getByText(/Analyze 1 Symptoms/i)).toBeInTheDocument();
  });

  // 5. Preserving selections when switching categories
  it("preserves active selections when switching plant part categories", () => {
    render(
      <MemoryRouter>
        <CheckerPage />
      </MemoryRouter>,
    );

    // Select symptom in Leaves category
    const leafSymptom = screen.getByRole("checkbox", { name: /Brown leaf spots/i });
    fireEvent.click(leafSymptom);

    // Switch to Stems category
    const stemCategoryBtn = screen.getByRole("button", { name: /Stems/i });
    fireEvent.click(stemCategoryBtn);

    // Verify Stems symptoms displayed
    expect(screen.getByRole("checkbox", { name: /Stem canker lesion/i })).toBeInTheDocument();

    // Verify selection is still preserved in Your Observations
    expect(screen.getAllByText(/1 selected/i).length).toBeGreaterThan(0);

    // Switch back to Leaves
    const leafCategoryBtn = screen.getByRole("button", { name: /Leaves/i });
    fireEvent.click(leafCategoryBtn);

    const reloadedLeafSymptom = screen.getByRole("checkbox", { name: /Brown leaf spots/i });
    expect(reloadedLeafSymptom).toHaveAttribute("aria-checked", "true");
  });

  // 6. Search results and empty states
  it("filters symptoms by search query and shows empty state when nothing matches", () => {
    render(
      <MemoryRouter>
        <CheckerPage />
      </MemoryRouter>,
    );

    const searchInput = screen.getByPlaceholderText(/Search symptoms/i);

    // Search for match
    fireEvent.change(searchInput, { target: { value: "Yellowing" } });
    expect(screen.getByRole("checkbox", { name: /Yellowing foliage/i })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: /Brown leaf spots/i })).not.toBeInTheDocument();

    // Search for non-match
    fireEvent.change(searchInput, { target: { value: "UnknownTerm123" } });
    expect(screen.getByText(/No symptoms match "UnknownTerm123"/i)).toBeInTheDocument();
  });

  // 7. Clear All behavior
  it("clears all selected symptoms when Clear All is clicked and confirmed", () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(
      <MemoryRouter>
        <CheckerPage />
      </MemoryRouter>,
    );

    // Select symptoms
    fireEvent.click(screen.getByRole("checkbox", { name: /Brown leaf spots/i }));
    expect(screen.getAllByText(/1 selected/i).length).toBeGreaterThan(0);

    // Click Clear All
    const clearAllBtn = screen.getByRole("button", { name: /Clear All/i });
    fireEvent.click(clearAllBtn);

    expect(window.confirm).toHaveBeenCalled();
    expect(screen.getByText(/0 selected/i)).toBeInTheDocument();
    expect(screen.getByText(/No observations yet/i)).toBeInTheDocument();
  });

  // 8. Preventing duplicate submissions
  it("submits diagnosis and prevents duplicate clicks while submitting", async () => {
    mockMutateAsync.mockResolvedValue({ session_id: "sess_123" });

    render(
      <MemoryRouter>
        <CheckerPage />
      </MemoryRouter>,
    );

    // Select a symptom
    fireEvent.click(screen.getByRole("checkbox", { name: /Brown leaf spots/i }));

    const [desktopAnalyzeBtn] = screen.getAllByRole("button", {
      name: /Analyze 1 Symptoms/i,
    });
    expect(desktopAnalyzeBtn).toBeDefined();
    if (!desktopAnalyzeBtn) throw new Error("Desktop analyze button not found");
    fireEvent.click(desktopAnalyzeBtn);

    // Second click while in-flight or analyzing should be prevented
    expect(desktopAnalyzeBtn).toBeDisabled();
    fireEvent.click(desktopAnalyzeBtn);
    expect(mockMutateAsync).toHaveBeenCalledTimes(1);

    await waitFor(
      () => {
        expect(mockNavigate).toHaveBeenCalledWith("/check/sess_123");
      },
      { timeout: 3000 },
    );
  });
});
