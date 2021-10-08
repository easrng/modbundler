import beacon from "https://easrng.github.io/stats-control/stats.js"
import esmBundler from "./bundler.js";
beacon("page-load")
document.forms[0].addEventListener("submit", async e => {
  e.preventDefault();
  window.output.textContent = "Bundling...";
  window.btn.disabled = true;
  beacon("bundle-start")
  try {
    window.output.textContent = await esmBundler({
      modules: Object.entries(JSON.parse(document.forms[0].mods.value)).map(
        ([name, url]) => ({ name, url })
      ),
      importMap: JSON.parse(document.forms[0].im.value)
    });
    window.btn.disabled = false;
    beacon("bundle-finish")
  } catch (e) {
    console.error(e);
    window.btn.disabled = false;
    window.output.textContent =
      "Error bundling. Make sure the modules are served with CORS headers.";
    beacon("bundle-error")
  }
});
