import { describe, it, expect } from "vitest";
import { format } from "date-fns/format";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import { parseISO } from "date-fns/parseISO";
import { differenceInDays } from "date-fns/differenceInDays";
import { differenceInHours } from "date-fns/differenceInHours";
import { isPast } from "date-fns/isPast";
import { isToday } from "date-fns/isToday";
import { isSameDay } from "date-fns/isSameDay";
import { isSameMonth } from "date-fns/isSameMonth";
import { startOfMonth } from "date-fns/startOfMonth";
import { endOfMonth } from "date-fns/endOfMonth";
import { startOfWeek } from "date-fns/startOfWeek";
import { eachDayOfInterval } from "date-fns/eachDayOfInterval";
import { addDays } from "date-fns/addDays";
import { addMonths } from "date-fns/addMonths";
import { addWeeks } from "date-fns/addWeeks";
import { subDays } from "date-fns/subDays";
import { subMonths } from "date-fns/subMonths";
import { ptBR } from "date-fns/locale/pt-BR";

describe("date-fns subpath imports smoke test", () => {
  const ref = new Date("2025-01-15T12:00:00Z");

  it("all imported exports are callable functions", () => {
    const fns = [
      format, formatDistanceToNow, parseISO,
      differenceInDays, differenceInHours,
      isPast, isToday, isSameDay, isSameMonth,
      startOfMonth, endOfMonth, startOfWeek, eachDayOfInterval,
      addDays, addMonths, addWeeks, subDays, subMonths,
    ];
    for (const fn of fns) {
      expect(typeof fn).toBe("function");
    }
  });

  it("ptBR locale is a valid locale object", () => {
    expect(ptBR).toBeDefined();
    expect(typeof ptBR).toBe("object");
    expect(ptBR.code).toBe("pt-BR");
  });

  it("format works with ptBR locale", () => {
    expect(format(ref, "dd/MM/yyyy", { locale: ptBR })).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it("formatDistanceToNow returns a string", () => {
    expect(typeof formatDistanceToNow(ref, { locale: ptBR })).toBe("string");
  });

  it("parseISO returns a Date", () => {
    expect(parseISO("2025-01-15T12:00:00Z")).toBeInstanceOf(Date);
  });

  it("date math helpers return correct types/values", () => {
    expect(addDays(ref, 1)).toBeInstanceOf(Date);
    expect(addMonths(ref, 1)).toBeInstanceOf(Date);
    expect(addWeeks(ref, 1)).toBeInstanceOf(Date);
    expect(subDays(ref, 1)).toBeInstanceOf(Date);
    expect(subMonths(ref, 1)).toBeInstanceOf(Date);
    expect(differenceInDays(addDays(ref, 5), ref)).toBe(5);
    expect(differenceInHours(addDays(ref, 1), ref)).toBe(24);
  });

  it("boolean predicates return booleans", () => {
    expect(typeof isPast(ref)).toBe("boolean");
    expect(typeof isToday(ref)).toBe("boolean");
    expect(isSameDay(ref, ref)).toBe(true);
    expect(isSameMonth(ref, addDays(ref, 1))).toBe(true);
  });

  it("interval/boundary helpers return Dates and arrays", () => {
    expect(startOfMonth(ref)).toBeInstanceOf(Date);
    expect(endOfMonth(ref)).toBeInstanceOf(Date);
    expect(startOfWeek(ref, { weekStartsOn: 1 })).toBeInstanceOf(Date);
    const days = eachDayOfInterval({ start: ref, end: addDays(ref, 3) });
    expect(Array.isArray(days)).toBe(true);
    expect(days).toHaveLength(4);
  });
});
