import esmBundler from "./bundler.js";
stats.beacon("page-load")
document.forms[0].addEventListener("submit", async e => {
  e.preventDefault();
  window.output.textContent = "Bundling...";
  window.btn.disabled = true;
  stats.beacon("bundle-start")
  try {
    window.output.textContent = await esmBundler({
      modules: Object.entries(JSON.parse(document.forms[0].mods.value)).map(
        ([name, url]) => ({ name, url })
      ),
      importMap: JSON.parse(document.forms[0].im.value)
    });
    window.btn.disabled = false;
    stats.beacon("bundle-finish")
  } catch (e) {
    console.error(e);
    window.btn.disabled = false;
    window.output.textContent =
      "Error bundling. Make sure the modules are served with CORS headers.";
    stats.beacon("bundle-error")
  }
});
