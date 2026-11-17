---
level: foundations
---

# Homebrew: A Practical Guide

Homebrew is a package manager for macOS and Linux. It installs and maintains command-line tools, programming libraries, and (on macOS) many desktop applications from the terminal.

## Install Homebrew

Follow the current installation instructions at [brew.sh](https://brew.sh/). The installer explains any setup needed for your shell. When it finishes, check that the `brew` command is available:

```sh
brew --version
```

## Formulae and Casks

Homebrew packages are described by package definitions:

- A **formula** installs command-line software or libraries, such as `jq`, `git`, or `node`.
- A **cask** installs a prebuilt application, such as Firefox or Visual Studio Code. Casks are commonly used for macOS desktop apps.

The distinction tells Homebrew what kind of software it is installing. You can install both from the same command-line tool.

## Find and Install Software

Search by name, then inspect a package before installing it:

```sh
brew search jq
brew info jq
brew install jq
```

For a desktop application, specify `--cask`:

```sh
brew install --cask firefox
```

Homebrew installs required dependencies for formulae. Use `brew info` to see package details, including dependencies and installation notes.

## Keep Packages Updated

Updating package definitions and upgrading installed software are separate steps:

```sh
brew update
brew outdated
brew upgrade
```

`brew update` updates Homebrew and its local package information. `brew outdated` shows installed packages with newer versions available. `brew upgrade` upgrades outdated formulae and casks; pass a package name to upgrade just that package:

```sh
brew upgrade jq
```

## List and Remove Packages

See installed formulae and casks separately:

```sh
brew list --formula
brew list --cask
```

Uninstall a package by name. Add `--cask` when removing a desktop application:

```sh
brew uninstall jq
brew uninstall --cask firefox
```

Homebrew may keep older versions and cached downloads for cleanup. `brew cleanup` removes files that are no longer needed; check `brew cleanup --help` for options before using it if you want to keep older versions around.

## A Typical Workflow

For example, to install and maintain `jq`:

```sh
brew search jq
brew info jq
brew install jq
brew update
brew outdated
brew upgrade jq
```

The same pattern works for many development tools. Use `brew info <name>` to check the package type and any special setup before installing or upgrading it.