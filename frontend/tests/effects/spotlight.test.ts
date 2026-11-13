import { afterEach, describe, expect, it } from "vitest";

import { installSpotlight } from "../../src/effects/spotlight";

function pointerMove(target: Element, clientX: number, clientY: number, pointerType = "mouse") {
  const event = new MouseEvent("pointermove", { bubbles: true, clientX, clientY });
  Object.defineProperty(event, "pointerType", { value: pointerType });
  target.dispatchEvent(event);
}

describe("installSpotlight", () => {
  let uninstall: () => void = () => undefined;

  afterEach(() => {
    uninstall();
    document.body.innerHTML = "";
  });

  function setup() {
    document.body.innerHTML =
      '<div class="io-card"><span id="inner">texto</span></div><p id="outside"></p>';
    const card = document.querySelector<HTMLElement>(".io-card")!;
    card.getBoundingClientRect = () =>
      ({ left: 100, top: 50, width: 200, height: 100 }) as DOMRect;
    uninstall = installSpotlight(document);
    return card;
  }

  it("should store the cursor position relative to the card", () => {
    const card = setup();

    pointerMove(document.getElementById("inner")!, 160, 80);

    expect(card.style.getPropertyValue("--mx")).toBe("60px");
    expect(card.style.getPropertyValue("--my")).toBe("30px");
  });

  it("should ignore touch and elements outside a card", () => {
    const card = setup();

    pointerMove(document.getElementById("inner")!, 160, 80, "touch");
    pointerMove(document.getElementById("outside")!, 10, 10);

    expect(card.style.getPropertyValue("--mx")).toBe("");
  });

  it("should stop listening when uninstalled", () => {
    const card = setup();

    uninstall();
    pointerMove(document.getElementById("inner")!, 160, 80);

    expect(card.style.getPropertyValue("--mx")).toBe("");
  });
});
