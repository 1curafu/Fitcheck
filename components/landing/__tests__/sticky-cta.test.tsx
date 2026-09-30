import { act, render, screen } from "@testing-library/react";
import { StickyCta } from "../sticky-cta";

type Obs = { cb: IntersectionObserverCallback; el?: Element };
const observers: Obs[] = [];

beforeEach(() => {
  observers.length = 0;
  vi.stubGlobal("IntersectionObserver", class {
    o: Obs;
    constructor(cb: IntersectionObserverCallback) { this.o = { cb }; observers.push(this.o); }
    observe(el: Element) { this.o.el = el; }
    disconnect() {}
  });
  document.body.innerHTML = '<a id="hero-cta"></a><a id="final-cta"></a>';
});
afterEach(() => vi.unstubAllGlobals());

const fire = (id: string, entry: Partial<IntersectionObserverEntry>) =>
  act(() => {
    const o = observers.find((x) => x.el?.id === id)!;
    o.cb([entry as IntersectionObserverEntry], {} as IntersectionObserver);
  });

test("appears after the hero CTA scrolls away and hides again at the final CTA", () => {
  const { container } = render(<StickyCta label="Try Fitcheck free" />, { container: document.body.appendChild(document.createElement("div")) });
  const bar = container.firstElementChild!;
  expect(bar).toHaveAttribute("aria-hidden", "true");
  fire("hero-cta", { isIntersecting: false, boundingClientRect: { top: -20 } as DOMRectReadOnly });
  expect(bar).toHaveAttribute("aria-hidden", "false");
  expect(screen.getByRole("link", { name: "Try Fitcheck free" })).toHaveAttribute("href", "/sign-in");
  fire("final-cta", { isIntersecting: true });
  expect(bar).toHaveAttribute("aria-hidden", "true");
});
