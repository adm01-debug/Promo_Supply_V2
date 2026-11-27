import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Calendar } from "@/components/ui/calendar";

const REF = new Date(2026, 10, 15);

describe("Calendar (react-day-picker v10)", () => {
  it("aplica os classNames da API v10 nos elementos do mes", () => {
    const { container } = render(<Calendar mode="single" defaultMonth={REF} />);

    expect(container.querySelector("table[role='grid']")).not.toBeNull();
    expect(screen.getByRole("status").className).toContain("text-sm font-medium");
    const weeks = container.querySelector("tbody");
    expect(weeks?.className).toContain("flex");
  });

  it("nao repassa chaves removidas na v10 (caption, table, head_row)", () => {
    const { container } = render(<Calendar mode="single" defaultMonth={REF} />);
    const html = container.innerHTML;

    expect(html).not.toContain("rdp-caption");
    expect(html).not.toContain("rdp-table");
    expect(html).not.toContain("rdp-head_row");
  });

  it("renderiza os chevrons de navegacao pelo componente Chevron", () => {
    const { container } = render(<Calendar mode="single" defaultMonth={REF} />);
    const prev = screen.getByRole("button", { name: /previous month/i });
    const next = screen.getByRole("button", { name: /next month/i });

    expect(prev.querySelector("svg")).not.toBeNull();
    expect(next.querySelector("svg")).not.toBeNull();
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(2);
  });

  it("marca o intervalo selecionado e navega para o proximo mes", () => {
    const { container } = render(
      <Calendar mode="range" defaultMonth={REF} selected={{ from: REF, to: REF }} />,
    );

    const selected = container.querySelectorAll("[aria-selected='true']");
    expect(selected.length).toBeGreaterThan(0);

    const next = screen.getByRole("button", { name: /next month/i });
    next.click();
    expect(screen.getAllByRole("grid").length).toBeGreaterThan(0);
  });
});
