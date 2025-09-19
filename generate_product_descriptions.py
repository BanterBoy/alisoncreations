#!/usr/bin/env python3
"""Generate Etsy-style product descriptions for images."""
from __future__ import annotations

import colorsys
import re
from collections import Counter
from pathlib import Path
from typing import Dict, Iterable, List, Sequence

from PIL import Image

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png"}

CLOSING_PHRASES = [
    "Lovingly handcrafted to make your space feel special.",
    "Handcrafted with care to bring heartfelt joy to your décor.",
    "Created to add a sprinkle of magic to any corner.",
]

DEFAULT_INFO = {
    "category": "artful décor accent",
    "subjects": ["an imaginative handcrafted scene"],
    "vibes": ["warm"],
    "uses": ["thoughtful gifting", "cozy corners", "everyday décor"],
    "tags": ["handmade", "decor", "gift idea"],
}

THEME_RULES: Sequence[Dict[str, Sequence[str]]] = [
    {
        "pattern": "balloon teddy",
        "subjects": ["a dreamy hot air balloon", "a snuggly teddy bear"],
        "vibes": ["whimsical", "dreamy"],
        "category": "nursery décor accent",
        "uses": ["nursery shelves", "baby shower gifting", "children's rooms"],
        "tags": ["hot air balloon decor", "teddy bear", "nursery art"],
    },
    {
        "pattern": "peek a boo",
        "subjects": ["a playful peek-a-boo teddy"],
        "vibes": ["playful", "sweet"],
        "category": "nursery décor accent",
        "uses": ["storytime corners", "nursery shelves", "little dreamers"],
        "tags": ["peekaboo teddy", "kids decor"],
    },
    {
        "pattern": "hot air",
        "subjects": ["a storybook hot air balloon"],
        "vibes": ["adventurous", "dreamy"],
        "category": "nursery décor accent",
        "uses": ["nursery walls", "playroom displays", "whimsical gifting"],
        "tags": ["hot air balloon", "sky adventure"],
    },
    {
        "pattern": "ballon",
        "subjects": ["a floating balloon motif"],
        "vibes": ["dreamy"],
        "category": "nursery décor accent",
        "uses": ["nursery corners", "storybook décor", "celebrations"],
        "tags": ["balloon decor"],
    },
    {
        "pattern": "balloon",
        "subjects": ["a floating balloon motif"],
        "vibes": ["dreamy"],
        "category": "nursery décor accent",
        "uses": ["nursery corners", "storybook décor", "celebrations"],
        "tags": ["balloon decor"],
    },
    {
        "pattern": "teddy",
        "subjects": ["a cuddly teddy bear"],
        "vibes": ["sweet", "comforting"],
        "category": "nursery décor accent",
        "uses": ["nursery shelves", "baby shower gifting", "children's rooms"],
        "tags": ["teddy bear", "nursery decor"],
    },
    {
        "pattern": "light up",
        "subjects": ["twinkling storybook scenery"],
        "vibes": ["glowing", "magical"],
        "category": "illuminated décor accent",
        "uses": ["evening ambiance", "mantel displays", "cozy corners"],
        "tags": ["light up decor", "glowing scene"],
    },
    {
        "pattern": "xmas",
        "subjects": ["a festive Christmas moment"],
        "vibes": ["festive", "cozy"],
        "category": "holiday décor accent",
        "uses": ["winter mantels", "holiday gifting", "seasonal displays"],
        "tags": ["christmas", "holiday decor"],
    },
    {
        "pattern": "christmas",
        "subjects": ["a festive Christmas moment"],
        "vibes": ["festive", "cozy"],
        "category": "holiday décor accent",
        "uses": ["winter mantels", "holiday gifting", "seasonal displays"],
        "tags": ["christmas", "holiday decor"],
    },
    {
        "pattern": "snow",
        "subjects": ["snowy winter scenery"],
        "vibes": ["frosted", "serene"],
        "category": "holiday décor accent",
        "uses": ["winter mantels", "seasonal vignettes", "cozy cabins"],
        "tags": ["snow scene", "winter wonderland"],
    },
    {
        "pattern": "ornament",
        "subjects": ["a delicate hanging ornament"],
        "vibes": ["festive", "sparkling"],
        "category": "holiday ornament",
        "uses": ["tree trimming", "gift toppers", "holiday keepsakes"],
        "tags": ["ornament", "holiday ornament"],
    },
    {
        "pattern": "hanging",
        "subjects": ["a hanging décor piece"],
        "vibes": ["airy", "delightful"],
        "category": "hanging décor accent",
        "uses": ["wall hooks", "seasonal branches", "entryway displays"],
        "tags": ["hanging decor"],
    },
    {
        "pattern": "wooden",
        "subjects": ["woodland textures"],
        "vibes": ["rustic", "cozy"],
        "category": "rustic home accent",
        "uses": ["woodland nurseries", "cabin décor", "mantel styling"],
        "tags": ["woodland decor", "rustic"],
    },
    {
        "pattern": "house scene",
        "subjects": ["storybook cottage houses"],
        "vibes": ["cozy", "nostalgic"],
        "category": "home décor accent",
        "uses": ["mantel displays", "entryway styling", "housewarming gifts"],
        "tags": ["house scene", "village decor"],
    },
    {
        "pattern": "houses",
        "subjects": ["storybook cottage houses"],
        "vibes": ["cozy", "nostalgic"],
        "category": "home décor accent",
        "uses": ["mantel displays", "entryway styling", "housewarming gifts"],
        "tags": ["house scene", "village decor"],
    },
    {
        "pattern": "house",
        "subjects": ["a charming little house"],
        "vibes": ["cozy", "welcoming"],
        "category": "home décor accent",
        "uses": ["mantel displays", "entryway styling", "housewarming gifts"],
        "tags": ["house decor"],
    },
    {
        "pattern": "village",
        "subjects": ["a miniature village scene"],
        "vibes": ["cozy", "nostalgic"],
        "category": "home décor accent",
        "uses": ["mantel displays", "seasonal scenes", "housewarming gifts"],
        "tags": ["village scene"],
    },
    {
        "pattern": "bird",
        "subjects": ["sweet songbirds"],
        "vibes": ["peaceful", "nature-loving"],
        "category": "nature-inspired décor accent",
        "uses": ["garden rooms", "springtime gifting", "sunrooms"],
        "tags": ["bird decor", "nature art"],
    },
    {
        "pattern": "butterfly",
        "subjects": ["delicate butterfly wings"],
        "vibes": ["whimsical", "uplifting"],
        "category": "nature-inspired décor accent",
        "uses": ["spring celebrations", "garden parties", "cheerful corners"],
        "tags": ["butterfly decor", "spring gift"],
    },
    {
        "pattern": "dragonfly",
        "subjects": ["shimmering dragonflies"],
        "vibes": ["enchanted", "nature-loving"],
        "category": "nature-inspired décor accent",
        "uses": ["garden rooms", "lakeside cottages", "nature gifting"],
        "tags": ["dragonfly decor", "nature gift"],
    },
    {
        "pattern": "dragon",
        "subjects": ["a mythical dragon"],
        "vibes": ["mystical", "bold"],
        "category": "fantasy décor accent",
        "uses": ["story lovers", "fantasy shelves", "collectible displays"],
        "tags": ["dragon decor", "fantasy art"],
    },
    {
        "pattern": "fairy",
        "subjects": ["a graceful fairy"],
        "vibes": ["enchanted", "delicate"],
        "category": "fantasy décor accent",
        "uses": ["storybook nooks", "nursery corners", "magical gifting"],
        "tags": ["fairy decor", "fairy gift"],
    },
    {
        "pattern": "angel",
        "subjects": ["a serene angel"],
        "vibes": ["peaceful", "comforting"],
        "category": "spiritual décor accent",
        "uses": ["memorial gifts", "serene corners", "holiday mantels"],
        "tags": ["angel decor", "guardian angel"],
    },
    {
        "pattern": "gnome",
        "subjects": ["a cheerful gnome"],
        "vibes": ["playful", "woodland"],
        "category": "whimsical décor accent",
        "uses": ["garden shelves", "storytime corners", "seasonal displays"],
        "tags": ["gnome decor", "woodland"],
    },
    {
        "pattern": "unicorn",
        "subjects": ["a magical unicorn"],
        "vibes": ["enchanted", "dreamy"],
        "category": "fantasy décor accent",
        "uses": ["nursery shelves", "birthday gifting", "storybook corners"],
        "tags": ["unicorn decor", "magical gift"],
    },
    {
        "pattern": "mushroon",
        "subjects": ["enchanted mushrooms"],
        "vibes": ["woodland", "whimsical"],
        "category": "woodland décor accent",
        "uses": ["fairy gardens", "storybook shelving", "whimsy gifting"],
        "tags": ["mushroom decor", "woodland"],
    },
    {
        "pattern": "mushroom",
        "subjects": ["enchanted mushrooms"],
        "vibes": ["woodland", "whimsical"],
        "category": "woodland décor accent",
        "uses": ["fairy gardens", "storybook shelving", "whimsy gifting"],
        "tags": ["mushroom decor", "woodland"],
    },
    {
        "pattern": "bunny",
        "subjects": ["sweet woodland bunnies"],
        "vibes": ["playful", "gentle"],
        "category": "springtime décor accent",
        "uses": ["Easter gifting", "nursery shelves", "spring mantels"],
        "tags": ["bunny decor", "springtime"],
    },
    {
        "pattern": "bunnys",
        "subjects": ["sweet woodland bunnies"],
        "vibes": ["playful", "gentle"],
        "category": "springtime décor accent",
        "uses": ["Easter gifting", "nursery shelves", "spring mantels"],
        "tags": ["bunny decor", "springtime"],
    },
    {
        "pattern": "frog",
        "subjects": ["a joyful frog"],
        "vibes": ["playful", "nature-loving"],
        "category": "nature-inspired décor accent",
        "uses": ["garden rooms", "kids' spaces", "cheerful gifting"],
        "tags": ["frog decor", "whimsical gift"],
    },
    {
        "pattern": "cat",
        "subjects": ["a charming cat"],
        "vibes": ["cozy", "playful"],
        "category": "pet-lover décor accent",
        "uses": ["cat lovers", "bookshelves", "pet-friendly gifting"],
        "tags": ["cat decor", "pet lover gift"],
    },
    {
        "pattern": "dog",
        "subjects": ["a loyal dog"],
        "vibes": ["heartfelt", "friendly"],
        "category": "pet-lover décor accent",
        "uses": ["pet lovers", "family rooms", "thoughtful gifting"],
        "tags": ["dog decor", "pet lover gift"],
    },
    {
        "pattern": "pawprint",
        "subjects": ["a cherished paw print"],
        "vibes": ["heartfelt", "comforting"],
        "category": "pet remembrance accent",
        "uses": ["pet memorials", "pet lovers", "comforting gifts"],
        "tags": ["paw print", "pet memorial"],
    },
    {
        "pattern": "paw",
        "subjects": ["a cherished paw print"],
        "vibes": ["heartfelt", "comforting"],
        "category": "pet remembrance accent",
        "uses": ["pet memorials", "pet lovers", "comforting gifts"],
        "tags": ["paw print", "pet memorial"],
    },
    {
        "pattern": "elephant",
        "subjects": ["a gentle elephant"],
        "vibes": ["wise", "lovable"],
        "category": "nursery décor accent",
        "uses": ["nursery shelves", "safari themes", "baby gifting"],
        "tags": ["elephant decor", "nursery elephant"],
    },
    {
        "pattern": "anchor",
        "subjects": ["a nautical anchor"],
        "vibes": ["coastal", "steady"],
        "category": "coastal décor accent",
        "uses": ["beach cottages", "nautical nurseries", "seaside gifting"],
        "tags": ["nautical decor", "anchor art"],
    },
    {
        "pattern": "boat",
        "subjects": ["a charming boat"],
        "vibes": ["coastal", "adventurous"],
        "category": "coastal décor accent",
        "uses": ["beach cottages", "nautical nurseries", "seaside gifting"],
        "tags": ["boat decor", "coastal"],
    },
    {
        "pattern": "dingy",
        "subjects": ["a cozy dinghy"],
        "vibes": ["coastal", "relaxed"],
        "category": "coastal décor accent",
        "uses": ["lakeside cabins", "nautical shelves", "seaside gifting"],
        "tags": ["boat decor", "lake house"],
    },
    {
        "pattern": "tent",
        "subjects": ["storybook tents"],
        "vibes": ["whimsical", "campfire cozy"],
        "category": "storybook décor accent",
        "uses": ["sleepover parties", "nursery corners", "camping lovers"],
        "tags": ["tent decor", "campfire"],
    },
    {
        "pattern": "candel",
        "subjects": ["glowing candlelight"],
        "vibes": ["glowing", "cozy"],
        "category": "illuminated décor accent",
        "uses": ["evening ambiance", "mantel displays", "romantic gifting"],
        "tags": ["candle decor", "glowing"],
    },
    {
        "pattern": "candle",
        "subjects": ["glowing candlelight"],
        "vibes": ["glowing", "cozy"],
        "category": "illuminated décor accent",
        "uses": ["evening ambiance", "mantel displays", "romantic gifting"],
        "tags": ["candle decor", "glowing"],
    },
    {
        "pattern": "flower pot",
        "subjects": ["bloom-filled pots"],
        "vibes": ["botanical", "cheerful"],
        "category": "floral home accent",
        "uses": ["kitchen windows", "garden rooms", "spring gifting"],
        "tags": ["flower pot", "floral decor"],
    },
    {
        "pattern": "flower pots",
        "subjects": ["bloom-filled pots"],
        "vibes": ["botanical", "cheerful"],
        "category": "floral home accent",
        "uses": ["kitchen windows", "garden rooms", "spring gifting"],
        "tags": ["flower pot", "floral decor"],
    },
    {
        "pattern": "flower cup",
        "subjects": ["a charming floral teacup"],
        "vibes": ["botanical", "sweet"],
        "category": "floral home accent",
        "uses": ["tea lovers", "kitchen shelves", "garden parties"],
        "tags": ["teacup decor", "floral"],
    },
    {
        "pattern": "cup",
        "subjects": ["a charming floral teacup"],
        "vibes": ["botanical", "sweet"],
        "category": "floral home accent",
        "uses": ["tea lovers", "kitchen shelves", "garden parties"],
        "tags": ["teacup decor", "floral"],
    },
    {
        "pattern": "saucer",
        "subjects": ["delicate saucer blooms"],
        "vibes": ["graceful", "botanical"],
        "category": "floral home accent",
        "uses": ["tea parties", "kitchen décor", "garden gifting"],
        "tags": ["saucer decor", "floral"],
    },
    {
        "pattern": "jar",
        "subjects": ["bloom-filled jars"],
        "vibes": ["rustic", "botanical"],
        "category": "floral home accent",
        "uses": ["kitchen shelves", "wedding tables", "spring gifting"],
        "tags": ["flower jar", "rustic floral"],
    },
    {
        "pattern": "vase",
        "subjects": ["artful floral vases"],
        "vibes": ["botanical", "elegant"],
        "category": "floral home accent",
        "uses": ["dining tables", "wedding décor", "spring gifting"],
        "tags": ["flower vase", "floral centerpieces"],
    },
    {
        "pattern": "flowered",
        "subjects": ["blooming floral patterns"],
        "vibes": ["botanical", "uplifting"],
        "category": "floral home accent",
        "uses": ["garden parties", "spring gifting", "cheerful rooms"],
        "tags": ["floral", "bloom"],
    },
    {
        "pattern": "flower",
        "subjects": ["blooming floral accents"],
        "vibes": ["botanical", "uplifting"],
        "category": "floral home accent",
        "uses": ["garden parties", "spring gifting", "cheerful rooms"],
        "tags": ["floral", "flower art"],
    },
    {
        "pattern": "rose",
        "subjects": ["romantic rose blooms"],
        "vibes": ["romantic", "botanical"],
        "category": "floral home accent",
        "uses": ["anniversaries", "romantic gifting", "bedroom décor"],
        "tags": ["rose decor", "romantic gift"],
    },
    {
        "pattern": "quote",
        "subjects": ["an uplifting quote"],
        "vibes": ["encouraging", "heartfelt"],
        "category": "sentimental décor accent",
        "uses": ["thoughtful gifting", "inspirational corners", "daily motivation"],
        "tags": ["quote art", "inspirational"],
    },
    {
        "pattern": "family",
        "subjects": ["a celebration of family"],
        "vibes": ["heartfelt", "welcoming"],
        "category": "sentimental décor accent",
        "uses": ["family rooms", "housewarming gifts", "entryway displays"],
        "tags": ["family gift", "family decor"],
    },
    {
        "pattern": "love",
        "subjects": ["a sweet love story"],
        "vibes": ["romantic", "heartfelt"],
        "category": "sentimental décor accent",
        "uses": ["anniversaries", "wedding gifts", "romantic corners"],
        "tags": ["love birds", "romantic gift"],
    },
    {
        "pattern": "heart",
        "subjects": ["heartwarming hearts"],
        "vibes": ["romantic", "comforting"],
        "category": "sentimental décor accent",
        "uses": ["anniversary gifting", "bedroom décor", "wedding tables"],
        "tags": ["heart decor", "romantic"],
    },
    {
        "pattern": "star",
        "subjects": ["twinkling stars"],
        "vibes": ["dreamy", "enchanted"],
        "category": "storybook décor accent",
        "uses": ["nursery nights", "bedtime routines", "stargazers"],
        "tags": ["star decor", "night sky"],
    },
    {
        "pattern": "bench",
        "subjects": ["a charming little bench"],
        "vibes": ["cozy", "storytelling"],
        "category": "home décor accent",
        "uses": ["mantel displays", "storybook scenes", "gift giving"],
        "tags": ["bench decor", "storybook"],
    },
    {
        "pattern": "welcome",
        "subjects": ["a warm welcome message"],
        "vibes": ["welcoming", "friendly"],
        "category": "entryway décor accent",
        "uses": ["front doors", "porch décor", "housewarming gifts"],
        "tags": ["welcome sign", "front door decor"],
    },
    {
        "pattern": "stag",
        "subjects": ["a noble stag"],
        "vibes": ["rustic", "majestic"],
        "category": "woodland décor accent",
        "uses": ["cabin décor", "winter mantels", "woodland gifting"],
        "tags": ["stag decor", "woodland"],
    },
]


