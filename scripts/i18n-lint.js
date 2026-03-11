(function () {
  function flat(obj, prefix, out) {
    const target = out || {};
    const p = prefix || "";
    const keys = Object.keys(obj || {});
    for (let i = 0; i < keys.length; i += 1) {
      const k = keys[i];
      const v = obj[k];
      const next = p ? p + "." + k : k;
      if (v && typeof v === "object" && !Array.isArray(v)) {
        flat(v, next, target);
      } else {
        target[next] = v;
      }
    }
    return target;
  }

  function lint() {
    if (!window.i18n || !window.i18n.strings) {
      console.error("i18n not loaded");
      return { ok: false, errors: ["i18n not loaded"] };
    }

    const strings = window.i18n.strings;
    const langs = Object.keys(strings);
    const base = flat(strings.de || {});
    const baseKeys = Object.keys(base);
    const errors = [];

    for (let li = 0; li < langs.length; li += 1) {
      const lang = langs[li];
      const map = flat(strings[lang] || {});
      for (let i = 0; i < baseKeys.length; i += 1) {
        const key = baseKeys[i];
        if (!(key in map)) {
          errors.push(lang + " missing key: " + key);
        }
      }
    }

    for (let li = 0; li < langs.length; li += 1) {
      const lang = langs[li];
      const map = flat(strings[lang] || {});
      const keys = Object.keys(map);
      for (let i = 0; i < keys.length; i += 1) {
        const key = keys[i];
        if (!(key in base)) {
          errors.push(lang + " has extra key: " + key);
        }
      }
    }

    if (errors.length) {
      for (let i = 0; i < errors.length; i += 1) console.error(errors[i]);
      return { ok: false, errors: errors };
    }
    console.log("i18n lint passed");
    return { ok: true, errors: [] };
  }

  window.ipv6ggI18nLint = { lint: lint };
})();
