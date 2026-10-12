/* Eight temperature scales, converted through Kelvin. */
(() => {
  "use strict";
  const units = {
    C: { symbol: "°C", toKelvin: value => value + 273.15, fromKelvin: value => value - 273.15 },
    F: { symbol: "°F", toKelvin: value => (value - 32) * 5 / 9 + 273.15, fromKelvin: value => (value - 273.15) * 9 / 5 + 32 },
    K: { symbol: "K", toKelvin: value => value, fromKelvin: value => value },
    Re: { symbol: "°Ré", toKelvin: value => value * 5 / 4 + 273.15, fromKelvin: value => (value - 273.15) * 4 / 5 },
    R: { symbol: "°R", toKelvin: value => value * 5 / 9, fromKelvin: value => value * 9 / 5 },
    De: { symbol: "°De", toKelvin: value => 100 - value * 2 / 3 + 273.15, fromKelvin: value => (100 - (value - 273.15)) * 3 / 2 },
    N: { symbol: "°N", toKelvin: value => value * 100 / 33 + 273.15, fromKelvin: value => (value - 273.15) * 33 / 100 },
    Ro: { symbol: "°Rø", toKelvin: value => (value - 7.5) * 40 / 21 + 273.15, fromKelvin: value => (value - 273.15) * 21 / 40 + 7.5 }
  };
  function convert(value, from, to) {
    if (!Number.isFinite(value) || !units[from] || !units[to]) throw new Error("Invalid temperature or unit.");
    const kelvin = units[from].toKelvin(value);
    if (kelvin < -1e-9) throw new Error("Temperature cannot be below absolute zero (0 K).");
    const result = units[to].fromKelvin(Math.max(0, kelvin));
    if (!Number.isFinite(result)) throw new Error("The temperature is too large.");
    return Math.abs(result) < 1e-10 ? 0 : result;
  }
  window.TPXTemperature = { convert, units };
  const from = document.getElementById("temperatureFromUnit"), to = document.getElementById("temperatureToUnit"), input = document.getElementById("temperatureValue"), output = document.getElementById("temperatureConversionValue"), direction = document.getElementById("temperatureDirection");
  if (!from || !to || !input || !output) return;
  const tr = (en, id) => window.TPX?.getLanguage() === "id" ? id : en;
  function sync() {
    direction.textContent = `${units[from.value].symbol} → ${units[to.value].symbol}`;
    output.textContent = "…";
    input.removeAttribute("aria-invalid");
    window.ThermpyxSelect?.refresh?.(from);
    window.ThermpyxSelect?.refresh?.(to);
  }
  from.addEventListener("change", sync); to.addEventListener("change", sync);
  document.getElementById("temperatureSwapButton")?.addEventListener("click", () => {
    const previous = from.value; from.value = to.value; to.value = previous;
    from.dispatchEvent(new Event("change", { bubbles: true }));
    to.dispatchEvent(new Event("change", { bubbles: true }));
  });
  document.getElementById("convertTemperatureButton")?.addEventListener("click", () => {
    try {
      if (!input.value.trim()) throw new Error("empty");
      const result = convert(Number(input.value), from.value, to.value);
      output.textContent = `${result.toLocaleString(window.TPX?.getLanguage() === "id" ? "id-ID" : "en-US", { maximumFractionDigits: 8 })} ${units[to.value].symbol}`;
      input.removeAttribute("aria-invalid");
      window.TPXHistory?.log("calculation", "Temperature conversion", `${input.value} ${units[from.value].symbol} → ${output.textContent}`, location.href);
    } catch (error) {
      output.textContent = error.message === "empty" ? tr("Enter a temperature.", "Masukkan suhu.") : tr("Check the value: temperature must be at least 0 K.", "Periksa nilainya: suhu tidak boleh di bawah 0 K.");
      input.setAttribute("aria-invalid", "true"); input.focus();
    }
  });
  sync();
})();