def unique_preserve(items: Iterable[str]) -> List[str]:
    seen = set()
    result: List[str] = []
    for item in items:
        if not item:
            continue
        if item not in seen:
            result.append(item)
            seen.add(item)
    return result


def join_natural(items: Sequence[str], conj: str = "and") -> str:
    items = [item for item in items if item]
    if not items:
        return ""
    if len(items) == 1:
        return items[0]
    if len(items) == 2:
        return f"{items[0]} {conj} {items[1]}"
    return ", ".join(items[:-1]) + f", {conj} {items[-1]}"


def describe_color(rgb: Sequence[int]) -> Dict[str, object]:
    r, g, b = rgb
    r_f, g_f, b_f = [value / 255.0 for value in (r, g, b)]
    h, s, v = colorsys.rgb_to_hsv(r_f, g_f, b_f)
    h_deg = h * 360

    if s < 0.1:
        if v > 0.92:
            return {"description": "pure white", "tag": "white", "hsv": (h, s, v)}
        if v > 0.75:
            return {"description": "soft dove grey", "tag": "grey", "hsv": (h, s, v)}
        if v > 0.55:
            return {"description": "cool pewter grey", "tag": "grey", "hsv": (h, s, v)}
        if v > 0.35:
            return {"description": "smoky charcoal", "tag": "grey", "hsv": (h, s, v)}
        return {"description": "deep charcoal", "tag": "black", "hsv": (h, s, v)}

    base_options = [
        (15, ("scarlet red", "red")),
        (30, ("coral orange", "orange")),
        (50, ("amber gold", "yellow")),
        (80, ("spring green", "green")),
        (140, ("emerald green", "green")),
        (170, ("teal", "teal")),
        (200, ("sky blue", "blue")),
        (230, ("cobalt blue", "blue")),
        (260, ("indigo", "indigo")),
        (290, ("violet purple", "purple")),
        (320, ("magenta", "magenta")),
        (345, ("fuchsia pink", "pink")),
        (360, ("rose pink", "pink")),
    ]

    base_name, base_tag = base_options[-1][1]
    for threshold, (name, tag) in base_options:
        if h_deg < threshold:
            base_name, base_tag = name, tag
            break

    descriptor = ""
    if v > 0.82 and s < 0.4:
        descriptor = "soft"
    elif v > 0.82:
        descriptor = "light"
    elif v < 0.35:
        descriptor = "deep"
    elif s > 0.75:
        descriptor = "vibrant"
    elif s < 0.35:
        descriptor = "muted"

    description = f"{descriptor} {base_name}".strip()
    description = re.sub(r"\s+", " ", description)
    return {"description": description, "tag": base_tag, "hsv": (h, s, v)}


