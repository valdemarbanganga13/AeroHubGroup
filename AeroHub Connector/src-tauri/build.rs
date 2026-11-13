fn main() {
    // Passa o DISCORD_CLIENT_ID do ficheiro .env (fora do git) para o código, na compilação.
    // Também aceita a variável de ambiente com o mesmo nome (útil para builds automáticas).
    println!("cargo:rerun-if-changed=../.env");
    println!("cargo:rerun-if-env-changed=DISCORD_CLIENT_ID");

    let from_env = std::env::var("DISCORD_CLIENT_ID").ok();
    let from_file = std::fs::read_to_string("../.env").ok().and_then(|text| {
        text.lines().find_map(|line| {
            line.trim()
                .strip_prefix("DISCORD_CLIENT_ID=")
                .map(|value| value.trim().to_string())
        })
    });
    if let Some(client_id) = from_env.or(from_file).filter(|value| !value.is_empty()) {
        println!("cargo:rustc-env=DISCORD_CLIENT_ID={client_id}");
    }

    tauri_build::build()
}
