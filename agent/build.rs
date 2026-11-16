//! Renders the official logo (`public/images/logo-small.svg`) into the app icon: the exe's .ico (shown in
//! Explorer, the taskbar and shortcuts) and the RGBA pixels of the tray/window icon. Also embeds version info.

use std::path::{Path, PathBuf};

const LOGO: &str = "../public/images/logo-small.svg";
/// Sizes in the .ico file.
const ICO_SIZES: [u32; 7] = [16, 20, 24, 32, 48, 64, 256];
/// Size of the tray and window icon (`icon.rs`).
const TRAY_SIZE: u32 = 32;

fn main() {
    println!("cargo:rerun-if-changed={LOGO}");
    println!("cargo:rerun-if-env-changed=MUDRON_SERVER");

    let out = PathBuf::from(std::env::var("OUT_DIR").unwrap());
    let tree = load_logo();
    let ico = out.join("app.ico");
    let images: Vec<(u32, Vec<u8>)> = ICO_SIZES.iter().map(|&s| (s, render(&tree, s))).collect();
    std::fs::write(&ico, ico_file(&images)).unwrap();
    std::fs::write(out.join("tray.rgba"), render(&tree, TRAY_SIZE)).unwrap();

    write_resources(&out, &ico);
}

fn load_logo() -> resvg::usvg::Tree {
    let data = std::fs::read(LOGO).unwrap_or_else(|e| panic!("cannot read {LOGO}: {e}"));
    resvg::usvg::Tree::from_data(&data, &resvg::usvg::Options::default()).expect("valid logo SVG")
}

/// The logo fitted into a transparent `size`×`size` square, as straight (not premultiplied) RGBA.
fn render(tree: &resvg::usvg::Tree, size: u32) -> Vec<u8> {
    let logo = tree.size();
    // A little margin at larger sizes; small icons need every pixel.
    let margin = if size >= 48 { size as f32 * 0.04 } else { 0.0 };
    let room = size as f32 - 2.0 * margin;
    let scale = room / logo.width().max(logo.height());
    let (dx, dy) = (
        (size as f32 - logo.width() * scale) / 2.0,
        (size as f32 - logo.height() * scale) / 2.0,
    );
    let mut pixmap = resvg::tiny_skia::Pixmap::new(size, size).unwrap();
    let transform = resvg::tiny_skia::Transform::from_row(scale, 0.0, 0.0, scale, dx, dy);
    resvg::render(tree, transform, &mut pixmap.as_mut());
    pixmap.pixels().iter().flat_map(|p| {
        let c = p.demultiply();
        [c.red(), c.green(), c.blue(), c.alpha()]
    }).collect()
}

/// A Windows .ico file with one 32-bit BMP entry per image.
fn ico_file(images: &[(u32, Vec<u8>)]) -> Vec<u8> {
    let entries: Vec<Vec<u8>> = images.iter().map(|(size, rgba)| bmp_entry(*size, rgba)).collect();
    let mut out = Vec::new();
    out.extend_from_slice(&[0, 0, 1, 0]);
    out.extend_from_slice(&(images.len() as u16).to_le_bytes());
    let mut offset = 6 + 16 * images.len() as u32;
    for ((size, _), entry) in images.iter().zip(&entries) {
        let dim = if *size >= 256 { 0 } else { *size as u8 };
        out.extend_from_slice(&[dim, dim, 0, 0]);
        out.extend_from_slice(&1u16.to_le_bytes()); // planes
        out.extend_from_slice(&32u16.to_le_bytes()); // bits per pixel
        out.extend_from_slice(&(entry.len() as u32).to_le_bytes());
        out.extend_from_slice(&offset.to_le_bytes());
        offset += entry.len() as u32;
    }
    for entry in entries {
        out.extend_from_slice(&entry);
    }
    out
}

fn bmp_entry(size: u32, rgba: &[u8]) -> Vec<u8> {
    let mask_row = size.div_ceil(32) * 4;
    let mut out = Vec::new();
    out.extend_from_slice(&40u32.to_le_bytes());
    out.extend_from_slice(&size.to_le_bytes());
    out.extend_from_slice(&(size * 2).to_le_bytes()); // colour + mask height
    out.extend_from_slice(&1u16.to_le_bytes());
    out.extend_from_slice(&32u16.to_le_bytes());
    out.extend_from_slice(&[0; 24]);
    // Pixels bottom-up, BGRA.
    for y in (0..size).rev() {
        for x in 0..size {
            let i = ((y * size + x) * 4) as usize;
            out.extend_from_slice(&[rgba[i + 2], rgba[i + 1], rgba[i], rgba[i + 3]]);
        }
    }
    // AND mask unused for 32-bit icons (alpha wins), but must be present.
    out.extend(std::iter::repeat_n(0u8, (mask_row * size) as usize));
    out
}

fn write_resources(out: &Path, ico: &Path) {
    let version = std::env::var("CARGO_PKG_VERSION").unwrap();
    let mut parts: Vec<u16> = version.split('.').filter_map(|p| p.parse().ok()).collect();
    parts.resize(4, 0);
    let numeric = parts.iter().map(u16::to_string).collect::<Vec<_>>().join(",");

    let rc = format!(
        r#"1 ICON "{ico}"
1 VERSIONINFO
FILEVERSION {numeric}
PRODUCTVERSION {numeric}
BEGIN
  BLOCK "StringFileInfo"
  BEGIN
    BLOCK "040904B0"
    BEGIN
      VALUE "CompanyName", "Mudron"
      VALUE "FileDescription", "Mudron Agent"
      VALUE "FileVersion", "{version}"
      VALUE "ProductName", "Mudron Agent"
      VALUE "ProductVersion", "{version}"
      VALUE "OriginalFilename", "Mudron.exe"
    END
  END
  BLOCK "VarFileInfo"
  BEGIN
    VALUE "Translation", 0x409, 1200
  END
END
"#,
        // The resource compiler wants forward slashes or escaped backslashes.
        ico = ico.display().to_string().replace('\\', "/"),
    );
    let rc_path = out.join("app.rc");
    std::fs::write(&rc_path, rc).unwrap();
    embed_resource::compile(&rc_path, embed_resource::NONE).manifest_optional().unwrap();
}
