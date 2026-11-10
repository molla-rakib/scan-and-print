//! Embeds the app icon and version info into the exe (shown in Explorer, the taskbar and installers).

#[path = "src/icon.rs"]
#[allow(dead_code)]
mod icon;

fn main() {
    println!("cargo:rerun-if-changed=src/icon.rs");
    println!("cargo:rerun-if-env-changed=SCAN_PRINT_SERVER");

    let out = std::path::PathBuf::from(std::env::var("OUT_DIR").unwrap());
    let ico = out.join("app.ico");
    std::fs::write(&ico, icon::ico(&[16, 24, 32, 48, 64, 256])).unwrap();

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
      VALUE "OriginalFilename", "ScanAndPrintAgent.exe"
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
