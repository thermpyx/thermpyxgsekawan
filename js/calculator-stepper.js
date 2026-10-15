/* Small, precise adjustments for Calculator Lab; equations stay in calculator-lab.js. */
(() => {
  "use strict";

  // Work with decimal integers so 0.2 + 0.1 displays 0.3. Using the finite
  // number's canonical form also bounds exponents and preserves typed precision.
  const decimal = value => {
    const [mantissa, exponent = "0"] = String(Number(value)).toLowerCase().split("e");
    const fraction = (mantissa.split(".")[1] || "").length;
    const places = fraction - Number(exponent);
    let coefficient = BigInt(mantissa.replace(".", ""));
    if (places < 0) coefficient *= 10n ** BigInt(-places);
    return {coefficient, places: Math.max(0, places)};
  };
  const add = (value, step, direction) => {
    const a = decimal(value), b = decimal(step), places = Math.max(a.places, b.places);
    const sum = a.coefficient * 10n ** BigInt(places - a.places)
      + BigInt(direction) * b.coefficient * 10n ** BigInt(places - b.places);
    const sign = sum < 0n ? "-" : "";
    let digits = (sum < 0n ? -sum : sum).toString().padStart(places + 1, "0");
    if (places) digits = `${digits.slice(0, -places)}.${digits.slice(-places)}`.replace(/\.?0+$/, "");
    return `${sign}${digits}`;
  };
  const controls = [];
  const finiteAttribute = (input, name) => {
    const raw = input.getAttribute(name);
    return raw !== null && raw.trim() !== "" && Number.isFinite(Number(raw)) ? Number(raw) : null;
  };
  const stepSize = input => {
    const configured = Number(input.dataset.step || input.getAttribute("step"));
    return Number.isFinite(configured) && configured > 0 ? configured : 1;
  };

  document.querySelectorAll('.cl-input input[type="number"]').forEach(input => {
    const field = input.closest(".cl-field"), shell = input.closest(".cl-input");
    const label = field.querySelector("label"), unit = shell.querySelector("em").textContent;
    const group = document.createElement("span");
    group.className = "cl-stepper-actions";
    const buttons = [-1, 1].map(direction => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cl-stepper-button";
      button.dataset.direction = String(direction);
      button.setAttribute("aria-controls", input.id);
      // SVG marks stay crisp at every screen density without font substitution.
      button.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M4 8h8${direction > 0 ? "M8 4v8" : ""}"/></svg>`;
      group.append(button);
      return button;
    });
    shell.append(group);
    shell.classList.add("cl-has-stepper");

    function candidate(direction) {
      const value = input.value.trim() === "" ? 0 : input.valueAsNumber;
      if (!Number.isFinite(value)) return null;
      const min = finiteAttribute(input, "min"), max = finiteAttribute(input, "max");
      if (min !== null && max !== null && min > max) return null;
      if (direction < 0 && min !== null && value <= min || direction > 0 && max !== null && value >= max) return null;
      let next = add(value, stepSize(input), direction), numeric = Number(next);
      if (!Number.isFinite(numeric)) return null;
      if (min !== null && numeric < min) { next = String(min); numeric = min; }
      if (max !== null && numeric > max) { next = String(max); numeric = max; }
      // Very large numbers may have no representable neighbour at this step.
      return numeric === value && input.value !== "" ? null : next;
    }
    function refresh() {
      const disabled = input.disabled || input.readOnly;
      buttons.forEach((button, index) => { button.disabled = disabled || candidate(index ? 1 : -1) === null; });
    }
    function localize() {
      const id = window.TPX?.getLanguage() === "id";
      buttons.forEach((button, index) => {
        const labels = {};
        for (const language of ["en", "id"]) {
          const name = label?.dataset[language] || label?.textContent || input.name;
          const step = stepSize(input).toLocaleString(language === "id" ? "id-ID" : "en-US", {maximumSignificantDigits: 15});
          labels[language] = language === "id" ? `${index ? "Tambah" : "Kurangi"} ${name} sebesar ${step}${unit === "—" ? "" : ` ${unit}`}`
            : `${index ? "Increase" : "Decrease"} ${name} by ${step}${unit === "—" ? "" : ` ${unit}`}`;
          button.setAttribute(`data-aria-label-${language}`, labels[language]);
          button.setAttribute(`data-title-${language}`, labels[language]);
        }
        const text = labels[id ? "id" : "en"];
        button.setAttribute("aria-label", text);
        button.title = text;
      });
    }
    function adjust(direction) {
      if (input.disabled || input.readOnly) return;
      const next = candidate(direction);
      if (next === null) { refresh(); return; }
      input.value = next;
      input.dispatchEvent(new Event("input", {bubbles: true}));
      input.dispatchEvent(new Event("change", {bubbles: true}));
      shell.classList.remove("cl-value-adjusted");
      // Replaying a brief border cue never moves the text or unit.
      requestAnimationFrame(() => shell.classList.add("cl-value-adjusted"));
      refresh();
    }
    buttons.forEach((button, index) => button.addEventListener("click", () => adjust(index ? 1 : -1)));
    input.addEventListener("keydown", event => {
      if (!event.altKey && !event.ctrlKey && !event.metaKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
        event.preventDefault();
        adjust(event.key === "ArrowUp" ? 1 : -1);
      }
    });
    input.addEventListener("input", refresh);
    input.addEventListener("change", refresh);
    input.form?.addEventListener("reset", () => requestAnimationFrame(refresh));
    new MutationObserver(() => { refresh(); localize(); }).observe(input, {
      attributes: true, attributeFilter: ["disabled", "readonly", "min", "max", "step", "data-step", "value"]
    });
    controls.push({refresh, localize});
    refresh();
    localize();
  });
  window.addEventListener("thermpyx:languagechange", () => controls.forEach(control => control.localize()));
})();
