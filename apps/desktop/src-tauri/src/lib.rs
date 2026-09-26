#[tauri::command]
fn greet(name: &str) -> String {
    format!("Olá, {}! Bem-vindo ao z-notes!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn greet_inclui_nome() {
        let result = greet("Mundo");
        assert!(result.contains("Mundo"));
        assert!(result.contains("z-notes"));
    }

    #[test]
    fn greet_vazio() {
        let result = greet("");
        assert!(result.contains("z-notes"));
    }

    #[test]
    fn greet_com_nome_especial() {
        let result = greet("João & Maria");
        assert!(result.contains("João & Maria"));
    }
}