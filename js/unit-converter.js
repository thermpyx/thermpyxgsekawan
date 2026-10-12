/* SI definitions and presentation are separate so numerical conversions can be
   validated without a browser. Values are never rounded during conversion. */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root && root.document) { root.TPXUnits = api; mount(root, api); }

  function mount(win, api) {
    function ready() {
      const doc = win.document, grid = doc.getElementById("converterGrid"), nav = doc.getElementById("converterNav");
      if (!grid || !nav) return;
      const language = () => win.TPX?.getLanguage() === "id" ? "id" : "en";
      const tr = (en, id) => language() === "id" ? id : en;
      const format = value => new Intl.NumberFormat(language() === "id" ? "id-ID" : "en-US", {
        maximumSignificantDigits: 15, notation: value !== 0 && (Math.abs(value) >= 1e12 || Math.abs(value) < 1e-6) ? "scientific" : "standard"
      }).format(Object.is(value, -0) ? 0 : value);
      const element = (tag, cls, en, id) => {
        const node = doc.createElement(tag); if (cls) node.className = cls;
        if (en !== undefined) { node.dataset.en = en; node.dataset.id = id ?? en; node.textContent = tr(en, id ?? en); }
        return node;
      };
      const errorMessages = {
        "missing-value": ["Enter a value to convert.", "Masukkan nilai yang ingin dikonversi."],
        "invalid-value": ["Enter a finite number.", "Masukkan angka yang valid dan berhingga."],
        "absolute-zero": ["Temperature cannot be below absolute zero (0 K).", "Suhu tidak boleh di bawah nol mutlak (0 K)."],
        overflow: ["The result is too large. Use a smaller value or different units.", "Hasil terlalu besar. Gunakan nilai lebih kecil atau satuan lain."],
        "invalid-unit": ["Choose two units from the same category.", "Pilih dua satuan dari kategori yang sama."]
      };
      const controls = [];
      Object.entries(api.categories).forEach(([key, category], index) => {
        const link = element("a", "", `${String(index + 1).padStart(2, "0")} / ${category.en}`, `${String(index + 1).padStart(2, "0")} / ${category.id}`);
        link.href = "#" + key; nav.append(link);
        const card = element("article", "uc-card"); card.id = key; card.dataset.converter = key;
        const top = element("div", "uc-card-top"), number = element("span", "", `UNIT / ${String(index + 1).padStart(2, "0")}`);
        const symbol = element("span", "uc-card-symbol", category.symbol); symbol.setAttribute("aria-hidden", "true"); top.append(number, symbol);
        const heading = element("h2", "", category.en, category.id); heading.id = key + "Heading"; card.setAttribute("aria-labelledby", heading.id);
        const description = element("p", "uc-description", category.description.en, category.description.id);
        const form = element("form", "uc-form"); form.noValidate = true;
        const valueLabel = element("label", "uc-field"), valueText = element("span", "", "Value", "Nilai"), input = element("input", "uc-input");
        input.type = "number"; input.step = "any"; input.inputMode = "decimal"; input.required = true; input.name = "value"; input.id = key + "Value";
        input.value = String(category.example.value); input.autocomplete = "off"; input.setAttribute("aria-describedby", key + "Result"); valueLabel.append(valueText, input);
        const row = element("div", "uc-unit-row");
        const field = (name, en, id, selected) => {
          const label = element("label", "uc-field"), text = element("span", "", en, id), select = element("select");
          select.name = name; select.id = key + (name === "from" ? "From" : "To");
          category.units.forEach(unit => { const option = element("option", "", unit.en, unit.id); option.value = unit.key; select.append(option); });
          select.value = selected; label.append(text, select); return { label, select };
        };
        const from = field("from", "From", "Dari", category.example.from), to = field("to", "To", "Ke", category.example.to);
        const swap = element("button", "uc-swap"); swap.type = "button"; swap.textContent = "⇄"; swap.setAttribute("aria-label", tr("Swap units", "Tukar satuan"));
        row.append(from.label, swap, to.label);
        const submit = element("button", "uc-submit", "CONVERT", "KONVERSI"); submit.type = "submit";
        form.append(valueLabel, row, submit);
        const output = element("div", "uc-output"); output.id = key + "Result"; output.setAttribute("role", "status"); output.setAttribute("aria-live", "polite"); output.setAttribute("aria-atomic", "true");
        const resultLabel = element("small", "", "CONVERSION RESULT", "HASIL KONVERSI"), answer = element("strong", "uc-result"), equality = element("p", "uc-equality");
        output.append(resultLabel, answer, equality); card.append(top, heading, description, form, output); grid.append(card);
        const getResult = () => api.convert(key, input.value, from.select.value, to.select.value);
        const update = () => {
          try {
            const result = getResult(), sourceUnit = category.units.find(unit => unit.key === from.select.value), targetUnit = category.units.find(unit => unit.key === to.select.value);
            input.removeAttribute("aria-invalid"); output.classList.remove("uc-error"); output.dataset.value = String(result);
            answer.textContent = `${format(result)} ${targetUnit.symbol}`;
            equality.textContent = `${format(Number(input.value))} ${sourceUnit.symbol} = ${format(result)} ${targetUnit.symbol}`;
          } catch (error) {
            input.setAttribute("aria-invalid", "true"); output.classList.add("uc-error"); delete output.dataset.value;
            answer.textContent = tr(...(errorMessages[error.code] || errorMessages["invalid-value"])); equality.textContent = "";
          }
        };
        form.addEventListener("submit", event => {
          event.preventDefault(); update();
          if (!output.classList.contains("uc-error")) win.TPXHistory?.log("calculation", category[language()], equality.textContent, win.location.pathname + "#" + key);
        });
        input.addEventListener("input", update); from.select.addEventListener("change", update); to.select.addEventListener("change", update);
        swap.addEventListener("click", () => {
          let result; try { result = getResult(); } catch (_) {}
          const previous = from.select.value; from.select.value = to.select.value; to.select.value = previous;
          if (result !== undefined) input.value = String(result);
          win.ThermpyxSelect?.refresh(row); update();
        });
        controls.push({ update, swap }); update();
      });
      const localize = () => {
        doc.querySelectorAll("[data-en][data-id]").forEach(node => { const text = node.dataset[language()]; if (node.textContent !== text) node.textContent = text; });
        nav.setAttribute("aria-label", tr("Conversion categories", "Kategori konversi")); grid.setAttribute("aria-label", tr("Unit conversion tools", "Alat konversi satuan"));
        controls.forEach(control => { control.swap.setAttribute("aria-label", tr("Swap units", "Tukar satuan")); control.update(); });
        updateThemeLabel(); win.ThermpyxSelect?.refresh(grid);
      };
      const themeButton = doc.getElementById("themeToggle"), themeText = doc.getElementById("themeText"), themeIcon = doc.getElementById("themeIcon");
      function updateThemeLabel() {
        const light = doc.body.classList.contains("light-mode");
        themeText.textContent = light ? tr("Dark Mode", "Mode Gelap") : tr("Light Mode", "Mode Terang"); themeIcon.textContent = light ? "☾" : "☀";
        themeButton.setAttribute("aria-label", light ? tr("Switch to dark mode", "Ubah ke mode gelap") : tr("Switch to light mode", "Ubah ke mode terang"));
      }
      let savedTheme = "dark"; try { savedTheme = win.localStorage.getItem("thermpyx-theme") || "dark"; } catch (_) {}
      doc.body.classList.toggle("light-mode", savedTheme === "light"); doc.documentElement.dataset.theme = savedTheme === "light" ? "light" : "dark";
      themeButton.addEventListener("click", () => {
        const light = !doc.body.classList.contains("light-mode"); doc.body.classList.toggle("light-mode", light); doc.documentElement.dataset.theme = light ? "light" : "dark";
        try { win.localStorage.setItem("thermpyx-theme", light ? "light" : "dark"); } catch (_) {} updateThemeLabel();
      });
      win.addEventListener("thermpyx:languagechange", localize); localize();
      win.TPXHistory?.log("calculation", tr("Unit Converter", "Konverter Satuan"), tr("Page opened", "Halaman dibuka"), win.location.href);
    }
    if (root.document.readyState === "loading") root.document.addEventListener("DOMContentLoaded", ready, { once: true }); else ready();
  }
})(typeof window !== "undefined" ? window : null, function () {
  "use strict";
  const unit = (key, symbol, en, id, factor, offset = 0) => Object.freeze({ key, symbol, en: `${en} (${symbol})`, id: `${id} (${symbol})`, factor, offset });
  const category = (en, id, symbol, descriptionEn, descriptionId, units, value, from, to) => Object.freeze({ en, id, symbol, description: Object.freeze({ en: descriptionEn, id: descriptionId }), units: Object.freeze(units), example: Object.freeze({ value, from, to }) });
  const categories = Object.freeze({
    temperature: category("Temperature", "Suhu", "°", "Compare eight temperature scales, from Celsius to Rømer.", "Bandingkan delapan skala suhu, dari Celsius hingga Rømer.", [
      unit("C", "°C", "Celsius", "Celsius", 1, 273.15), unit("F", "°F", "Fahrenheit", "Fahrenheit", 5 / 9, 459.67 * 5 / 9), unit("K", "K", "Kelvin", "Kelvin", 1),
      unit("Re", "°Ré", "Réaumur", "Réaumur", 1.25, 273.15), unit("R", "°R", "Rankine", "Rankine", 5 / 9), unit("De", "°De", "Delisle", "Delisle", -2 / 3, 373.15),
      unit("N", "°N", "Newton", "Newton", 100 / 33, 273.15), unit("Ro", "°Rø", "Rømer", "Rømer", 40 / 21, 273.15 - 7.5 * 40 / 21)
    ], 25, "C", "F"),
    pressure: category("Pressure", "Tekanan", "P", "Move between SI pressure, atmosphere and common gauge units.", "Konversi tekanan SI, atmosfer, dan satuan pengukur umum.", [
      unit("Pa", "Pa", "Pascal", "Pascal", 1), unit("kPa", "kPa", "Kilopascal", "Kilopascal", 1000), unit("MPa", "MPa", "Megapascal", "Megapascal", 1e6),
      unit("bar", "bar", "Bar", "Bar", 100000), unit("atm", "atm", "Standard atmosphere", "Atmosfer standar", 101325), unit("mmHg", "mmHg", "Millimetre of mercury", "Milimeter raksa", 133.322387415),
      unit("torr", "Torr", "Torr", "Torr", 101325 / 760), unit("psi", "psi", "Pound per square inch", "Pon per inci persegi", 6894.757293168)
    ], 1, "atm", "kPa"),
    volume: category("Volume", "Volume", "V", "Convert laboratory volumes and US liquid gallons.", "Konversi volume laboratorium dan galon cair AS.", [
      unit("m3", "m³", "Cubic metre", "Meter kubik", 1), unit("L", "L", "Litre", "Liter", .001), unit("mL", "mL", "Millilitre", "Mililiter", 1e-6), unit("cm3", "cm³", "Cubic centimetre", "Sentimeter kubik", 1e-6), unit("ft3", "ft³", "Cubic foot", "Kaki kubik", .028316846592), unit("galUS", "gal US", "US liquid gallon", "Galon cair AS", .003785411784)
    ], 1, "L", "mL"),
    energy: category("Energy", "Energi", "E", "Convert heat and work using joules, calories and electrical energy.", "Konversi kalor dan usaha dengan joule, kalori, dan energi listrik.", [
      unit("J", "J", "Joule", "Joule", 1), unit("kJ", "kJ", "Kilojoule", "Kilojoule", 1000), unit("MJ", "MJ", "Megajoule", "Megajoule", 1e6), unit("cal", "cal", "Calorie (thermochemical)", "Kalori (termokimia)", 4.184), unit("kcal", "kcal", "Kilocalorie (thermochemical)", "Kilokalori (termokimia)", 4184), unit("Wh", "Wh", "Watt-hour", "Watt-jam", 3600), unit("kWh", "kWh", "Kilowatt-hour", "Kilowatt-jam", 3.6e6), unit("BTU", "BTU IT", "BTU (international table)", "BTU (international table)", 1055.05585262)
    ], 1, "kWh", "kJ"),
    power: category("Power", "Daya", "W", "Compare energy transfer rates, including mechanical horsepower.", "Bandingkan laju perpindahan energi, termasuk daya kuda mekanis.", [
      unit("W", "W", "Watt", "Watt", 1), unit("kW", "kW", "Kilowatt", "Kilowatt", 1000), unit("MW", "MW", "Megawatt", "Megawatt", 1e6), unit("hp", "hp", "Mechanical horsepower", "Daya kuda mekanis", 745.699871582), unit("BTU-h", "BTU IT/h", "BTU per hour", "BTU per jam", 1055.05585262 / 3600)
    ], 1, "hp", "W"),
    mass: category("Mass", "Massa", "m", "Translate SI mass into pounds and ounces.", "Konversi massa SI ke pon dan ons avoirdupois.", [
      unit("kg", "kg", "Kilogram", "Kilogram", 1), unit("g", "g", "Gram", "Gram", .001), unit("mg", "mg", "Milligram", "Miligram", 1e-6), unit("t", "t", "Metric tonne", "Ton metrik", 1000), unit("lb", "lb", "Pound", "Pon", .45359237), unit("oz", "oz", "Ounce (avoirdupois)", "Ons avoirdupois", .028349523125)
    ], 1, "kg", "g"),
    length: category("Length", "Panjang", "ℓ", "Switch between metric and international imperial lengths.", "Konversi panjang metrik dan imperial internasional.", [
      unit("m", "m", "Metre", "Meter", 1), unit("cm", "cm", "Centimetre", "Sentimeter", .01), unit("mm", "mm", "Millimetre", "Milimeter", .001), unit("km", "km", "Kilometre", "Kilometer", 1000), unit("in", "in", "Inch", "Inci", .0254), unit("ft", "ft", "Foot", "Kaki", .3048), unit("yd", "yd", "Yard", "Yard", .9144), unit("mi", "mi", "Mile", "Mil", 1609.344)
    ], 1, "m", "cm"),
    area: category("Area", "Luas", "A", "Compare surface areas from square millimetres to hectares.", "Bandingkan luas permukaan dari milimeter persegi hingga hektare.", [
      unit("m2", "m²", "Square metre", "Meter persegi", 1), unit("cm2", "cm²", "Square centimetre", "Sentimeter persegi", 1e-4), unit("mm2", "mm²", "Square millimetre", "Milimeter persegi", 1e-6), unit("km2", "km²", "Square kilometre", "Kilometer persegi", 1e6), unit("ha", "ha", "Hectare", "Hektare", 10000), unit("ft2", "ft²", "Square foot", "Kaki persegi", .09290304), unit("acre", "ac", "International acre", "Acre internasional", 4046.8564224)
    ], 1, "ha", "m2"),
    time: category("Time", "Waktu", "t", "Convert duration, from milliseconds to days.", "Konversi durasi, dari milidetik hingga hari.", [
      unit("s", "s", "Second", "Detik", 1), unit("ms", "ms", "Millisecond", "Milidetik", .001), unit("min", "min", "Minute", "Menit", 60), unit("h", "h", "Hour", "Jam", 3600), unit("d", "d", "Day (24 hours)", "Hari (24 jam)", 86400)
    ], 1, "h", "min")
  });
  function fail(code) { const error = new RangeError(code); error.code = code; throw error; }
  function parse(value) {
    if (value === "" || value === null || value === undefined || typeof value === "string" && !value.trim()) fail("missing-value");
    if (typeof value !== "number" && (typeof value !== "string" || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))) fail("invalid-value");
    const number = Number(value); if (!Number.isFinite(number)) fail("invalid-value"); return number;
  }
  function convert(categoryKey, value, fromKey, toKey) {
    if (!Object.hasOwn(categories, categoryKey)) fail("invalid-unit");
    const category = categories[categoryKey];
    const from = category.units.find(unit => unit.key === fromKey), to = category.units.find(unit => unit.key === toKey);
    if (!from || !to) fail("invalid-unit");
    const number = parse(value); let result;
    if (categoryKey === "temperature") {
      let kelvin = number * from.factor + from.offset;
      if (!Number.isFinite(kelvin)) fail("overflow");
      // Affine scales may produce a tiny negative residual at exactly 0 K.
      const tolerance = from.offset === 0 ? 0 : Number.EPSILON * Math.max(1, Math.abs(number * from.factor), Math.abs(from.offset)) * 4;
      if (kelvin < -tolerance) fail("absolute-zero"); if (kelvin < 0) kelvin = 0;
      result = fromKey === toKey ? number : (kelvin - to.offset) / to.factor;
    } else result = number * (from.factor / to.factor);
    if (!Number.isFinite(result)) fail("overflow"); return Object.is(result, -0) ? 0 : result;
  }
  return Object.freeze({ categories, convert });
});
