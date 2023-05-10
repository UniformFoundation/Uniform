use colored::Colorize;
use lazy_static::lazy_static;
use std::collections::HashMap;
use std::error::Error;
use std::fmt::{self, Display};
use std::io::{BufRead, BufReader};
use std::process::{Command, Stdio};
use std::str::FromStr;

use indexmap::IndexMap;
use regex;

#[derive(serde::Serialize, serde::Deserialize, Debug, Clone, PartialEq)]
#[serde(rename_all = "lowercase")]
pub enum Mode {
    Default,
    Hook,
}

pub const MODE_VALUES: [&str; 2] = ["default", "hook"];


pub fn path_to_unix<P: AsRef<str>>(path: P) -> String {
    path.as_ref().replace("\\", "/").to_string()
}

pub fn path_to_windows<P: AsRef<str>>(path: P) -> String {
    path.as_ref().replace("/", "\\").to_string()
}

impl FromStr for Mode {
    type Err = ();

    fn from_str(s: &str) -> Result<Self, Self::Err> {
        if s == "default" {
            return Ok(Mode::Default);
        }

        if s == "hook" {
            return Ok(Mode::Hook);
        }

        return Err(());
    }
}

impl Display for Mode {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match *self {
            Mode::Default => write!(f, "default"),
            Mode::Hook => write!(f, "hook"),
        }
    }
}

pub type ModeList = Vec<Mode>;

#[derive(Debug)]
pub struct ShellError {
    pub err_code: i32,
    pub trace: String,
}

impl fmt::Display for ShellError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "Shell error: {}, stack= {}", self.err_code, self.trace)
    }
}

impl Error for ShellError {}

#[derive(Debug, Clone)]
pub struct GlobalOptions {
    pub workspace_name: Option<String>,
    pub debug: bool,
    pub cmd: Option<Vec<String>>,
    pub force: bool,
    pub mode: Option<Mode>,
    pub working_dir: Option<String>,
    pub uid: Option<u32>,
    pub tag: Option<String>,
    pub dry_run: bool,
    pub no_tty: bool,
}

lazy_static! {
    static ref R: regex::Regex = regex::Regex::new(r"\$\{([A-Z0-9_]+(\:[^\}]+)?)\}").unwrap();
}

pub fn subst_vars(content: &str, variables: &IndexMap<String, String>) -> String {
    R.replace_all(content, |caps: &regex::Captures| {
        let result = caps.get(1).unwrap().as_str();
        let mut parts = result.split(':');
        let name = parts.next().unwrap();
        let mut value = parts.next().unwrap_or("").trim();

        if value.starts_with('$') {
            let var_name = &value[1..];
            value = variables.get(var_name).map_or("", |v| v.as_str()).trim();
        } else if value.starts_with('"') {
            value = value.trim_matches('"');
        } else if value.starts_with('\'') {
            value = value.trim_matches('\'');
        }

        let result = variables
            .get(name)
            .map_or(value.to_owned(), |v| v.to_owned());
        result
    })
    .to_string()
}

pub fn generate_hook_script(scripts: &[String], uniform_binary: &str) -> String {
    let mut result = vec![
        "#!/bin/bash".to_string(),
        "set -e".to_string(),
        "printf \"\\x1b[0;34m%s\\x1b[39;49;00m\\n\" \"Run hook in Uniform CLI\"".to_string(),
    ];

    for script in scripts {
        result.push(format!(
            "{} --mode=hook --no-tty {}",
            uniform_binary, script
        ));
    }

    result.join("\n")
}

pub fn wsl_path<P: AsRef<str>>(path: P) -> String {
    let str_path = path.as_ref().to_string();

    if str_path.contains(":\\") {
        let mut parts = str_path.split(":\\");
        let drive = parts.next().unwrap().to_lowercase();
        let rest = parts.next().unwrap();
        format!("/mnt/{}/{}", drive, rest.replace("\\", "/"))
    } else {
        str_path
    }
}

#[derive(Debug, Clone)]
pub struct SystemPath {
    pub original: String,
    pub normal: String,
    pub universal: String,
}

impl SystemPath {
    pub fn new<P: AsRef<str>>(str_like: P) -> SystemPath {
        let str = str_like.as_ref().to_string();
        let universal = wsl_path(&str);
        let normal = path_to_unix(&str);

        let result = SystemPath {
            normal,
            original: str,
            universal,
        };

        return result;
    }
}

#[cfg(target_family = "windows")]
const SHELL: &str = "cmd.exe";
#[cfg(target_family = "windows")]
const FLAG: &str = "/C";
#[cfg(target_family = "unix")]
const SHELL: &str = "sh";
#[cfg(target_family = "unix")]
const FLAG: &str = "-c";

#[cfg(target_family = "wasm")]
const SHELL: &str = "sh";
#[cfg(target_family = "wasm")]
const FLAG: &str = "-c";

#[cfg(target_family = "windows")]
const TRANSFORM_PATHS: bool = true;
#[cfg(target_family = "unix")]
const TRANSFORM_PATHS: bool = false;
#[cfg(target_family = "wasm")]
const TRANSFORM_PATHS: bool = false;

const PATH_KEYS: [&str; 5] = [
    "WORKSPACE_PATH",
    "TPL_PATH",
    "PACKAGES_ROOT",
    "HOME_PATH",
    "SVC_PATH",
];

// Fixes docker-env incompatibility with windows paths
pub fn env_transform_paths(env: &HashMap<String, String>) -> HashMap<String, String> {
    let mut result = HashMap::new();

    for (k, v) in env.iter() {
        if TRANSFORM_PATHS && PATH_KEYS.contains(&k.as_str()) {
            let path = SystemPath::new(path_to_windows(v.clone()));
            result.insert(k.clone(), path.universal);
        } else {
            result.insert(k.clone(), v.clone());
        }
    }

    return result;
}

pub fn exec_shell_to_string(
    cmd: &str,
    cwd: &str,
    env: &HashMap<String, String>,
) -> Result<String, Box<dyn Error>> {
    let mut command = Command::new(SHELL);
    command.arg(FLAG).arg(cmd).current_dir(cwd);
    command.envs(env_transform_paths(&env));

    let output = command.output().unwrap();
    let stdout = String::from_utf8(output.stdout)?;
    let stderr = String::from_utf8(output.stderr)?;

    if output.status.success() {
        Ok(stdout)
    } else {
        println!(
            "output.status.success() false! stdout={}, stderr={}",
            stdout, stderr
        );
        Err(Box::new(std::io::Error::new(
            std::io::ErrorKind::Other,
            stderr,
        )))
    }
}

pub fn exec_shell_interactive(
    cmd: &str,
    cwd: &str,
    env: &HashMap<String, String>,
) -> Result<(), std::io::Error> {
    let mut command = Command::new(SHELL);
    command.arg(FLAG).arg(cmd).current_dir(cwd);
    let new_env = env_transform_paths(&env);

    println!(
        "\n[{}]: {:?}\n",
        "Final substituted ENV for docker".bright_cyan(),
        &new_env
    );

    command.envs(new_env);

    let mut child = command
        .stdin(Stdio::inherit())
        .stdout(Stdio::inherit())
        .stderr(Stdio::inherit())
        .spawn()?;

    let status = child.wait()?;

    if !status.success() {
        println!(
            "output.status.success() false! stdout={:?}, stderr={:?}",
            &child.stdout, &child.stderr
        );

        return Err(std::io::Error::new(
            std::io::ErrorKind::Other,
            "Command failed",
        ));
    }

    Ok(())
}
