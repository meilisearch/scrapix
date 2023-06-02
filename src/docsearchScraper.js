import prettier from "prettier";
import { v4 as uuidv4 } from "uuid";

export default class DocsearchScaper {
  constructor(sender, config) {
    console.log("init DocsearchScaper");
    this.sender = sender;

    this.sender.updateSettings({
      searchableAttributes: [
        "hierarchy_lvl0",
        "hierarchy_lvl1",
        "hierarchy_lvl2",
        "hierarchy_lvl3",
        "hierarchy_lvl4",
        "hierarchy_lvl5",
        "content",
      ],
    });
  }

  async get(url, page) {
    //for each page create dataset of consecutive h1, h2, h3, p. at each header after a paragraph, create a new dataset
    let data = {};
    let elems = await page.$$(
      "main h1, main h2, main h3, main h4, main h5, main p, main td, main li, main span"
    );
    if (elems.length === 0) {
      elems = await page.$$("h1, h2, h3, h4, h5, p, td, li, span");
    }
    let page_block = 0;
    for (let i = 0; i < elems.length; i++) {
      let elem = elems[i];
      let tag = await elem.evaluate((el) => el.tagName);
      let text = await elem.evaluate((el) => el.textContent);
      text = this._clean_text(text);
      data.uid = uuidv4();
      data.url = url;
      let urls_tags = new URL(url).pathname.split("/");
      let only_urls_tags = urls_tags.slice(1, urls_tags.length - 1);
      data.hierarchy_lvl0 = only_urls_tags[0];

      let id = await elem.evaluate((el) => el.id);
      if (tag === "H1") {
        if (data["hierarchy_lvl1"]) {
          await this.sender.add(data);
          page_block++;
          data = {};
        }
        data["hierarchy_lvl1"] = text;
        data.anchor = "#" + id;
      } else if (tag === "H2") {
        if (data["hierarchy_lvl2"]) {
          await this.sender.add(data);
          page_block++;
          data = { hierarchy_lvl1: data["hierarchy_lvl1"] };
        }
        data.anchor = "#" + id;
        data["hierarchy_lvl2"] = text;
      } else if (tag === "H3") {
        if (data["hierarchy_lvl3"]) {
          await this.sender.add(data);
          page_block++;
          data = {
            hierarchy_lvl1: data["hierarchy_lvl1"],
            hierarchy_lvl2: data["hierarchy_lvl2"],
          };
        }
        data.anchor = "#" + id;
        data["hierarchy_lvl3"] = text;
      } else if (tag === "H4") {
        if (data["hierarchy_lvl4"]) {
          await this.sender.add(data);
          page_block++;
          data = {
            hierarchy_lvl1: data["hierarchy_lvl1"],
            hierarchy_lvl2: data["hierarchy_lvl2"],
            hierarchy_lvl3: data["hierarchy_lvl3"],
          };
        }
        data.anchor = "#" + id;
        data["hierarchy_lvl4"] = text;
      } else if (tag === "H5") {
        if (data["hierarchy_lvl5"]) {
          await this.sender.add(data);
          page_block++;
          data = {
            hierarchy_lvl1: data["hierarchy_lvl1"],
            hierarchy_lvl2: data["hierarchy_lvl2"],
            hierarchy_lvl3: data["hierarchy_lvl3"],
            hierarchy_lvl4: data["hierarchy_lvl4"],
          };
        }
        data.anchor = "#" + id;
        data["hierarchy_lvl5"] = text;
      } else if (
        tag === "P" ||
        tag === "TD" ||
        tag === "LI" ||
        tag === "SPAN"
      ) {
        if (!data["content"]) {
          data["content"] = [];
        }
        if (!data["content"].includes(text)) {
          data["content"].push(text);
        }
      }
      if (i === elems.length - 1) {
        data.hierarchy_radio_lvl0 = null;
        data.hierarchy_radio_lvl1 = data.hierarchy_lvl1;
        data.hierarchy_radio_lvl2 = data.hierarchy_lvl2;
        data.hierarchy_radio_lvl3 = data.hierarchy_lvl3;
        data.hierarchy_radio_lvl4 = data.hierarchy_lvl4;
        data.hierarchy_radio_lvl5 = data.hierarchy_lvl5;
        data.url = data.url + "#" + data.anchor;
        data.anchor = data.anchor.substring(1);
        await this.sender.add(data);
      }
    }
  }

  // Remove from a text all multiple spaces, new lines, and leading and trailing spaces, and
  // remove '# ' from the beginning of the text
  _clean_text(text) {
    text = text.replace(/[\r\n]+/gm, " ");
    ///remove multiple spaces
    text = text.replace(/\s+/g, " ");
    ///remove '# '
    text = text.replace("# ", "");
    /// Trim leading and trailing spaces
    text = text.replace(/^\s+|\s+$/g, "");
    return text;
  }
}
