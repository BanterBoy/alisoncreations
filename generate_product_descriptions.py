"""Generate warm, creative product descriptions for images in the resources folder.

This script scans the ``resources/images`` directory, analyses each image to
identify dominant colours and other simple heuristics, and writes a
``product_descriptions.md`` file in the repository root.  The output can be
regenerated at any time – running the script again will replace the markdown
file with fresh descriptions.

The image analysis uses Pillow for colour extraction.  If additional computer
vision tooling is available it could be integrated where indicated, but the
script works out-of-the-box with Pillow's lightweight features.
"""

from __future__ import annotations

import logging
import math
import re
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, List, Sequence

from PIL import Image


logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")


# Common image file extensions the script should scan for.
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".bmp", ".tif", ".tiff", ".webp"}


# Basic colour palette that the script maps dominant colours to.  The palette is
# intentionally compact so that the generated descriptions use friendly colour
# names rather than raw RGB values.  The RGB triplets were chosen from common
# named colours.
COLOUR_MAP = {
    "white": (245, 245, 245),
    "cream": (240, 234, 214),
    "ivory": (250, 244, 230),
    "silver": (192, 192, 192),
    "gray": (128, 128, 128),
    "black": (10, 10, 10),
    "blush": (255, 204, 204),
    "pink": (255, 182, 193),
    "red": (220, 20, 60),
    "terracotta": (204, 102, 51),
    "orange": (255, 140, 0),
    "gold": (212, 175, 55),
    "yellow": (255, 215, 0),
    "olive": (128, 128, 0),
    "sage": (188, 199, 158),
    "green": (60, 179, 113),
    "mint": (170, 240, 209),
    "teal": (0, 128, 128),
    "turquoise": (64, 224, 208),
    "blue": (70, 130, 180),
    "navy": (25, 25, 112),
    "lavender": (216, 191, 216),
    "purple": (128, 0, 128),
    "mauve": (136, 96, 160),
    "magenta": (218, 112, 214),
    "brown": (139, 69, 19),
    "copper": (184, 115, 51),
    "bronze": (205, 127, 50),
    "taupe": (150, 120, 105),
}


@dataclass(frozen=True)
class ThemeProfile:
    """Describes stylistic hints for different subject matter."""

    keywords: frozenset[str]
    style: str
    feature: str
    placement: str
    benefit: str
    appeal: str
    extra_tags: tuple[str, ...]


