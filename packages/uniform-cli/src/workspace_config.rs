use crate::component_config::{merge_component_configs, ComponentConfig};
use crate::core::path_to_unix;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use serde_json::{from_str, Value};
use std::collections::HashMap;
use std::error::Error;
use std::fs::File;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct WorkspaceConfig {
    pub name: String,
    pub version: String,
    pub variables: IndexMap<String, String>,
    pub components: IndexMap<String, ComponentConfig>,
    // TODO: packages
}

impl WorkspaceConfig {
    pub fn merge(&mut self, other: &WorkspaceConfig) -> WorkspaceConfig {
        let mut result = self.clone();

        for (k, v) in &other.components {
            if !result.components.contains_key(k) {
                result.components.insert(k.clone(), v.clone());
            } else {
                let old = result.components.get(k).unwrap();

                result
                    .components
                    .insert(k.clone(), merge_component_configs(old, v));
            }
        }

        for (k, v) in &other.variables {
            result.variables.insert(k.clone(), v.clone());
        }

        return result;
    }
}

pub fn load_workspace_config(wsc_path: &str) -> Result<WorkspaceConfig, Box<dyn Error>> {
    let path = path_to_unix(wsc_path);
    let content = std::fs::read_to_string(path.clone());

    match content {
        Err(err) => {
            println!(
                "Failed to load workspace config at {}: {:#?}",
                path.clone(),
                err
            );

            return Err(Box::new(err));
        }
        Ok(val) => {
            let data = serde_json::from_str(&val);

            match data {
                Ok(res) => Ok(res),
                Err(err) => Err(Box::new(err)),
            }
        }
    }
}