def extract_dominant_colors(image_path: Path, top_n: int = 3) -> List[Dict[str, object]]:
    try:
        with Image.open(image_path) as img:
            img = img.convert("RGB")
            img = img.resize((120, 120))
            color_counts = img.getcolors(img.size[0] * img.size[1])
    except Exception:
        return []

    counter: Counter = Counter()
    if color_counts:
        for count, color in color_counts:
            counter[color] += count
    else:
        try:
            with Image.open(image_path) as img:
                img = img.convert("RGB")
                counter.update(img.getdata())
        except Exception:
            return []

    color_details: List[Dict[str, object]] = []
    for rgb, _ in counter.most_common(top_n * 5):
        detail = describe_color(rgb)
        if not detail:
            continue
        if all(existing["description"] != detail["description"] for existing in color_details):
            color_details.append(detail)
        if len(color_details) >= top_n:
            break
    return color_details


def determine_color_mood(colors: Sequence[Dict[str, object]]) -> str:
    if not colors:
        return "a calm neutral glow"
    sat_avg = sum(color["hsv"][1] for color in colors) / len(colors)
    val_avg = sum(color["hsv"][2] for color in colors) / len(colors)
    if val_avg > 0.78 and sat_avg < 0.45:
        return "an airy, gentle glow"
    if val_avg > 0.65 and sat_avg >= 0.45:
        return "a bright, joyful spirit"
    if val_avg < 0.4:
        return "a cozy, intimate mood"
    if sat_avg < 0.25:
        return "a calm, neutral presence"
    if sat_avg > 0.65:
        return "a vibrant burst of color"
    return "a soothing, balanced energy"