THEME_PROFILES: tuple[ThemeProfile, ...] = (
    ThemeProfile(
        keywords=frozenset({"teddy", "bear"}),
        style="whimsical nursery keepsake",
        feature="cuddly teddy bears and playful trimmings",
        placement="a nursery shelf, child's bedroom, or baby shower display",
        benefit="spark daydreams and gentle smiles",
        appeal="storybook sweetness",
        extra_tags=("nursery decor", "teddy bear gift", "baby shower"),
    ),
    ThemeProfile(
        keywords=frozenset({"house", "home", "village", "cottage"}),
        style="handcrafted cottage vignette",
        feature="layered little houses and welcoming windows",
        placement="a mantel, entryway table, or cozy bookshelf",
        benefit="make your home feel instantly more inviting",
        appeal="storybook village charm",
        extra_tags=("house decor", "cottagecore", "mantel styling"),
    ),
    ThemeProfile(
        keywords=frozenset({"butterfly", "dragonfly"}),
        style="delicate nature-inspired accent",
        feature="fluttering wings and botanical flourishes",
        placement="a sunlit shelf, craft room, or reading nook",
        benefit="bring a breath of garden air indoors",
        appeal="soft botanical magic",
        extra_tags=("nature lover", "butterfly art", "garden decor"),
    ),
    ThemeProfile(
        keywords=frozenset({"balloon"}),
        style="dreamy celebration display",
        feature="floating balloon silhouettes and fanciful details",
        placement="a party dessert table, child's room, or nursery corner",
        benefit="add a buoyant note of celebration",
        appeal="lifted-spirits joy",
        extra_tags=("balloon decor", "party styling", "celebration gift"),
    ),
    ThemeProfile(
        keywords=frozenset({"angel", "fairy"}),
        style="ethereal figurine",
        feature="gentle wings and serene expressions",
        placement="a meditation space, nursery, or keepsake shelf",
        benefit="invite tranquility and grace",
        appeal="heavenly calm",
        extra_tags=("angel figurine", "guardian angel", "spiritual gift"),
    ),
    ThemeProfile(
        keywords=frozenset({"frog"}),
        style="cheerful woodland companion",
        feature="friendly frog features and lily-pad hues",
        placement="a windowsill, terrarium, or whimsical desk vignette",
        benefit="bring playful woodland energy to your day",
        appeal="woodland whimsy",
        extra_tags=("frog decor", "woodland nursery", "whimsical gift"),
    ),
    ThemeProfile(
        keywords=frozenset({"flower", "floral", "flowers"}),
        style="bloom-filled art piece",
        feature="handplaced florals and petal-inspired textures",
        placement="a dining centerpiece, dresser top, or creative studio",
        benefit="refresh your space with lasting blooms",
        appeal="fresh botanical joy",
        extra_tags=("floral decor", "flower lover", "botanical gift"),
    ),
    ThemeProfile(
        keywords=frozenset({"boat", "anchor", "dingy", "ship"}),
        style="coastal keepsake",
        feature="nautical lines and gentle maritime textures",
        placement="a seaside cottage shelf, bathroom, or mantel",
        benefit="bring the hush of the harbour indoors",
        appeal="seaside serenity",
        extra_tags=("nautical decor", "coastal gift", "beach house"),
    ),
    ThemeProfile(
        keywords=frozenset({"quote", "words", "saying"}),
        style="sentimental quote plaque",
        feature="uplifting typography and heartfelt accents",
        placement="an entryway table, gallery wall, or workspace",
        benefit="share a message that encourages every visitor",
        appeal="heartfelt inspiration",
        extra_tags=("quote art", "inspirational gift", "sentimental decor"),
    ),
    ThemeProfile(
        keywords=frozenset({"christmas", "snow", "winter", "reindeer", "raindeer", "ornament", "xmas"}),
        style="twinkling holiday scene",
        feature="festive silhouettes and seasonal sparkle",
        placement="a holiday mantel, dining table, or gift display",
        benefit="wrap your celebrations in cozy cheer",
        appeal="Yuletide glow",
        extra_tags=("christmas decor", "holiday gift", "winter wonderland"),
    ),
    ThemeProfile(
        keywords=frozenset({"cat", "dog", "pet", "paw"}),
        style="pet-loving accent",
        feature="adorable pet-inspired artistry",
        placement="a hallway console, pet corner, or gift basket",
        benefit="celebrate the companions you adore",
        appeal="heartfelt pet love",
        extra_tags=("pet lover", "cat decor", "dog gift"),
    ),
    ThemeProfile(
        keywords=frozenset({"bird", "birds"}),
        style="songbird scene",
        feature="perched birds and graceful branches",
        placement="a breakfast nook, conservatory, or windowsill",
        benefit="fill your space with bird-song charm",
        appeal="featherlight serenity",
        extra_tags=("bird lover", "spring decor", "nature art"),
    ),
    ThemeProfile(
        keywords=frozenset({"unicorn"}),
        style="mythical keepsake",
        feature="enchanted unicorn details and stardust accents",
        placement="a child's dresser, playroom, or fantasy-themed party",
        benefit="sprinkle imagination over everyday moments",
        appeal="magical sparkle",
        extra_tags=("unicorn decor", "fantasy gift", "whimsical art"),
    ),
    ThemeProfile(
        keywords=frozenset({"mushroom", "gnome"}),
        style="fairy-garden vignette",
        feature="storybook mushrooms and woodland textures",
        placement="a plant shelf, terrarium, or whimsical reading nook",
        benefit="create a tiny world of wonder",
        appeal="enchanted forest charm",
        extra_tags=("mushroom decor", "gnome village", "fairy garden"),
    ),
)


DEFAULT_PROFILE = ThemeProfile(
    keywords=frozenset(),
    style="handcrafted decorative accent",
    feature="artful detailing and gentle finishes",
    placement="any cosy shelf, mantel, or gift basket",
    benefit="add a lovingly made finishing touch",
    appeal="heartwarming character",
    extra_tags=("handmade", "gift idea", "home decor"),
)


def main() -> None:
    repo_root = Path(__file__).resolve().parent
    image_dir = repo_root / "resources" / "images"
    output_file = repo_root / "product_descriptions.md"

    if not image_dir.exists():
        raise FileNotFoundError(f"Image directory not found: {image_dir}")

    image_paths = sorted(p for p in image_dir.iterdir() if p.suffix.lower() in IMAGE_EXTENSIONS)
    if not image_paths:
        logging.warning("No images found in %s", image_dir)

    logging.info("Generating descriptions for %d images", len(image_paths))

    entries = [create_entry(path) for path in image_paths]

    write_markdown(entries, output_file)
    logging.info("Wrote %s", output_file)


def create_entry(image_path: Path) -> dict[str, object]:
    """Create a description entry for a single image."""

    title = generate_title_from_filename(image_path.stem)
    logging.debug("Analysing %s", image_path.name)

    with Image.open(image_path) as img:
        img = img.convert("RGB")
        resized = img.copy()
        resized.thumbnail((300, 300))
        colours = extract_dominant_colours(resized)
        brightness, mood = describe_brightness(resized)
        orientation = describe_orientation(resized)

    keywords = extract_keywords(image_path.stem)
    profile = match_profile(keywords)

    description = compose_description(
        title=title,
        colours=colours,
        brightness=brightness,
        mood=mood,
        orientation=orientation,
        profile=profile,
    )

    tags = generate_tags(colours, keywords, profile)

    return {
        "title": title,
        "description": description,
        "tags": tags,
    }


