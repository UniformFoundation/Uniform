use std::collections::HashMap;

use colored::Colorize;
use serde::{Deserialize, Serialize};

use crate::{
    component::Component,
    core::{Mode, ModeList},
    workspace::Workspace,
};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComponentConfig {
    pub alias: Option<String>,
    pub compose_file: Option<String>,
    pub dependencies: Option<HashMap<String, ModeList>>,
    pub exec_path: Option<String>,
    pub extends: Option<String>,
    pub hosted_in: Option<String>,
    pub hostname: Option<String>,

    #[serde(rename = "isTemplate")]
    pub is_template: Option<bool>,
    pub path: Option<String>,
    pub replace: Option<bool>,
    pub variables: Option<HashMap<String, String>>,
    pub repository: Option<String>,
    pub tags: Option<Vec<String>>,
    pub after_clone_hook: Option<String>,
}

pub fn merge_component_configs(cc: &ComponentConfig, cc2: &ComponentConfig) -> ComponentConfig {
    if cc2.replace.unwrap() {
        return cc2.clone();
    }

    let mut result = cc.clone();

    if result.dependencies.is_none() {
        result.dependencies = Some(HashMap::new());
    }

    if result.variables.is_none() {
        result.variables = Some(HashMap::new());
    }

    if cc2.path.is_some() {
        result.path = cc2.path.clone();
    }

    if cc2.compose_file.is_some() {
        result.compose_file = cc2.compose_file.clone();
    }

    if cc2.extends.is_some() {
        result.extends = cc2.extends.clone();
    }

    if cc2.hosted_in.is_some() {
        result.hosted_in = cc2.hosted_in.clone();
    }

    if cc2.exec_path.is_some() {
        result.exec_path = cc2.exec_path.clone();
    }

    if cc2.alias.is_some() {
        result.alias = cc2.alias.clone();
    }

    if cc2.repository.is_some() {
        result.repository = cc2.repository.clone();
    }

    if cc2.after_clone_hook.is_some() {
        result.after_clone_hook = cc2.after_clone_hook.clone();
    }

    if let Some(vars) = &cc2.variables {
        let mut result_variables = result.variables.as_mut().unwrap();

        for (k, v) in vars.iter() {
            result_variables.insert(k.clone(), v.clone());
        }
    }

    let mut tags = Vec::new();
    if let Some(cc_tags) = &result.tags {
        tags.extend(cc_tags.iter().cloned());
    }
    if let Some(cc2_tags) = &cc2.tags {
        tags.extend(cc2_tags.iter().cloned());
    }
    result.tags = Some(tags);

    if let Some(deps) = &cc2.dependencies {
        let mut result_deps = result.dependencies.as_mut().unwrap();

        if !deps.is_empty() {
            for (dep_svc, modes) in deps.iter() {
                if !result_deps.contains_key(dep_svc) {
                    result_deps.insert(dep_svc.clone(), Vec::new());
                }

                for mode in modes {
                    if !result_deps[dep_svc].contains(mode) {
                        result_deps.get_mut(dep_svc).unwrap().push(mode.clone());
                    }
                }
            }
        }
    }

    return result;
}

pub fn get_deps(cc: &ComponentConfig, mode: &Mode) -> Vec<String> {
    let mut result = Vec::new();

    if let Some(deps) = &cc.dependencies {
        for (key, modes) in deps.iter() {
            if modes.contains(mode) {
                result.push(key.clone());
            }
        }
    }

    result
}

pub fn resolve_deps(workspace: &Workspace, deps: &[String]) -> Vec<Component> {
    let mut components = Vec::new();

    for dep in deps {
        let comp = workspace
            .components
            .get(dep)
            .ok_or_else(|| format!("Could not find component \"{}\"", dep))
            .unwrap();

        // println!(
        //     "resolve_deps found comp = {}. its context is: {:#?}",
        //     comp.name.bright_red(),
        //     &comp.context
        // );

        components.push(comp.clone());

        if let Some(confdeps) = &comp.config.dependencies {
            if !confdeps.is_empty() {
                components.extend(resolve_deps(
                    workspace,
                    confdeps.keys().cloned().collect::<Vec<_>>().as_slice(),
                ));
            }
        }
    }

    return components;
}
