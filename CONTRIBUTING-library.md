# Adding a Bloom Library article

Add one article each Sunday. The public pages are `index.html` and `library/*.html`. Do not put health claims, prices, or internal tool names in a new article unless this guide says to.

## 1. Write the article

Copy `library/what-to-expect-at-your-first-visit.html` when the piece is about a Bloom visit. Copy `library/balanced-eating-made-simple.html` for a general education article.

Save it as `library/<slug>.html`. Use a short lowercase slug with hyphens, for example `library/evening-stretch.html`.

Keep the existing `<head>` pattern: title, description, canonical URL `https://naturalbloom.ca/library/<slug>.html`, and the Open Graph tags. Point the stylesheet at `article.css`.

In the body:

- One category pill. Use an existing category when it fits: Nutrition, Wellness, Recipes, Your Visit, Lab Results. Add a new category only if the owner agrees, and then add it to the filter in `index.html`.
- A title, a short excerpt, and “Written by the Bloom care team”.
- The article text. Teach general information. Do not give a personal plan. Herbs, food, and habits use “may support”. Do not say they cure, treat, prevent, or guarantee a result. Do not name a supplement brand or a prescription drug.
- Food ideas stay plant-based. Do not mention meat, fish, dairy, eggs, honey, gelatin, or bone broth, and do not mention veganism.
- Cite Canada’s Food Guide, Health Canada, or MyHealth.Alberta.ca when you state a fact.
- Keep the “Please read” note: educational only, not medical advice, talk to a provider, call 911 in an emergency.
- At most one service mention. The closing “If you would like to explore care” block, with the link to `/#waitlist`, is that mention. Do not add a second booking pitch.

## 2. Add the image

Save a JPG at `library/images/<slug>.jpg`.

Use 1152×720 pixels (16:10), the same size as the current images. The article hero and the library card both crop to 16:10.

The image is illustrative. Do not use a photo of a patient, a practitioner, or a laboratory result. Say that in the caption: “Illustrative AI-generated imagery.”

## 3. Add the card on the library index

In `index.html`, inside `<div class="lib-grid">` under `#view-library`, add an article card. Match the existing cards:

- `data-category` is the category name, such as `Nutrition`.
- The card image is a `div.res-img` with `background-image:url('library/images/<slug>.jpg')`.
- The pill text matches `data-category`.
- The title links to `/library/<slug>.html`.
- The excerpt is the same short text as the article deck.
- Include a “Read” link to the same URL.

The card image is the thumbnail. No extra image field is required.

If you added a new category, add a checkbox for it in the category panel in `index.html`. The value must match `data-category`.

## 4. Rebuild the search index

From the repository root:

```bash
python3 - << 'PY'
import json, re
from pathlib import Path
from html.parser import HTMLParser

class TextExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.parts = []
        self.skip = 0
    def handle_starttag(self, tag, attrs):
        if tag in ("script", "style"):
            self.skip += 1
    def handle_endtag(self, tag):
        if tag in ("script", "style") and self.skip:
            self.skip -= 1
        if tag in ("p", "li", "h2", "h3", "br", "div"):
            self.parts.append("\n")
    def handle_data(self, data):
        if not self.skip:
            self.parts.append(data)

index = {}
for path in sorted(Path("library").glob("*.html")):
    html = path.read_text()
    match = re.search(r'<div class="article-body">(.*)</div>\s*</article>', html, re.S)
    parser = TextExtractor()
    parser.feed(match.group(1))
    text = re.sub(r"[ \t]+", " ", "".join(parser.parts))
    text = re.sub(r"\n{2,}", "\n", text)
    text = re.sub(r" *\n *", "\n", text).strip()
    index["/library/" + path.name] = text
Path("library/search-index.json").write_text(json.dumps(index, ensure_ascii=False, indent=2) + "\n")
PY
```

The key must be `/library/<slug>.html`. The library search on `index.html` loads this file. It matches the title, the card excerpt, and this body text.

## 5. Check before you publish

Open the article and `index.html#library`. Confirm the card image, the category filter, and a search for a word that appears only in the body. Read the article once against the notes in step 1.
