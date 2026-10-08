(() => {
  function splitArguments(source) {
    const args = [];
    let current = "";
    let quote = null;
    let escaped = false;

    for (const char of source) {
      if (escaped) {
        current += char;
        escaped = false;
      } else if (char === "\\" && quote) {
        current += char;
        escaped = true;
      } else if (quote) {
        current += char;
        if (char === quote) quote = null;
      } else if (char === "'" || char === '"') {
        current += char;
        quote = char;
      } else if (char === ",") {
        args.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }

    if (current.trim()) args.push(current.trim());
    return args;
  }

  function parseArgument(source, event, element) {
    if (source === "event") return event;
    if (source === "this") return element;
    if (/^-?\d+(?:\.\d+)?$/.test(source)) return Number(source);
    if (source === "true") return true;
    if (source === "false") return false;

    const quoted = /^(["'])([\s\S]*)\1$/.exec(source);
    if (quoted) {
      return quoted[2].replace(/\\(['"\\])/g, "$1");
    }
    return null;
  }

  function runAction(event, attribute) {
    const element = event.target.closest(`[${attribute}]`);
    if (!element) return;

    const source = element
      .getAttribute(attribute)
      .trim()
      .replace(/^return\s+/, "")
      .replace(/;$/, "");
    if (source === "event.stopPropagation()") {
      event.stopPropagation();
      return;
    }
    if (source === "window.scrollTo({ top: 0, behavior: 'smooth' })") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const call = /^([A-Za-z_$][\w$]*)\(([\s\S]*)\)$/.exec(source);
    const action = call && call[1];
    if (
      !call ||
      action === "constructor" ||
      action === "__proto__" ||
      !Object.prototype.hasOwnProperty.call(window, action) ||
      typeof window[action] !== "function"
    ) {
      console.error(`Unsupported delegated action: ${source}`);
      return;
    }

    const args = splitArguments(call[2]).map((arg) =>
      parseArgument(arg, event, element),
    );
    window[action].apply(element, args);
  }

  function runNamedAction(event) {
    const element = event.target.closest("[data-action]");
    if (!element || (element.dataset.actionEvent || "click") !== event.type) return;

    const action = element.dataset.action;
    if (action === "scrollToTop") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (action === "stopPropagation") {
      event.stopPropagation();
      return;
    }

    if (
      !Object.prototype.hasOwnProperty.call(window, action) ||
      typeof window[action] !== "function"
    ) {
      console.error(`Unsupported delegated action: ${action}`);
      return;
    }

    let args;
    try {
      args = JSON.parse(element.dataset.actionArgs || "[]");
    } catch (error) {
      console.error(`Invalid arguments for delegated action: ${action}`, error);
      return;
    }

    args = args.map((arg) =>
      arg === "$event" ? event : arg === "$element" ? element : arg,
    );
    if (event.type === "submit") event.preventDefault();
    window[action].apply(element, args);
  }

  document.addEventListener("click", (event) => {
    runNamedAction(event);
    runAction(event, "data-click");
  }, true);
  document.addEventListener("input", runNamedAction, true);
  document.addEventListener("change", runNamedAction, true);
  document.addEventListener("submit", runNamedAction, true);
  document.addEventListener("input", (event) => {
    runAction(event, "data-input");
  }, true);
  document.addEventListener("submit", (event) => {
    runAction(event, "data-submit");
  }, true);
  document.addEventListener("change", (event) => {
    runAction(event, "data-change");
  }, true);
})();
