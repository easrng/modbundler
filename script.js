import { render, h } from "https://esm.sh/preact@10.13.0";
import {
  useState,
  useRef,
  useCallback,
} from "https://esm.sh/preact@10.13.0/hooks";
import htm from "https://esm.sh/htm@3.1.1";
const asyncLibs = Promise.all([
  import(
    "https://unpkg.com/@rollup/browser@3.25.0/dist/es/rollup.browser.js"
  ).then((e) => ["rollup", e.rollup]),
  import("https://esm.sh/terser@5.17.7").then((e) => ["minify", e.minify]),
  import("https://esm.sh/pretty-bytes@6.1.0").then((e) => [
    "prettyBytes",
    e.default,
  ]),
]).then((e) => Object.fromEntries(e));
import minifyHtm from "./minifyhtm.js";
const html = htm.bind(h);
async function bundle(code, shouldMinify) {
  const bundle = await (
    await asyncLibs
  ).rollup({
    plugins: [
      {
        async load(id) {
          console.log("load", id);
          if (id === "input:") return { code };
          return {
            code: await (await fetch(id)).text(),
          };
        },
        resolveId(a, b) {
          return new URL(a, b).href;
        },
        resolveDynamicImport() {
          return false;
        },
      },
    ],
    input: ["input:"],
  });
  const { code: bundled } = (await bundle.generate({ format: "es" })).output[0];
  if (shouldMinify) {
    const parseOptions = {};
    let toplevel;
    Object.defineProperty(parseOptions, "toplevel", {
      get() {
        return toplevel;
      },
      set(v) {
        toplevel = v;
        if (toplevel != null) {
          function walk(node, cb, to_visit = [node]) {
            const push = to_visit.push.bind(to_visit);
            while (to_visit.length) {
              const node = to_visit.pop();
              const ret = cb(node, to_visit);

              if (ret) {
                if (ret + "" === "Symbol(abort walk)") return true;
                continue;
              }

              node._children_backwards((e) =>
                to_visit.push(Object.assign(e, { __parent$: node }))
              );
            }
            return false;
          }
          walk(toplevel, (node) => {
            if (node.template_string) {
              if (
                node.prefix &&
                node.prefix.name &&
                node.prefix.name === "html"
              ) {
                const segs = node.template_string.segments.filter(
                  (seg) => seg.TYPE === "TemplateSegment"
                );
                const fields = node.template_string.segments
                  .filter((seg) => seg.TYPE !== "TemplateSegment")
                  .map((e) => ({ __field: e }));
                const statics = minifyHtm(segs.map((e) => e.value));
                for (const [i, seg] of segs.entries()) {
                  seg.raw = JSON.stringify(statics[i])
                    .slice(1, -1)
                    .replace(/\${/, "\\${");
                }
              }
            }
          });
        }
      },
    });
    const { code: minified } = await (
      await asyncLibs
    ).minify(
      { code: bundled },
      {
        module: true,
        compress: {},
        mangle: {},
        output: {},
        parse: parseOptions,
        rename: {},
      }
    );
    return minified;
  } else {
    return bundled;
  }
}
function Form({ toastsRef }) {
  const [bundling, setBundling] = useState(false);
  const codeRef = useRef();
  const minifyRef = useRef();
  const noop = useCallback(() => {});
  const onSubmit = useCallback(async (e) => {
    e.preventDefault();
    setBundling(true);
    try {
      const output = await bundle(
        codeRef.current.value,
        minifyRef.current.checked
      );
      const url = URL.createObjectURL(
        new Blob([output], { type: "text/javascript;charset=utf-8" })
      );
      toastsRef.current(html`<div class="Toast Toast--success">
        <span class="Toast-icon">
          <svg
            width="12"
            height="16"
            viewBox="0 0 12 16"
            class="octicon octicon-check"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M12 5l-8 8-4-4 1.5-1.5L4 10l6.5-6.5L12 5z"
            />
          </svg>
        </span>
        <span class="Toast-content d-flex flex-items-center pr-0 py-0">
          <span>Bundled!</span>
          <a class="btn btn-sm ml-3 pr-1" download="bundle.js" href=${url}>
            Save
            <span class="Label Label--secondary ml-1">
              ${(await asyncLibs).prettyBytes(output.length)}
            </span>
          </a>
        </span>
        <button
          class="Toast-dismissButton"
          onClick=${() => URL.revokeObjectURL(url)}
        >
          <svg
            width="12"
            height="16"
            viewBox="0 0 12 16"
            class="octicon octicon-x"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M7.48 8l3.75 3.75-1.48 1.48L6 9.48l-3.75 3.75-1.48-1.48L4.52 8 .77 4.25l1.48-1.48L6 6.52l3.75-3.75 1.48 1.48L7.48 8z"
            />
          </svg>
        </button>
      </div>`);
    } catch (e) {
      console.error(e);
      toastsRef.current(html`<div class="Toast Toast--error">
        <span class="Toast-icon">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            class="octicon octicon-alert"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M8.893 1.5c-.183-.31-.52-.5-.887-.5s-.703.19-.886.5L.138 13.499a.98.98 0 0 0 0 1.001c.193.31.53.501.886.501h13.964c.367 0 .704-.19.877-.5a1.03 1.03 0 0 0 .01-1.002L8.893 1.5zm.133 11.497H6.987v-2.003h2.039v2.003zm0-3.004H6.987V5.987h2.039v4.006z"
            />
          </svg>
        </span>
        <span class="Toast-content">
          <code style="white-space:pre-wrap">${e.message}</code>
        </span>
        <button class="Toast-dismissButton">
          <svg
            width="12"
            height="16"
            viewBox="0 0 12 16"
            class="octicon octicon-x"
            aria-hidden="true"
          >
            <path
              fill-rule="evenodd"
              d="M7.48 8l3.75 3.75-1.48 1.48L6 9.48l-3.75 3.75-1.48-1.48L4.52 8 .77 4.25l1.48-1.48L6 6.52l3.75-3.75 1.48 1.48L7.48 8z"
            />
          </svg>
        </button>
      </div>`);
    }
    setBundling(false);
  });
  return html`
    <form
      onSubmit=${bundling ? noop : onSubmit}
      class="width-full height-full d-flex flex-column p-2"
    >
      <h1>
        ${"ModBundler "}
        <a href="https://easrng.net" class="color-fg-muted text-light">
          by easrng
        </a>
      </h1>
      <p class="mb-2 color-fg-muted">
        A simple ES module bundler. Paste a module, get a bundle.
      </p>
      <textarea
        class="form-control input-block flex-1"
        type="text"
        placeholder=${'import { render, h } from "https://esm.sh/preact@10";\nimport htm from "https://esm.sh/htm@3";\nimport confetti from "https://esm.sh/canvas-confetti@1";\nconst html = htm.bind(h);\nfunction App() {\n  return html`<button onClick=${() => confetti()}>🎉</button>`;\n}\n\nrender(html`<${App} />`, document.body);\n'}
        required
        ref=${codeRef}
        disabled=${bundling}
      />
      <div class="flex-shrink-0 mt-2 d-flex flex-items-center">
        <div class="flex-1"></div>
        <div class="form-checkbox mx-2">
          <label>
            <input type="checkbox" ref=${minifyRef} disabled=${bundling} />
            Minify
          </label>
        </div>
        <button
          class="btn btn-primary"
          style="position:relative"
          disabled=${bundling}
        >
          <span style="visibility:hidden">Bundling...</span>
          <span style="position:absolute;left:50%;transform:translateX(-50%)"
            >Bundl${bundling
              ? html`ing<span class="AnimatedEllipsis"></span>`
              : "e"}</span
          >
        </button>
      </div>
    </form>
  `;
}
function Toasts({ toastsRef: ref }) {
  const toastsRef = useRef();
  const maybeDismiss = useCallback((e) => {
    if (e.target.closest(".Toast-dismissButton")) {
      e.preventDefault();
      const toast = e.target.closest(".Toast");
      toast.remove();
    }
  });
  ref.current = useCallback((ele) => {
    const frag = document.createDocumentFragment();
    render(ele, frag);
    toastsRef.current.append(frag);
  });
  return html`<div
    class="position-fixed bottom-0 left-0 mb-3 ml-3"
    ref=${toastsRef}
    onClick=${maybeDismiss}
  />`;
}
function App() {
  const toastsRef = useRef();
  return html`<${Form} toastsRef=${toastsRef} /><${Toasts}
      toastsRef=${toastsRef}
    />`;
}
render(html`<${App} />`, document.body);
