use clap::{Args, Parser, Subcommand};
use colored::Colorize;
use std::{error::Error, path::PathBuf};

use crate::{
    args::{CliError, ExecuteTrait},
    core::{path_to_unix, wsl_path, GlobalOptions, SystemPath},
    workspace::create_workspace, settings::Settings,
};

#[derive(Debug, Args)]
pub struct ExecCommand {
    #[clap(required = true)]
    service: String,

    #[clap(value_delimiter = ' ', num_args = 1.., required = true)]
    command: Vec<String>,
}

impl ExecuteTrait for ExecCommand {
    fn execute(&self, global_options: &GlobalOptions) -> Result<Option<String>, Box<dyn Error>> {
        let settings = Settings::load_from_file()?;

        let cwd = std::env::current_dir()?.display().to_string();
        let path = settings.get_active_project_path()?;

        let mut ws = create_workspace(path, &cwd);

        let ws_load = ws.load();

        if (ws_load.is_err()) {
            return Err(ws_load.unwrap_err());
        }

        ws.init(&global_options);

        let comp = ws.components.get(&self.service);

        match comp {
            None => {
                return Err(Box::new(CliError::new(format!(
                    "Unknown service '{:?}'. Possible services are: {:?}",
                    &self.service,
                    ws.get_executable_component_names()
                ))));
            }
            Some(component) => {
                if component.config.is_template.unwrap_or(false) {
                    return Err(Box::new(std::io::Error::new(
                        std::io::ErrorKind::Other,
                        format!(
                            "You can't execute on a service template, please use instances: {}",
                            ws.get_executable_component_names().join(",")
                        ),
                    )));
                }

                println!(
                    "Found component {}, executing on it...",
                    &self.service.bright_green()
                );
                let result = component.start(&ws, &global_options);

                match result {
                    Err(err) => {
                        println!("{} {}", "Failed to execute on component:".bright_red(), err)
                    }
                    Ok(t) => {
                        if let Some(out) = t {
                            println!("{}", out.green());
                        }
                    }
                }
            }
        }

        Ok(None)
    }
}
