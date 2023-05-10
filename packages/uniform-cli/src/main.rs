#![allow(unused)]
#[macro_use]
extern crate prettytable;

mod args;
pub mod commands;
pub mod component;
pub mod component_config;
pub mod context;
pub mod core;
pub mod project_commands;
pub mod settings;
pub mod workspace;
pub mod workspace_config;

use args::AppArgs;
use clap::Parser;
use colored::Colorize;

use crate::{
    args::{parse_global_options, ExecuteTrait},
    settings::Settings,
};

fn main() {
    let cli = AppArgs::parse();

    let global_options = parse_global_options(&cli);

    if global_options.debug {
        println!("CLI is {:#?}", cli);
    }

    let result = cli.command.execute(&global_options);

    if let Err(err) = result {
        println!("{} {:#?}", "Error:".red(), err);
    }
}
