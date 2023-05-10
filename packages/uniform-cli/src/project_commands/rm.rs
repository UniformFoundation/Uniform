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
pub struct RmCommand {
    #[clap(required = true)]
    name: String,
}

impl ExecuteTrait for RmCommand {
    fn execute(&self, global_options: &GlobalOptions) -> Result<Option<String>, Box<dyn Error>> {
        let mut settings = Settings::load_from_file()?;

        if settings.projects.get(&self.name).is_none() {
            return Err(Box::new(std::io::Error::new(
                std::io::ErrorKind::Other,
                format!(
                    "Project with name {} does not exist in 'projects'",
                    &self.name
                ),
            )));
        }

        if settings.active_project == self.name {
            settings.active_project = String::new();
        }

        settings.projects.remove(&self.name);

        settings.save()?;

        println!("{}", "Saved!".on_green().white());

        Ok(None)
    }
}
