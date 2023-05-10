use std::{
    borrow::{Borrow, BorrowMut},
    collections::HashMap,
    env::join_paths,
    error::Error,
    path::Path,
};

use colored::Colorize;
use indexmap::IndexMap;

use crate::{
    component::Component,
    component_config::ComponentConfig,
    core::{subst_vars, GlobalOptions, SystemPath},
    workspace_config::{load_workspace_config, WorkspaceConfig},
};

#[derive(Debug, Clone)]
pub struct Workspace {
    pub aliases: HashMap<String, String>,
    pub components: IndexMap<String, Component>,
    pub cwd: String,
    pub config_path: SystemPath,
    pub context: IndexMap<String, String>,
    pub config: Option<WorkspaceConfig>,
}

impl Workspace {
    fn create_context(&mut self) -> IndexMap<String, String> {
        let mut ctx = IndexMap::new();

        ctx.insert(
            "WORKSPACE_PATH".to_string(),
            self.config_path.normal.clone(),
        );

        if let Some(config) = &self.config {
            ctx.insert("WORKSPACE_NAME".to_string(), config.name.clone());

            for (k, v) in config.variables.iter() {
                ctx.insert(k.clone(), subst_vars(v, &ctx));
            }
        }

        return ctx;
    }

    pub fn get_component_names(&mut self) -> Vec<String> {
        self.components.keys().cloned().collect()
    }

    pub fn get_executable_component_names(&self) -> Vec<String> {
        self.components
            .values()
            .filter(|e| !e.config.is_template.unwrap_or(false))
            .map(|e| e.name.to_owned())
            .collect()
    }

    pub fn load(&mut self) -> Result<(), Box<dyn Error>> {
        let path = Path::new(&self.config_path.normal).join("uniform.json");
        let wsc = load_workspace_config(path.to_str().unwrap());

        match wsc {
            Err(err) => Err(err),
            Ok(val) => {
                self.config = Some(val);
                Ok(())
            }
        }
    }

    pub fn init(&mut self, global_options: &GlobalOptions) -> Result<(), Box<dyn Error>> {
        self.context = self.create_context();

        if let Some(config) = &self.config {
            for (k, v) in &config.components {
                let component = Component {
                    name: k.clone(),
                    config: v.clone(),
                    template: None,
                    just_started: None,
                    context: Some(self.context.clone()),
                };

                self.components.insert(k.clone(), component);
            }
        }

        let mut new_components = self.components.clone();

        for (k, v) in self.components.iter() {
            if (global_options.debug) {
                println!("...workspace... init component {}", k.bright_green());
            }

            let result = v.init(self)?;
            new_components.insert(k.clone(), result);
        }

        self.components = new_components;

        Ok(())
    }

    /// finds Component that is not a template
    pub fn find_executable_component(&self, name: &str) -> Option<Box<&Component>> {
        let comp = self.components.get(name);

        if comp.is_none() {
            return None;
        }

        let component = comp.unwrap();

        if component.config.is_template.unwrap_or(false) {
            return None;
        }

        return Some(Box::new(component));
    }
}

pub fn create_workspace(ws_path: SystemPath, cwd: &str) -> Workspace {
    Workspace {
        aliases: HashMap::new(),
        components: IndexMap::new(),
        cwd: cwd.to_string(),
        config_path: ws_path,
        context: IndexMap::new(),
        config: None,
    }
}
