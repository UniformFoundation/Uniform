use std::path::{Path, PathBuf};

pub fn resolve_path(absolute_or_relative_path: &str, relative_to: &str) -> String {
    if Path::new(absolute_or_relative_path).is_absolute() {
        return absolute_or_relative_path.to_string();
    }

    let resolved_path = PathBuf::from(relative_to).join(absolute_or_relative_path);
    resolved_path.to_str().unwrap().replace("\\", "/")
}
