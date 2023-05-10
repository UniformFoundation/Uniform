use clap::{Args, Parser, Subcommand};
use colored::Colorize;
use std::{error::Error, path::PathBuf};

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
pub struct PsCommand {}

impl ExecuteTrait for PsCommand {
    fn execute(&self, global_options: &GlobalOptions) -> Result<Option<String>, Box<dyn Error>> {
        let settings = Settings::load_from_file()?;

        let cwd = std::env::current_dir()?.display().to_string();
        let path = settings.get_active_project_path()?;

        let mut ws = create_workspace(path, &cwd);

        let ws_load = ws.load()?;
        ws.init(&global_options)?;

        let mut table = Table::new();

        table.add_row(row!["Name", "Status", "Container ID"]);
        table.set_format(*format::consts::FORMAT_NO_LINESEP_WITH_TITLE);

        let mut rt = Runtime::new()?;

        let tasks = ws.components.iter().map(|(k, v)| {
            let ws = ws.clone();
            let global_options = global_options.clone();
            async move {
                let comp = ws.find_executable_component(k);

                match comp {
                    Some(component) => {
                        let id = component.get_container_id(&ws, &global_options);

                        match id {
                            Ok(id) => {
                                let status = if id.is_empty() { "Exited" } else { "Running" };
                                let short_id = if id.is_empty() { "" } else { &id[..12] };

                                Ok::<Row, Box<dyn Error + Send + Sync>>(row![k, status, short_id])
                            }
                            Err(_) => Ok(row![]),
                        }
                    }
                    None => Ok(row![]),
                }
            }
        });

        let results = rt.block_on(async { futures::future::join_all(tasks).await });

        for result in results {
            match result {
                Ok(row) => {
                    if !row.is_empty() {
                        table.add_row(row);
                    }
                }
                Err(e) => {
                    println!("Error: {:?}", e)
                }
            }
        }

        table.printstd();

        Ok(None)
    }
}
