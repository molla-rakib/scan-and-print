//! The app icon, drawn in code so there are no image files to keep in sync: a blue rounded tile with a
//! white sheet of paper, plus an optional status dot. Also used by `build.rs` to make the exe's .ico.

/// Status dot colour in the bottom-right corner.
#[derive(Clone, Copy)]
pub enum Dot {
    None,
    Green,
    Red,
    Orange,
}

/// RGBA pixels of a `size`×`size` icon.
pub fn rgba(size: u32, dot: Dot) -> Vec<u8> {
    let blue = [44u8, 82, 214, 255];
    let white = [255u8, 255, 255, 255];
    let dot_color = match dot {
        Dot::None => None,
        Dot::Green => Some([34u8, 197, 94, 255]),
        Dot::Red => Some([239u8, 68, 68, 255]),
        Dot::Orange => Some([245u8, 158, 11, 255]),
    };
    // Designed on a 32-unit grid and sampled at pixel centres, so it scales to any size.
    let scale = 32.0 / size as f32;
    let mut out = Vec::with_capacity((size * size * 4) as usize);
    for py in 0..size {
        for px in 0..size {
            let x = (px as f32 + 0.5) * scale;
            let y = (py as f32 + 0.5) * scale;
            let dist = |cx: f32, cy: f32| ((x - cx).powi(2) + (y - cy).powi(2)).sqrt();

            // Rounded tile (radius 6).
            let (cx, cy) = (x.clamp(6.0, 26.0), y.clamp(6.0, 26.0));
            let in_tile = dist(cx, cy) <= 6.0;
            let paper = (9.0..23.0).contains(&x) && (6.0..26.0).contains(&y);
            let line = paper && (12.0..20.0).contains(&x) && [11.0, 15.0, 19.0].iter().any(|l| (y - (l + 0.5)).abs() < 1.0);
            let dot_d = dist(25.5, 25.5);

            let pixel = match dot_color {
                Some(c) if dot_d <= 6.0 => c,
                Some(_) if dot_d <= 8.0 => white,
                _ if !in_tile => [0, 0, 0, 0],
                _ if line => blue,
                _ if paper => white,
                _ => blue,
            };
            out.extend_from_slice(&pixel);
        }
    }
    out
}

/// A Windows .ico file containing the plain icon at the given sizes (32-bit BMP entries).
pub fn ico(sizes: &[u32]) -> Vec<u8> {
    let images: Vec<Vec<u8>> = sizes.iter().map(|&s| bmp_entry(s)).collect();
    let mut out = Vec::new();
    out.extend_from_slice(&[0, 0, 1, 0]);
    out.extend_from_slice(&(sizes.len() as u16).to_le_bytes());
    let mut offset = 6 + 16 * sizes.len() as u32;
    for (&size, image) in sizes.iter().zip(&images) {
        let dim = if size >= 256 { 0 } else { size as u8 };
        out.extend_from_slice(&[dim, dim, 0, 0]);
        out.extend_from_slice(&1u16.to_le_bytes()); // planes
        out.extend_from_slice(&32u16.to_le_bytes()); // bits per pixel
        out.extend_from_slice(&(image.len() as u32).to_le_bytes());
        out.extend_from_slice(&offset.to_le_bytes());
        offset += image.len() as u32;
    }
    for image in images {
        out.extend_from_slice(&image);
    }
    out
}

fn bmp_entry(size: u32) -> Vec<u8> {
    let rgba = rgba(size, Dot::None);
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
