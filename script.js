import esmBundler from "./bundler.js";
window.stats.beacon("page-load")
async function bundle(zip) {
  window.output.textContent = "Bundling to "+(zip?"zip":"script")+"...";
  window.btn.disabled = window.zipbtn.disabled = true;
  window.stats.beacon("bundle-start")
  try {
    window.output.textContent = await esmBundler({
      modules: Object.entries(JSON.parse(window.mods.value)).map(
        ([name, url]) => ({ name, url })
      ),
      importMap: JSON.parse(window.im.value),
      zip
    });
    window.btn.disabled = window.zipbtn.disabled = false;
    window.stats.beacon("bundle-finish")
  } catch (e) {
    console.error(e);
    window.btn.disabled = window.zipbtn.disabled = false;
    window.output.textContent =
      "Error bundling. Make sure the modules are served with CORS headers.";
    window.stats.beacon("bundle-error")
  }
}
window.zipbtn.addEventListener("click", () => bundle(true));
window.btn.addEventListener("click", () => bundle(false));
