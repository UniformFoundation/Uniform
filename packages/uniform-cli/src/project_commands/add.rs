use clap::{Args, Parser, Subcommand};
use colored::Colorize;
use std::{
    error::Error,
    path::{Path, PathBuf},
};

use prettytable::{
    format::{self, TableFormat},
    Cell, Row, Table,
};

use crate::{
    args::{CliError, ExecuteTrait},
    core::{exec_shell_to_string, GlobalOptions, SystemPath},
    settings::Settings,
    workspace::create_workspace,
};

use tokio::runtime::Runtime;

#[derive(Debug, Args)]
pub struct AddCommand {
    #[clap(required = true)]
    name: String,

    #[clap(required = true)]
    path: String,
}

impl ExecuteTrait for AddCommand {
    fn execute(&self, global_options: &GlobalOptions) -> Result<Option<String>, Box<dyn Error>> {
        let mut settings = Settings::load_from_file()?;

        let path = Path::new(&self.path);

        if !path.exists() {
            return Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!("Path {} does not exist", self.path),
            )));
        }

        if let Some(old_path) = settings.projects.get(&self.name) {
            if !global_options.force {
                return Err(Box::new(std::io::Error::new(
                    std::io::ErrorKind::Other,
                    format!("Project with name {} is already defined at {}. If you want to override it, run this command again with -f or --force flag.", &self.name, old_path),
                )));
            }
        }

        settings
            .projects
            .insert(self.name.clone(), self.path.clone());

        if settings.active_project.is_empty() {
            settings.active_project = self.name.clone();
        }

        settings.save()?;

        println!("{}", "Saved!".on_green().white());

        Ok(None)
    }
}
