const MODE_SLASH = 0;
const MODE_TEXT = 1;
const MODE_WHITESPACE = 2;
const MODE_TAGNAME = 3;
const MODE_COMMENT = 4;
const MODE_PROP_SET = 5;
const MODE_PROP_APPEND = 6;

export default function (statics) {
  let mode = MODE_TEXT;
  let buffer = "";
  let quote = "";
  let minified = [""];
  let char, propName, tagOpen, closingTag, quoteWith;

  const commit = (field) => {
    if (mode === MODE_TEXT) {
      if (field || (buffer = buffer.replace(/^\s*\n\s*|\s*\n\s*$/g, ""))) {
        minified.push("");
        minified.push(field ? {} : buffer);
      }
    } else if (mode === MODE_TAGNAME && (field || buffer)) {
      minified.push("<");
      tagOpen = true;
      minified.push(field ? {} : buffer);
      mode = MODE_WHITESPACE;
    } else if (mode === MODE_WHITESPACE && buffer === "..." && field) {
      minified.push(" ...");
      minified.push({});
    } else if (mode === MODE_WHITESPACE && buffer && !field) {
      minified.push(" " + buffer);
    } else if (mode >= MODE_PROP_SET) {
      if (buffer || (!field && mode === MODE_PROP_SET)) {
        minified.push([propName, [buffer], quoteWith]);
        mode = MODE_PROP_APPEND;
      }
      if (field) {
        minified.push([propName, [{}], quoteWith]);
        mode = MODE_PROP_APPEND;
      }
    } else if (mode === MODE_WHITESPACE) {
      //minified.push(" ")
    } else if (mode === MODE_SLASH) {
      minified.push((tagOpen ? "" : "<") + "/");
    } else if (field && mode === MODE_COMMENT) {
      minified.push("");
      minified.push(field ? {} : buffer);
    }

    if (closingTag || mode === MODE_SLASH) {
      minified.push(">");
      tagOpen = false;
    }

    buffer = "";
    closingTag = false;
  };

  for (let i = 0; i < statics.length; i++) {
    if (i) {
      if (mode === MODE_TEXT) {
        commit();
      }
      commit(i);
    }

    for (let j = 0; j < statics[i].length; j++) {
      char = statics[i][j];

      if (mode === MODE_TEXT) {
        if (char === "<") {
          // commit buffer
          commit();
          mode = MODE_TAGNAME;
        } else {
          buffer += char;
        }
      } else if (mode === MODE_COMMENT) {
        // Ignore everything until the last three characters are '-', '-' and '>'
        if (buffer === "--" && char === ">") {
          minified.push("-->");
          mode = MODE_TEXT;
          buffer = "";
        } else {
          buffer = char + buffer[0];
        }
      } else if (quote) {
        if (char === quote) {
          quote = "";
        } else {
          buffer += char;
        }
      } else if (char === '"' || char === "'") {
        quoteWith = quote = char;
      } else if (char === ">") {
        closingTag = true;
        commit();
        mode = MODE_TEXT;
      } else if (!mode) {
        // Ignore everything until the tag ends
      } else if (char === "=") {
        mode = MODE_PROP_SET;
        quoteWith = "";
        propName = buffer;
        buffer = "";
      } else if (
        char === "/" &&
        (mode < MODE_PROP_SET || statics[i][j + 1] === ">")
      ) {
        commit();
        mode = MODE_SLASH;
      } else if (
        char === " " ||
        char === "\t" ||
        char === "\n" ||
        char === "\r"
      ) {
        // <a disabled>
        commit();
        mode = MODE_WHITESPACE;
      } else {
        buffer += char;
      }

      if (mode === MODE_TAGNAME && buffer === "!--") {
        mode = MODE_COMMENT;
        minified.push("<!--");
      }
    }
  }
  commit();
  minified.push("");
  const newStatics = minified
    .reduce((acc, curr) => {
      if (
        Array.isArray(acc[acc.length - 1]) &&
        Array.isArray(curr) &&
        acc[acc.length - 1][0] === curr[0]
      ) {
        acc[acc.length - 1][1].push("");
        acc[acc.length - 1][1].push(curr[1][0]);
      } else {
        acc.push(curr);
      }
      return acc;
    }, [])
    .map((e) => (Array.isArray(e) ? [" ", e[0], "=", e[2], ...e[1], e[2]] : e))
    .flat()
    .reduce((acc, curr) => {
      if (typeof acc[acc.length - 1] === "string" && typeof curr === "string") {
        if (curr === "-->" && acc[acc.length - 1].endsWith("<!--")) {
          acc[acc.length - 1] = acc[acc.length - 1].slice(0, -4);
        } else {
          acc[acc.length - 1] += curr;
        }
      } else {
        acc.push(curr);
      }
      return acc;
    }, [])
    .filter((e) => typeof e === "string");
  if (newStatics.length !== statics.length) {
    console.error(statics, newStatics);
    throw new Error("the lengths of statics and newStatics are mismatched");
  }
  return newStatics;
}
