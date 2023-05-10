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
pub struct LsCommand {}

impl ExecuteTrait for LsCommand {
    fn execute(&self, global_options: &GlobalOptions) -> Result<Option<String>, Box<dyn Error>> {
        let mut settings = Settings::load_from_file()?;

        let mut table = Table::new();

        table.add_row(row!["Name", "Path"]);

        for (name, path) in &settings.projects {
            let is_active = name == &settings.active_project;

            table.add_row(row![
                if is_active {
                    format!("{}*", name)
                } else {
                    name.clone()
                },
                path
            ]);
        }

        table.printstd();

        Ok(None)
    }
}
