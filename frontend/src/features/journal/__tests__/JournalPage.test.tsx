import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { JournalPage } from "../JournalPage";
import { journalKey, localDate, parseJournal, readSnapshot } from "../store";
import i18n from "@/i18n";

const auth = vi.hoisted(() => ({ user: null as null | { id: number }, isLoading: false }));
vi.mock("@/features/auth", () => ({ useAuth: () => auth }));

function showJournal(route = "/journal") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <JournalPage />
    </MemoryRouter>,
  );
}
function fillObservation() {
  const [firstButton] = screen.getAllByRole("button", { name: "New observation" });
  if (firstButton) {
    fireEvent.click(firstButton);
  }
  fireEvent.change(screen.getByLabelText("Field or plant name"), {
    target: { value: "North field" },
  });
  fireEvent.change(screen.getByLabelText(/What did you notice/), {
    target: { value: "Brown spots on three leaves." },
  });
  fireEvent.change(screen.getByLabelText("Follow-up date (optional)"), {
    target: { value: localDate() },
  });
  fireEvent.click(screen.getByRole("button", { name: "Save observation" }));
}

describe("Field journal user flows", () => {
  beforeEach(async () => {
    localStorage.clear();
    vi.restoreAllMocks();
    auth.user = null;
    auth.isLoading = false;
    await i18n.changeLanguage("en");
    HTMLDialogElement.prototype.showModal = function () {
      this.setAttribute("open", "");
    };
    HTMLDialogElement.prototype.close = function () {
      this.removeAttribute("open");
    };
  });
  it("creates, reloads, edits, resolves, reopens, searches, and deletes an observation", () => {
    const first = showJournal();
    fillObservation();
    expect(screen.getByRole("status")).toHaveTextContent("Observation saved.");
    expect(parseJournal(readSnapshot(journalKey()))).toHaveLength(1);
    first.unmount();
    showJournal();
    expect(screen.getByRole("heading", { name: "North field" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Edit North field/ }));
    fireEvent.change(screen.getByLabelText(/What did you notice/), {
      target: { value: "Leaves are improving." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save observation" }));
    expect(screen.getByText("Leaves are improving.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mark resolved" }));
    expect(parseJournal(readSnapshot(journalKey()))[0]?.status).toBe("resolved");
    fireEvent.click(screen.getByRole("button", { name: "Reopen" }));
    expect(parseJournal(readSnapshot(journalKey()))[0]?.status).toBe("monitoring");
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "nothing" } });
    expect(screen.getByText("No observations match.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset filters" }));
    vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: /Delete North field/ }));
    expect(screen.getByRole("heading", { name: "North field" })).toBeInTheDocument();
    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: /Delete North field/ }));
    expect(parseJournal(readSnapshot(journalKey()))).toHaveLength(0);
  });
  it("keeps the dialog and draft intact when saving fails", () => {
    showJournal();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("Storage full");
    });
    fillObservation();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText("Field or plant name")).toHaveValue("North field");
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent(
      "Could not save",
    );
  });
  it("does not expose guest entries or an open guest draft after switching accounts", () => {
    const view = showJournal();
    fillObservation();
    const [newObsBtn] = screen.getAllByRole("button", { name: "New observation" });
    if (newObsBtn) {
      fireEvent.click(newObsBtn);
    }
    auth.user = { id: 7 };
    view.rerender(
      <MemoryRouter>
        <JournalPage />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "North field" })).not.toBeInTheDocument();
    expect(parseJournal(readSnapshot(journalKey()))).toHaveLength(1);
  });
  it("prefills a diagnosis note without saving until the user submits", () => {
    showJournal("/journal?observation=Possible%20match%3A%20Rust");
    expect(screen.getByLabelText(/What did you notice/)).toHaveValue("Possible match: Rust");
    expect(readSnapshot(journalKey())).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
  it("preserves corrupted data and disables creation", () => {
    localStorage.setItem(journalKey(), "broken");
    showJournal();
    expect(screen.getByRole("alert")).toHaveTextContent("Existing data has not been overwritten");
    for (const button of screen.getAllByRole("button", { name: "New observation" }))
      expect(button).toBeDisabled();
    expect(readSnapshot(journalKey())).toBe("broken");
  });

  it("waits for account restoration before showing saved records", () => {
    const first = showJournal();
    fillObservation();
    first.unmount();
    auth.isLoading = true;
    showJournal();
    expect(screen.queryByRole("heading", { name: "North field" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "New observation" })).toBeDisabled();
  });

  it("renders the journal and observation form in Khmer", async () => {
    await i18n.changeLanguage("km");
    showJournal();
    expect(screen.getByRole("heading", { name: "កំណត់ហេតុចម្ការ" })).toBeInTheDocument();
    const [kmNewBtn] = screen.getAllByRole("button", { name: "ការសង្កេតថ្មី" });
    if (kmNewBtn) {
      fireEvent.click(kmNewBtn);
    }
    expect(screen.getByLabelText("ឈ្មោះចម្ការ ឬរុក្ខជាតិ")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "រក្សាទុកការសង្កេត" })).toBeInTheDocument();
  });
});
