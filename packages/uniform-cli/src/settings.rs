use crate::core::{path_to_unix, SystemPath};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs::create_dir_all;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::{error::Error, fs::File, io::Write};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Settings {
    pub active_project: String,
    pub projects: HashMap<String, String>,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            active_project: String::new(),
            projects: HashMap::new(),
        }
    }
}

impl Settings {
    pub fn get_active_project_path(&self) -> Result<SystemPath, Box<dyn Error>> {
        if self.active_project.is_empty() {
            return Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                "Active project is not set",
            )));
        }

        if let Some(path) = self.projects.get(&self.active_project) {
            return Ok(SystemPath::new(path));
        }

        return Err(Box::new(std::io::Error::new(
            std::io::ErrorKind::Other,
            format!(
                "Active project name {} not listed in 'projects'.",
                self.active_project
            ),
        )));
    }

    pub fn get_file_path() -> Result<PathBuf, Box<dyn Error>> {
        let settings_path = get_home_dir();

        match settings_path {
            None => {
                return Err(Box::new(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    "Can't find home directory",
                )))
            }
            Some(settings_path) => {
                let mut settings_path = settings_path.join("uniform-cli");
                create_dir_all(&settings_path).unwrap();

                settings_path = settings_path.join(".uniform.json");

                return Ok(settings_path);
            }
        }
    }

    // Creates a new Settings instance with default values.
    pub fn new() -> Settings {
        Settings::default()
    }

    pub fn save(&self) -> Result<(), Box<dyn Error>> {
        let path = Settings::get_file_path()?;

        let mut file = File::create(&path).unwrap();
        let str = serde_json::to_string(self)?;
        file.write_all(str.as_bytes())?;

        Ok(())
    }

    // Loads settings from file. If file does not exist, creates a default one.
    pub fn load_from_file() -> Result<Settings, Box<dyn Error>> {
        let path_buf = Settings::get_file_path()?;
        let path = path_to_unix(path_buf.display().to_string());

        if !path_buf.exists() {
            let mut file = File::create(&path).unwrap();
            let default_settings = Settings::new();
            let default_settings_str = serde_json::to_string(&default_settings)?;
            file.write_all(default_settings_str.as_bytes())?;

            return Ok(default_settings);
        } else {
            let content = std::fs::read_to_string(&path_buf)?;
            let parsed = Settings::parse(&content)?;

            return Ok(parsed);
        }
    }

    // Parses settings from a JSON string.
    pub fn parse(json_str: &str) -> Result<Settings, Box<dyn Error>> {
        let data = serde_json::from_str(json_str)?;

        Ok(data)
    }
}

fn get_home_dir() -> Option<PathBuf> {
    #[cfg(target_os = "windows")]
    {
        std::env::var_os("USERPROFILE").map(PathBuf::from)
    }

    #[cfg(target_os = "unix")]
    {
        std::env::var_os("HOME").map(PathBuf::from)
    }

    #[cfg(not(any(target_os = "windows", target_os = "unix")))]
    {
        std::env::var_os("HOME").map(PathBuf::from)
        // Some(PathBuf::from("./"))
    }
}
