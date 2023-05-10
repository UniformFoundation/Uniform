use colored::Colorize;
use std::{error::Error, fmt, str::FromStr};

use clap::{builder::PossibleValuesParser, Args, Parser, Subcommand};

use crate::{
    commands::{exec::ExecCommand, ps::PsCommand, start::StartCommand, stop::StopCommand},
    core::{GlobalOptions, Mode, MODE_VALUES},
    project_commands::{add::AddCommand, r#use::UseCommand, ls::LsCommand, rm::RmCommand},
};

pub trait ExecuteTrait {
    fn execute(&self, global_options: &GlobalOptions) -> Result<Option<String>, Box<dyn Error>>;
}

#[derive(Debug, Parser)]
#[clap(author, version, about, arg_required_else_help = true)]
pub struct AppArgs {
    #[arg(short, long)]
    pub name: Option<String>,

    #[arg(short, long)]
    pub debug: bool,

    #[arg(short, long)]
    pub force: bool,

    #[arg(short, long, value_parser = PossibleValuesParser::new(MODE_VALUES))]
    pub mode: Option<String>,

    #[arg(short, long)]
    pub uid: Option<u32>,

    #[arg(short, long)]
    pub tag: Option<String>,

    #[arg(long)]
    pub dry_run: bool,

    #[arg(long)]
    pub no_tty: bool,

    #[clap(subcommand)]
    pub command: CommandType,
}

#[derive(Debug, Subcommand)]
pub enum ProjectCommandType {
    Add(AddCommand),
    Use(UseCommand),
    Ls(LsCommand),
    Rm(RmCommand),
}

#[derive(Debug, Args)]
pub struct ProjectCommand {
    #[clap(subcommand)]
    command: ProjectCommandType,
}

#[derive(Debug, Subcommand)]
pub enum CommandType {
    Start(StartCommand),
    Stop(StopCommand),
    Exec(ExecCommand),
    Ps(PsCommand),
    Project(ProjectCommand),
}

impl CommandType {
    pub fn execute(
        &self,
        global_options: &GlobalOptions,
    ) -> Result<Option<String>, Box<dyn Error>> {
        let cmd: &dyn ExecuteTrait = match self {
            CommandType::Start(cmd) => cmd,
            CommandType::Stop(cmd) => cmd,
            CommandType::Exec(cmd) => cmd,
            CommandType::Ps(cmd) => cmd,
            CommandType::Project(cmd) => match &cmd.command {
                ProjectCommandType::Add(project_cmd) => project_cmd,
                ProjectCommandType::Use(project_cmd) => project_cmd,
                ProjectCommandType::Ls(project_cmd) => project_cmd,
                ProjectCommandType::Rm(project_cmd) => project_cmd,
            },
        };

        cmd.execute(global_options)
    }
}

pub fn parse_global_options(args: &AppArgs) -> GlobalOptions {
    GlobalOptions {
        workspace_name: args.name.clone(),
        debug: args.debug,
        cmd: None,
        force: args.force,
        mode: match Mode::from_str(&args.mode.clone().unwrap_or("".to_string())) {
            Err(()) => None,
            Ok(val) => Some(val),
        },
        working_dir: None,
        uid: args.uid,
        tag: args.tag.clone(),
        dry_run: args.dry_run,
        no_tty: args.no_tty,
    }
}

#[derive(Debug)]
pub struct CliError {
    description: String,
}

impl CliError {
    pub fn new<P: AsRef<str>>(description: P) -> CliError {
        CliError {
            description: description.as_ref().to_string(),
        }
    }
}

impl fmt::Display for CliError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.description)
    }
}

impl Error for CliError {
    fn description(&self) -> &str {
        &self.description
    }

    fn source(&self) -> Option<&(dyn Error + 'static)> {
        None
    }
}
