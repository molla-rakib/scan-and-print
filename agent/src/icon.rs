//! The app icon: the official logo (`public/images/logo-small.svg`), rendered by `build.rs`, plus an
//! optional status dot on the tray icon.

/// Status dot colour in the bottom-right corner.
#[derive(Clone, Copy)]
pub enum Dot {
    None,
    Green,
    Red,
    Orange,
}

/// Side of the icon [`rgba`] returns.
pub const SIZE: u32 = 32;

/// The exe's .ico file (several sizes), for shortcuts.
pub const ICO: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/app.ico"));

const LOGO_RGBA: &[u8] = include_bytes!(concat!(env!("OUT_DIR"), "/tray.rgba"));

/// RGBA pixels of the [`SIZE`]×[`SIZE`] icon with a status dot.
pub fn rgba(dot: Dot) -> Vec<u8> {
    let white = [255u8, 255, 255, 255];
    let dot_color = match dot {
        Dot::None => return LOGO_RGBA.to_vec(),
        Dot::Green => [34u8, 197, 94, 255],
        Dot::Red => [239u8, 68, 68, 255],
        Dot::Orange => [245u8, 158, 11, 255],
    };
    let mut out = LOGO_RGBA.to_vec();
    // Designed on a 32-unit grid and sampled at pixel centres.
    let scale = 32.0 / SIZE as f32;
    for py in 0..SIZE {
        for px in 0..SIZE {
            let x = (px as f32 + 0.5) * scale;
            let y = (py as f32 + 0.5) * scale;
            let d = ((x - 25.5).powi(2) + (y - 25.5).powi(2)).sqrt();
            let pixel = if d <= 6.0 {
                dot_color
            } else if d <= 8.0 {
                white
            } else {
                continue;
            };
            let i = ((py * SIZE + px) * 4) as usize;
            out[i..i + 4].copy_from_slice(&pixel);
        }
    }
    out
}