def apply_theme_rules(stem: str) -> Dict[str, Sequence[str]]:
    normalized = re.sub(r"[^a-z0-9]+", " ", stem.lower()).strip()
    words = normalized.split()
    subjects: List[str] = []
    vibes: List[str] = []
    uses: List[str] = []
    tags: List[str] = []
    category: str | None = None

    for rule in THEME_RULES:
        pattern = rule["pattern"]
        matches = False
        if " " in pattern:
            matches = pattern in normalized
        else:
            matches = pattern in words
        if not matches:
            continue
        subjects.extend(rule.get("subjects", []))
        vibes.extend(rule.get("vibes", []))
        uses.extend(rule.get("uses", []))
        tags.extend(rule.get("tags", []))
        if not category and rule.get("category"):
            category = rule["category"]

    if not subjects:
        subjects = list(DEFAULT_INFO["subjects"])
    if not vibes:
        vibes = list(DEFAULT_INFO["vibes"])
    if not uses:
        uses = list(DEFAULT_INFO["uses"])
    if not tags:
        tags = list(DEFAULT_INFO["tags"])
    if not category:
        category = DEFAULT_INFO["category"]

    return {
        "subjects": unique_preserve(subjects),
        "vibes": unique_preserve(vibes),
        "uses": unique_preserve(uses),
        "tags": unique_preserve(tags),
        "category": category,
    }


