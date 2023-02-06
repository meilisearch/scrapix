import { Dataset, createPuppeteerRouter } from "crawlee";

export const router = createPuppeteerRouter();

router.addDefaultHandler(async ({ enqueueLinks, log }) => {
  log.info(`enqueueing new URLs`);
  await enqueueLinks({
    globs: ["https://platform.openai.com/docs/**"],
    label: "detail",
  });
});

router.addHandler("detail", async ({ request, page, log }) => {
  const title = await page.title();
  ///get the meta of the page
  const meta = await page.evaluate(() => {
    const metas = document.getElementsByTagName("meta");
    const meta = {};
    for (let i = 0; i < metas.length; i++) {
      const name = metas[i].getAttribute("name");
      const content = metas[i].getAttribute("content");
      if (name && content) {
        meta[name] = content;
      }
    }
    return meta;
  });
  log.info(`${title}`, { url: request.loadedUrl });

  ///for each page create dataset of consecutive h1, h2, h3, p. at each header after a paragraph, create a new dataset
  let data = {};
  let elems = await page.$$("h1, h2, h3, p, td, li");
  for (let i = 0; i < elems.length; i++) {
    let elem = elems[i];
    let tag = await elem.evaluate((el) => el.tagName);
    let text = await elem.evaluate((el) => el.textContent);
    ///remove new lines
    text = text.replace(/[\r\n]+/gm, " ");
    ///remove multiple spaces
    text = text.replace(/\s+/g, " ");
    ///remove " (opens new window)"
    text = text.replace(/ \((opens new window)\)/g, "");
    ///remove '# ' from headers
    if (
      tag === "H1" ||
      tag === "H2" ||
      tag === "H3" ||
      tag === "H4" ||
      tag === "H5" ||
      tag === "H6"
    ) {
      text = text.replace("# ", "");
    }
    let id = await elem.evaluate((el) => el.id);
    data.uid = i;
    data.url = request.loadedUrl;
    data.title = title;
    data.meta = meta;
    if (tag === "H1") {
      if (data["h1"]) {
        await Dataset.pushData(data);
        data = {};
      }
      data["h1"] = text;
      data.anchor = "#" + id;
    } else if (tag === "H2") {
      if (data["h2"]) {
        await Dataset.pushData(data);
        data = { h1: data["h1"] };
      }
      data.anchor = "#" + id;
      data["h2"] = text;
    } else if (tag === "H3") {
      if (data["h3"]) {
        await Dataset.pushData(data);
        data = { h1: data["h1"], h2: data["h2"] };
      }
      data.anchor = "#" + id;
      data["h3"] = text;
    } else if (tag === "H4") {
      if (data["h4"]) {
        await Dataset.pushData(data);
        data = { h1: data["h1"], h2: data["h2"], h3: data["h3"] };
      }
      data.anchor = "#" + id;
      data["h4"] = text;
    } else if (tag === "H5") {
      if (data["h5"]) {
        await Dataset.pushData(data);
        data = {
          h1: data["h1"],
          h2: data["h2"],
          h3: data["h3"],
          h4: data["h4"],
        };
      }
      data.anchor = "#" + id;
      data["h5"] = text;
    } else if (tag === "H6") {
      if (data["h6"]) {
        await Dataset.pushData(data);
        data = {
          h1: data["h1"],
          h2: data["h2"],
          h3: data["h3"],
          h4: data["h4"],
          h5: data["h5"],
        };
      }
      data.anchor = "#" + id;
      data["h6"] = text;
    } else if (tag === "P" || tag === "TD" || tag === "LI") {
      if (!data["p"]) {
        data["p"] = [];
      }
      data["p"].push(text);
    }
    if (i === elems.length - 1) {
      await Dataset.pushData(data);
    }
  }
});
