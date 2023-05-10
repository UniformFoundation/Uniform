use clap::{Args, Parser, Subcommand};
use colored::Colorize;
use std::{error::Error, path::PathBuf};

use crate::{
    args::{CliError, ExecuteTrait},
    core::{path_to_unix, wsl_path, GlobalOptions, SystemPath},
    settings::Settings,
    workspace::create_workspace,
};

#[derive(Debug, Args)]
pub struct StopCommand {
    #[clap(value_delimiter = ' ', num_args = 1.., required = true)]
    services: Vec<String>,
}

impl ExecuteTrait for StopCommand {
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

        for comp_name in &self.services {
            let comp = ws.components.get(comp_name);

            match comp {
                None => {
                    return Err(Box::new(CliError::new(format!(
                        "Unknown service '{:?}'. Possible services are: {:?}",
                        comp_name,
                        ws.get_executable_component_names()
                    ))));
                }
                Some(component) => {
                    if component.config.is_template.unwrap_or(false) {
                        return Err(Box::new(std::io::Error::new(
                            std::io::ErrorKind::Other,
                            format!(
                                "You can't stop a service template, please use instances: {}",
                                ws.get_executable_component_names().join(",")
                            ),
                        )));
                    }

                    println!(
                        "Found component {}, {:?}, stopping it...",
                        comp_name.green(),
                        component.config.is_template
                    );
                    let result = component.stop(&ws, &global_options);

                    match result {
                        Err(err) => {
                            println!("{} {}", "Failed to stop component:".bright_red(), err)
                        }
                        Ok(t) => {
                            if let Some(out) = t {
                                println!("{}", out.green());
                            }
                        }
                    }
                }
            }
        }

        Ok(None)
    }
}
