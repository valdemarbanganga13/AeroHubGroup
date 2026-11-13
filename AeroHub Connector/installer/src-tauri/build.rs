// O setup.exe leva lá dentro o instalador do app (gerado antes pelo `tauri build` do app).
// O GitHub Actions passa o caminho em AEROHUB_APP_INSTALLER e o tamanho do app instalado
// em AEROHUB_APP_SIZE. Sem eles (ex.: `npm run setup:dev`), o setup só simula a instalação.

use std::{env, fs, path::PathBuf};

fn main() {
    println!("cargo:rerun-if-env-changed=AEROHUB_APP_INSTALLER");
    println!("cargo:rerun-if-env-changed=AEROHUB_APP_SIZE");

    let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
    let payload = match env::var("AEROHUB_APP_INSTALLER") {
        Ok(path) if !path.is_empty() => {
            println!("cargo:rerun-if-changed={path}");
            PathBuf::from(path)
        }
        _ => {
            // Pacote vazio: modo de demonstração
            let empty = out_dir.join("empty-app-installer.bin");
            fs::write(&empty, []).unwrap();
            empty
        }
    };
    println!("cargo:rustc-env=AEROHUB_APP_INSTALLER_PATH={}", payload.display());

    tauri_build::build()
}
