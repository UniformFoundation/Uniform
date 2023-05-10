use crate::component_config::{get_deps, resolve_deps, ComponentConfig};
use crate::core::{
    exec_shell_interactive, exec_shell_to_string, subst_vars, GlobalOptions, Mode, ShellError,
};
use crate::workspace::{self, Workspace};
use atty;
use colored::Colorize;
use indexmap::IndexMap;
use std::collections::HashMap;
use std::error::Error;
use std::io::{self, Write};
use std::path::PathBuf;
use std::process::Stdio;
use std::process::{Command, ExitStatus};

#[derive(Debug, Clone)]
pub struct Component {
    pub name: String,
    pub config: ComponentConfig,
    pub template: Option<ComponentConfig>,
    pub just_started: Option<bool>,
    pub context: Option<IndexMap<String, String>>,
}

pub type ErrCode = i32;

impl Component {
    pub fn get_container_id(
        &self,
        workspace: &Workspace,
        options: &GlobalOptions,
    ) -> Result<String, Box<dyn Error + 'static>> {
        let out = self.exec_compose(
            workspace,
            &[
                "ps".to_string(),
                "--status=running".to_string(),
                "-q".to_string(),
            ],
            options,
            false,
        )?;

        return Ok(out);
    }

    pub fn is_running(
        &self,
        workspace: &Workspace,
        options: &GlobalOptions,
    ) -> Result<bool, Box<dyn Error>> {
        let out = self.get_container_id(workspace, options)?;

        Ok(!out.is_empty())
    }

    pub fn init(&self, workspace: &Workspace) -> Result<Component, Box<dyn Error>> {
        let mut result = self.clone();

        let mut ctx = workspace.context.clone();

        ctx.insert("APP_NAME".to_string(), self.name.clone());
        ctx.insert(
            "COMPOSE_PROJECT_NAME".to_string(),
            format!("{}-{}", workspace.config.as_ref().unwrap().name, self.name),
        );
        ctx.insert(
            "COMPOSE_PROJECT_NAME".to_string(),
            format!("{}-{}", workspace.config.as_ref().unwrap().name, self.name),
        );

        let svc_path = subst_vars(&self.config.path.as_ref().unwrap().clone(), &ctx);
        ctx.insert("SVC_PATH".to_string(), svc_path);

        if let Some(extends) = &self.config.extends {
            let mut template = workspace
                .config
                .as_ref()
                .unwrap()
                .components
                .get(extends)
                .ok_or_else(|| {
                    format!(
                        "Error extending component {} from {}: {} is not defined. Known components: {}",
                        self.name,
                        extends,
                        extends,
                        workspace
                            .config
                            .as_ref()
                            .unwrap()
                            .components
                            .keys()
                            .map(|k| k.to_string())
                            .collect::<Vec<_>>()
                            .join(", ")
                    )
                })?
                .clone();

            if let Some(template_path) = &template.path {
                let template_path = subst_vars(&template_path, &ctx);
                ctx.insert("TPL_PATH".to_string(), template_path);
            } else {
                panic!("template.path is not defined somehow.");
            }

            if template.compose_file.is_none() {
                template.compose_file = Some("${TPL_PATH}/docker-compose.yml".to_string());
            }

            let compose_path = template.compose_file.as_ref().unwrap();
            let compose_file = subst_vars(&compose_path, &ctx);
            ctx.insert("COMPOSE_FILE".to_string(), compose_file);

            if let Some(vars) = &template.variables {
                for (key, v) in vars.iter() {
                    let value = subst_vars(v, &ctx);
                    ctx.insert(key.clone(), value);
                }
            }

            result.template = Some(template);
        }

        if let Some(compose_file) = &self.config.compose_file {
            let compose_file = subst_vars(compose_file, &ctx);
            ctx.insert("COMPOSE_FILE".to_string(), compose_file);
        }

        if self.config.compose_file.is_none() && !ctx.contains_key("COMPOSE_FILE") {
            let compose_file = subst_vars("${SVC_PATH}/docker-compose.yml", &ctx);
            ctx.insert("COMPOSE_FILE".to_string(), compose_file);
        }

        if let Some(conf_vars) = &self.config.variables {
            for (key, v) in conf_vars.iter() {
                let value = subst_vars(v, &ctx);
                ctx.insert(key.clone(), value);
            }
        }

        result.context = Some(ctx);

        // println!(
        //     "initializing component {}. ctx= {:?}",
        //     self.name.bright_purple(),
        //     self.context
        // );

        Ok(result)
    }

    pub fn exec_compose(
        &self,
        workspace: &Workspace,
        compose_command: &[String],
        options: &GlobalOptions,
        interactive: bool,
    ) -> Result<String, Box<dyn Error>> {
        // println!(
        //     "[exec_compose] name={} context={:#?}",
        //     self.name, self.context
        // );

        let compose_file = self.context.as_ref().unwrap().get("COMPOSE_FILE").unwrap();

        let mut command = vec![
            "docker".to_string(),
            "compose".to_string(),
            "-f".to_string(),
            compose_file.clone(),
        ];
        command.extend_from_slice(compose_command);

        let command_str = command.join(" ");

        if options.debug {
            println!(
                ">> {}{}",
                if interactive { "(interactive)" } else { "" },
                command_str
            );
        }

        if options.dry_run {
            return Ok("".to_string());
        }

        let mut env = HashMap::new();

        for (k, v) in self.context.as_ref().unwrap().iter() {
            env.insert(k.clone(), v.clone());
        }

        if options.debug {
            println!(">> ENV: {:?}", env);
        }

        if interactive {
            let result = exec_shell_interactive(&command_str, &workspace.cwd, &env);

            match result {
                Err(err) => return Err(Box::new(err)),
                Ok(result) => return Ok("".to_string()),
            };
        }

        let result = exec_shell_to_string(&command_str, &workspace.cwd, &env);

        match result {
            Err(err) => return Err(err),
            Ok(result) => return Ok(result),
        };
    }

    pub fn start(
        &self,
        workspace: &Workspace,
        options: &GlobalOptions,
    ) -> Result<Option<String>, Box<dyn Error>> {
        let running = self.is_running(workspace, options)?;

        if !running || options.force {
            let deps = get_deps(
                &self.config,
                options.mode.as_ref().unwrap_or(&Mode::Default),
            );
            let comps: Vec<Component> = resolve_deps(&workspace, &deps);

            println!(
                "deps: {}",
                comps
                    .iter()
                    .map(|e| e.name.clone())
                    .collect::<Vec<_>>()
                    .join(", ")
            );

            for mut comp in comps {
                let running = self.is_running(workspace, options)?;

                if !running || options.force {
                    comp.exec_compose(
                        workspace,
                        &["up".to_string(), "-d".to_string()],
                        options,
                        true,
                    )?;
                }
            }
        }

        if running {
            return Ok(Some(format!(
                "🚀 Component \"{}\" is already running",
                self.name
            )));
        }

        let result = self.exec_compose(
            workspace,
            &["up".to_string(), "-d".to_string()],
            options,
            true,
        )?;

        return Ok(Some(result));
    }

    pub fn stop(
        &self,
        workspace: &Workspace,
        options: &GlobalOptions,
    ) -> Result<Option<String>, Box<dyn Error>> {
        let running = self.is_running(workspace, options)?;

        if !running {
            return Ok(Some(format!(
                "📴 Component \"{}\" is already stopped",
                self.name
            )));
        }

        let result = self.exec_compose(workspace, &["stop".to_string()], options, true)?;

        Ok(Some(result))
    }

    pub fn exec(
        &self,
        workspace: &Workspace,
        command: &[String],
        options: &GlobalOptions,
        interactive: bool,
    ) -> Result<String, Box<dyn Error>> {
        let command_str = command.join(" ");

        if options.debug {
            println!(">> {}", command_str);
        }

        if options.dry_run {
            return Ok("".to_string());
        }

        let mut env = HashMap::new();

        for (k, v) in self.context.as_ref().unwrap().iter() {
            env.insert(k.clone(), v.clone());
        }

        if interactive {
            exec_shell_interactive(&command_str, &workspace.cwd, &env)?;
            return Ok("".to_string());
        }

        exec_shell_to_string(&command_str, &workspace.cwd, &env)
    }

    pub fn destroy(
        &mut self,
        workspace: &Workspace,
        options: &GlobalOptions,
    ) -> Result<(), Box<dyn Error>> {
        let running = self.is_running(workspace, options)?;

        if !running {
            return Ok(());
        }

        self.exec_compose(workspace, &["down".to_string()], options, true)?;

        Ok(())
    }

    pub fn restart(
        &mut self,
        workspace: &mut Workspace,
        hard: bool,
        options: &GlobalOptions,
    ) -> Result<Option<String>, Box<dyn Error>> {
        if hard {
            self.destroy(workspace, options)?
        } else {
            self.stop(workspace, options)?;
        }

        self.start(workspace, options)
    }

    pub fn compose(
        &mut self,
        workspace: &Workspace,
        options: &GlobalOptions,
    ) -> Result<(), Box<dyn Error>> {
        self.exec_compose(
            workspace,
            &options.cmd.as_ref().unwrap().clone(),
            options,
            true,
        )?;

        Ok(())
    }

    pub fn exec_custom_command(
        &mut self,
        workspace: &mut Workspace,
        options: &GlobalOptions,
    ) -> Result<(), Box<dyn Error>> {
        self.start(workspace, options)?;

        let mut command = vec!["exec".to_string()];

        if let Some(working_dir) = &options.working_dir {
            command.push("-w".to_string());
            command.push(working_dir.clone());
        }

        if let Some(uid) = options.uid {
            command.push("-u".to_string());
            command.push(uid.to_string());
        } else {
            let user_id = self
                .context
                .as_ref()
                .unwrap()
                .get("USER_ID")
                .ok_or_else(|| "variable \"USER_ID\" is not set".to_string())?;
            let group_id = self
                .context
                .as_ref()
                .unwrap()
                .get("GROUP_ID")
                .ok_or_else(|| "variable \"GROUP_ID\" is not set".to_string())?;

            command.push("-u".to_string());
            command.push(format!("{}:{}", user_id, group_id));
        }

        if options.no_tty || !atty::is(atty::Stream::Stdout) {
            command.push("-T".to_string());
        }

        command.push("app".to_string());
        command.extend_from_slice(options.cmd.as_ref().unwrap().as_slice());

        self.exec_compose(workspace, &command, options, true)?;

        Ok(())
    }
}