def human_title(filename: str) -> str:
    stem = Path(filename).stem
    cleaned = re.sub(r"[_-]+", " ", stem)
    cleaned = re.sub(r"\s+", " ", cleaned)
    cleaned = cleaned.strip()
    if not cleaned:
        cleaned = stem.strip()
    return cleaned.title()


def build_tags(base_tags: Sequence[str], color_details: Sequence[Dict[str, object]], title: str) -> List[str]:
    tag_candidates: List[str] = []
    for tag in base_tags:
        tag_candidates.append(tag.lower())
    for color in color_details:
        tag_candidates.append(color["tag"])
    tag_candidates.extend(["handmade", "home decor", "gift idea"])
    simple_title = re.sub(r"[^a-z0-9 ]+", "", title.lower())
    for word in simple_title.split():
        if len(word) > 2:
            tag_candidates.append(word)
    tags = unique_preserve(tag_candidates)
    return tags[:13]


def craft_description(title: str, info: Dict[str, Sequence[str]], colors: Sequence[Dict[str, object]], closing: str) -> str:
    vibes = list(info["vibes"])[:3]
    vibe_phrase = join_natural(vibes, "and") if vibes else "warm"
    category = info["category"]
    intro = f"Bring home {vibe_phrase} charm with our {title}, a {category}."

    subjects = list(info["subjects"])[:3]
    subject_sentence = "It highlights "
    subject_sentence += join_natural(subjects, "and")
    subject_sentence += " with handcrafted detail." if subjects else "Handcrafted with care."

    if colors:
        color_phrase = join_natural([color["description"] for color in colors], "and")
        color_mood = determine_color_mood(colors)
        color_sentence = f"A palette of {color_phrase} lends {color_mood}."
    else:
        color_sentence = "Soft neutral tones lend an easygoing glow."

    uses = list(info["uses"])[:3]
    use_sentence = f"Perfect for {join_natural(uses, 'or')}."

    description = " ".join([intro, subject_sentence, color_sentence, use_sentence, closing])
    return description


def generate_markdown(image_dir: Path, output_file: Path) -> None:
    image_paths = sorted(
        [p for p in image_dir.iterdir() if p.suffix.lower() in IMAGE_EXTENSIONS]
    )
    lines: List[str] = ["# Product Descriptions", ""]

    for index, image_path in enumerate(image_paths):
        title = human_title(image_path.name)
        info = apply_theme_rules(image_path.stem)
        colors = extract_dominant_colors(image_path)
        closing = CLOSING_PHRASES[index % len(CLOSING_PHRASES)]
        description = craft_description(title, info, colors, closing)
        tags = build_tags(info["tags"], colors, title)
        lines.append(f"## {title}")
        lines.append(f"**Description:** {description}")
        lines.append("")
        lines.append("**Tags:** " + ", ".join(tags))
        lines.append("")

    output_file.write_text("\n".join(lines).strip() + "\n", encoding="utf-8")


def main() -> None:
    image_dir = Path("resources/images")
    output_file = Path("v2_product_descriptions.md")
    if not image_dir.exists():
        raise SystemExit(f"Image directory not found: {image_dir}")
    generate_markdown(image_dir, output_file)


if __name__ == "__main__":
    main()
