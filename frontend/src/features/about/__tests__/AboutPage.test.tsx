import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { AboutPage } from "../AboutPage";
import "@/i18n";
import i18n from "@/i18n";

describe("AboutPage Component", () => {
  it("renders all editorial sections and key headings matching the target in English", async () => {
    await i18n.changeLanguage("en");

    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    );

    // Section 1: Editorial Header
    expect(screen.getByRole("banner", { name: "About Sunflower Studio" })).toBeInTheDocument();
    expect(screen.getByText("— ABOUT US")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/ABOUT/i);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/SUNFLOWER STUDIO/i);

    // Section 2: Wide Sunflower Hero Photograph
    const heroImg = screen.getByAltText(/Sunflower field at sunrise with a vibrant blooming sunflower in focus/i);
    expect(heroImg).toBeInTheDocument();

    // Section 3: Platform Introduction
    expect(
      screen.getByText(/Sunflower Studio is an agricultural expert system that helps identify possible sunflower diseases/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/It provides practical, easy-to-understand guidance to support healthier sunflower crops/i)
    ).toBeInTheDocument();

    // Section 4: Information Grid
    expect(screen.getByRole("heading", { name: "Our Purpose" })).toBeInTheDocument();
    expect(
      screen.getByText(/To make sunflower disease identification easier, more accessible, and more reliable/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What We Do" })).toBeInTheDocument();
    expect(screen.getByText("Symptom-Based Diagnosis")).toBeInTheDocument();
    expect(screen.getByText("Disease Knowledge Library")).toBeInTheDocument();
    expect(screen.getByText("Bilingual Access")).toBeInTheDocument();
    expect(screen.getByText("Field-Friendly Design")).toBeInTheDocument();
    expect(
      screen.getByAltText(/Sunflower leaf detail displaying natural foliage veins and symptom patterns/i)
    ).toBeInTheDocument();

    // Section 5: Our Mission
    expect(screen.getByRole("heading", { name: "Our Mission" })).toBeInTheDocument();
    expect(
      screen.getByText("Helping growers make more informed decisions for healthier sunflower crops.")
    ).toBeInTheDocument();

    // Section 6: Who Can Use It
    expect(screen.getByRole("heading", { name: "Who Can Use It" })).toBeInTheDocument();
    expect(screen.getByText("Sunflower Growers")).toBeInTheDocument();
    expect(screen.getByText("Agricultural Students")).toBeInTheDocument();
    expect(screen.getByText("Agronomists & Researchers")).toBeInTheDocument();

    // Section 8: Agricultural Advisory Note
    expect(
      screen.getByText(/Sunflower Studio provides agricultural decision-support information based on observed symptoms/i)
    ).toBeInTheDocument();

    // Section 9: Closing CTA
    expect(
      screen.getByRole("heading", { name: "Explore Sunflower Health Today" })
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Check Symptoms/i })).toHaveAttribute("href", "/check");
    expect(screen.getByRole("link", { name: /Explore Diseases/i })).toHaveAttribute("href", "/diseases");
  });

  it("renders correctly in Khmer language", async () => {
    await i18n.changeLanguage("km");

    render(
      <MemoryRouter>
        <AboutPage />
      </MemoryRouter>
    );

    expect(screen.getByText("— អំពីយើង")).toBeInTheDocument();
    expect(
      screen.getByText(/Sunflower Studio គឺជាប្រព័ន្ធជំនាញក្សេត្រសាស្ត្រដែលជួយកំណត់អត្តសញ្ញាណជំងឺផ្កាឈូករ័ត្ន/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "គោលបំណងរបស់យើង" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "អ្វីដែលយើងធ្វើ" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "បេសកកម្មរបស់យើង" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "តើនរណាខ្លះអាចប្រើប្រាស់បាន?" })).toBeInTheDocument();
    expect(
      screen.getByText(/Sunflower Studio ផ្តល់ព័ត៌មានគាំទ្រការសម្រេចចិត្តផ្នែកកសិកម្មផ្អែកលើការសង្កេតរោគសញ្ញា/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "ស្វែងយល់ពីសុខភាពផ្កាឈូករ័ត្នថ្ងៃនេះ" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ពិនិត្យរោគសញ្ញា/i })).toHaveAttribute("href", "/check");
    expect(screen.getByRole("link", { name: /ស្វែងយល់បណ្ណាល័យជំងឺ/i })).toHaveAttribute("href", "/diseases");
  });
});
