import os
from PIL import Image, ImageOps
from pathlib import Path

# 入力/出力フォルダ
INPUT_DIR = Path("./captures")
OUTPUT_DIR = Path("./captures_resized")

# 許可サイズ（iPhone + iPad）
VALID_SIZES = [
    (1320, 2868), (2868, 1320),
    (1290, 2796), (2796, 1290),
    (2064, 2752), (2752, 2064),
    (2048, 2732), (2732, 2048),
]

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

def fit_with_padding(img, target_size, fill_color=(255, 255, 255)):
    """アスペクト比を維持しつつ余白を追加してtarget_sizeに収める"""
    img.thumbnail(target_size, Image.LANCZOS)  # 縦横比維持で縮小
    new_img = Image.new("RGB", target_size, fill_color)
    paste_x = (target_size[0] - img.size[0]) // 2
    paste_y = (target_size[1] - img.size[1]) // 2
    new_img.paste(img, (paste_x, paste_y))
    return new_img

def process_images():
    for file in INPUT_DIR.iterdir():
        if not file.suffix.lower() in [".png", ".jpg", ".jpeg"]:
            continue

        with Image.open(file) as im_raw:
            img = ImageOps.exif_transpose(im_raw)
            w, h = img.size

            # すでに許可サイズならコピー
            if (w, h) in VALID_SIZES:
                print(f"✅ {file.name} は既に正しいサイズ {w}x{h}")
                img.save(OUTPUT_DIR / file.name)
                continue

            # 縦横比から「近い」ターゲットを決定
            target_size = min(
                VALID_SIZES,
                key=lambda s: abs((w/h) - (s[0]/s[1]))
            )

            print(f"🔧 {file.name}: {w}x{h} → {target_size[0]}x{target_size[1]} に変換")

            # アスペクト比を維持しつつ余白で合わせる
            fitted = fit_with_padding(img, target_size)
            fitted.save(OUTPUT_DIR / file.name)

    print(f"\n完了！出力は {OUTPUT_DIR.resolve()} に保存されました。")

if __name__ == "__main__":
    process_images()

