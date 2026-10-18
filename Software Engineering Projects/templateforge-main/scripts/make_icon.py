from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "assets"
LAUNCHER = ROOT / "launcher" / "TemplateForgeLauncher"
PUBLIC.mkdir(parents=True, exist_ok=True)
LAUNCHER.mkdir(parents=True, exist_ok=True)


def draw_icon(size: int) -> Image.Image:
    scale = size / 256

    def xy(values):
        return tuple(int(v * scale) for v in values)

    image = Image.new("RGBA", (size, size), "white")
    draw = ImageDraw.Draw(image)
    stroke = max(3, int(7 * scale))

    draw.ellipse(xy((82, 26, 92, 36)), fill="#4EA0DC")
    draw.line(xy((87, 23, 87, 39)), fill="#4EA0DC", width=max(2, int(3 * scale)))
    draw.line(xy((79, 31, 95, 31)), fill="#4EA0DC", width=max(2, int(3 * scale)))
    draw.ellipse(xy((210, 62, 226, 78)), outline="#F6C400", width=max(2, int(5 * scale)))
    draw.ellipse(xy((8, 176, 18, 186)), outline="#FF6A2D", width=max(2, int(4 * scale)))

    draw.rounded_rectangle(xy((32, 31, 134, 182)), radius=int(42 * scale), fill="#55A5DE", outline="#050505", width=stroke)
    draw.polygon([xy((134, 39))[0:2], xy((176, 75))[0:2], xy((134, 182))[0:2]], fill="#F45B9C", outline="#050505")
    draw.line([xy((134, 39))[0:2], xy((176, 75))[0:2], xy((134, 182))[0:2]], fill="#050505", width=stroke, joint="curve")
    draw.pieslice(xy((118, 55, 228, 182)), 275, 95, fill="#FFD52E", outline="#050505", width=stroke)
    draw.pieslice(xy((118, 92, 256, 212)), 290, 92, fill="#FF6A2D", outline="#050505", width=stroke)
    draw.pieslice(xy((78, 150, 262, 236)), 330, 112, fill="#79C943", outline="#050505", width=stroke)
    draw.rounded_rectangle(xy((32, 178, 134, 224)), radius=int(18 * scale), fill="#FFF1D2", outline="#050505", width=stroke)
    draw.ellipse(xy((63, 181, 87, 205)), fill="#050505")

    draw.line(xy((50, 64, 50, 76)), fill="#F7FBFF", width=max(3, int(5 * scale)))
    draw.arc(xy((46, 48, 72, 74)), 180, 250, fill="#F7FBFF", width=max(3, int(5 * scale)))
    draw.line(xy((50, 133, 50, 152)), fill="#F7FBFF", width=max(3, int(5 * scale)))
    for y in (79, 95, 111):
        draw.ellipse(xy((129, y - 3, 135, y + 3)), fill="#050505")

    return image


png = draw_icon(256)
png.save(PUBLIC / "templateforge-icon.png")
png.save(
    LAUNCHER / "TemplateForge.ico",
    sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)],
)

print("Generated TemplateForge icon assets.")
