import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import React from "react";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
});

class ResizeObserverMock {
  observe() {
    return undefined;
  }
  unobserve() {
    return undefined;
  }
  disconnect() {
    return undefined;
  }
}

Object.defineProperty(window, "ResizeObserver", {
  writable: true,
  value: ResizeObserverMock,
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

const localStorageMock = (() => {
  let store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store = new Map<string, string>();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  writable: true,
  value: localStorageMock,
});

Element.prototype.scrollIntoView = vi.fn();

vi.mock("recharts", () => {
  const passthrough = ({ children }: React.PropsWithChildren<Record<string, unknown>>) =>
    React.createElement("div", null, children);
  const primitive = (name: string) => () => React.createElement("div", { "data-recharts": name });

  return {
    Area: primitive("Area"),
    AreaChart: passthrough,
    Bar: primitive("Bar"),
    BarChart: passthrough,
    CartesianGrid: primitive("CartesianGrid"),
    Cell: primitive("Cell"),
    Legend: primitive("Legend"),
    Line: primitive("Line"),
    LineChart: passthrough,
    ReferenceLine: primitive("ReferenceLine"),
    ResponsiveContainer: passthrough,
    Tooltip: primitive("Tooltip"),
    XAxis: primitive("XAxis"),
    YAxis: primitive("YAxis"),
  };
});