def generate_title_from_filename(stem: str) -> str:
    """Convert a filename stem into a title-case product name."""

    words = [w for w in re.split(r"[^A-Za-z0-9]+", stem) if w]
    if not words:
        return "Handcrafted Art Piece"
    return " ".join(word.capitalize() for word in words)


def extract_keywords(stem: str) -> set[str]:
    """Return lowercase keywords derived from the filename."""

    tokens = re.split(r"[^A-Za-z0-9]+", stem.lower())
    return {token for token in tokens if token and not token.isdigit()}


def match_profile(keywords: set[str]) -> ThemeProfile:
    """Find the theme profile with the highest keyword overlap."""

    best_profile = DEFAULT_PROFILE
    best_score = 0
    for profile in THEME_PROFILES:
        score = len(profile.keywords & keywords)
        if score > best_score:
            best_score = score
            best_profile = profile
    return best_profile


def extract_dominant_colours(img: Image.Image, top_n: int = 4) -> list[str]:
    """Identify a list of dominant colour names within the image."""

    pixels = list(img.getdata())
    counter = Counter(pixels)
    most_common_pixels = counter.most_common(top_n * 8)
    colour_counts: Counter[str] = Counter()

    for rgb, count in most_common_pixels:
        name = nearest_colour_name(rgb)
        colour_counts[name] += count

    ordered_colours = [name for name, _ in colour_counts.most_common(top_n)]
    return ordered_colours


def nearest_colour_name(rgb: Sequence[int]) -> str:
    """Return the closest named colour using Euclidean distance in RGB space."""

    r, g, b = rgb
    best_name = "white"
    best_distance = float("inf")

    for name, (cr, cg, cb) in COLOUR_MAP.items():
        distance = math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2)
        if distance < best_distance:
            best_distance = distance
            best_name = name

    return best_name


def describe_brightness(img: Image.Image) -> tuple[str, str]:
    """Summarise the brightness of the image with tone and mood phrases."""

    pixels = list(img.getdata())
    luminances = [0.299 * r + 0.587 * g + 0.114 * b for r, g, b in pixels]
    average = sum(luminances) / len(luminances)

    if average >= 190:
        return "light and airy", "a sunlit sparkle"
    if average >= 150:
        return "soft and gentle", "a cozy glow"
    if average >= 110:
        return "warm and inviting", "a welcoming warmth"
    return "rich and dramatic", "a moody depth"


def describe_orientation(img: Image.Image) -> str:
    """Provide a friendly orientation phrase based on image dimensions."""

    width, height = img.size
    if height == 0:
        return "versatile layout"

    ratio = width / height
    if ratio > 1.25:
        return "wide landscape composition"
    if ratio < 0.8:
        return "tall portrait silhouette"
    return "balanced layout"


def compose_description(
    *,
    title: str,
    colours: Sequence[str],
    brightness: str,
    mood: str,
    orientation: str,
    profile: ThemeProfile,
) -> str:
    colour_phrase = format_colour_phrase(colours)

    first_sentence = (
        f"Infuse {profile.appeal} into your space with the {title}, a {brightness} "
        f"{profile.style} rendered in {colour_phrase} hues."
    )
    second_sentence = (
        f"{profile.feature.capitalize()} pair with its {orientation} to create {mood} "
        "that feels lovingly handmade."
    )
    third_sentence = (
        f"Display it on {profile.placement} to {profile.benefit}."
    )

    return " ".join([first_sentence, second_sentence, third_sentence])


def format_colour_phrase(colours: Sequence[str]) -> str:
    if not colours:
        return "soft neutral"
    unique = list(dict.fromkeys(colours))  # Preserve order while removing duplicates.
    if len(unique) == 1:
        return unique[0]
    if len(unique) == 2:
        return " and ".join(unique)
    return ", ".join(unique[:-1]) + f", and {unique[-1]}"


def generate_tags(colours: Iterable[str], keywords: set[str], profile: ThemeProfile) -> List[str]:
    """Build a sorted list of relevant keyword tags for Etsy listings."""

    tag_set = {"handmade", "etsy seller"}
    tag_set.update(colours)
    tag_set.update(profile.extra_tags)

    friendly_keywords = {kw for kw in keywords if len(kw) > 2}
    tag_set.update(friendly_keywords)

    return sorted(tag_set)


def write_markdown(entries: Sequence[dict[str, object]], output_file: Path) -> None:
    """Write the markdown output file with product sections."""

    lines = ["# Product Descriptions", ""]

    for entry in entries:
        title = entry["title"]
        description = entry["description"]
        tags = entry["tags"]

        lines.append(f"## {title}")
        lines.append("")
        lines.append(f"**Description:** {description}")
        lines.append("")
        lines.append("**Tags:** " + ", ".join(tags))
        lines.append("")

    output_file.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    main()

