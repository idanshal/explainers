# Explainer: SSH, Keys, and GitHub

SSH (Secure Shell) is a protocol for securely connecting to another computer over a network. It encrypts the connection and can authenticate you with a password or, commonly for Git hosting, a public/private key pair. Git uses SSH as one way to authenticate when cloning, fetching, or pushing to a remote repository.

This guide uses GitHub as an example. The same SSH concepts apply to other services and servers.

## Public and Private Keys

An SSH key pair contains two related files:

- **Private key**: Kept on your computer. SSH uses it to prove that you own the matching public key. Do not share it, upload it, or paste it into a website or chat. A passphrase can protect it if the file is copied or stolen.
- **Public key**: Safe to give to the service you want to access. GitHub stores it on your account and checks that it matches the private key used during login. It commonly has a `.pub` extension.

The key pair identifies an account or user to a server; it is not the same as your Git commit name or email. You can use multiple key pairs, for example one for a personal GitHub account and another for work.

## `ssh-keygen`: Create a Key Pair

`ssh-keygen` creates SSH keys. Ed25519 is a good default for a new key when supported:

```sh
ssh-keygen -t ed25519 -C "you@example.com" -f ~/.ssh/id_ed25519_github
```

The `-C` value is a comment to help identify the key; it does not determine which account can use it. The `-f` value sets the output path. The command creates the private key at that path and the public key beside it with `.pub` appended. It prompts for a passphrase; setting one is recommended.

For example, the pair above is:

```text
~/.ssh/id_ed25519_github       private key
~/.ssh/id_ed25519_github.pub   public key
```

Add the **contents of the `.pub` file** to the appropriate GitHub account under its SSH key settings. Never add the private key there. On macOS, you can copy the public key with:

```sh
pbcopy < ~/.ssh/id_ed25519_github.pub
```

Older instructions may show `ssh-keygen -t rsa`. RSA keys can still be used, but for a new key Ed25519 is generally the simpler modern choice.

## `ssh-agent` and `ssh-add`

`ssh-agent` is a background process that can hold unlocked private keys for your login session. It lets SSH use a passphrase-protected key repeatedly without prompting for the passphrase on every connection. The key remains on disk; the agent holds access to it while it is loaded.

`ssh-add` manages keys held by the agent:

```sh
ssh-add ~/.ssh/id_ed25519_github  # load this key into the agent
ssh-add -l                         # list keys loaded in the agent
ssh-add -D                         # remove all keys from the agent
```

`ssh-add -D` is a broad reset: it removes every loaded identity, which can affect other SSH connections. Use it only when you intend to clear them. Loading a specific key with `ssh-add` does not, by itself, guarantee SSH will offer only that key; SSH configuration also matters.

## `~/.ssh/config`: Choose a Key and Host Alias

The SSH client reads per-user settings from `~/.ssh/config`. A `Host` block applies settings when you connect using the matching host name or alias. This is useful when one machine has multiple keys for the same service.

Example configuration for two GitHub accounts:

```sshconfig
Host github.com-personal
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_github_personal
    IdentitiesOnly yes

Host github.com-work
    HostName github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_github_work
    IdentitiesOnly yes
```

Here, `github.com-personal` and `github.com-work` are local aliases. Both connect to the real server `github.com` as the SSH user `git`, but each selects its own key. The alias does not need to be configured on GitHub.

`IdentityFile` names the key SSH should use. `IdentitiesOnly yes` tells SSH to use the configured identity rather than trying every other key that may be available through the agent. Without it, an agent with several loaded keys can offer a different key first. If that key belongs to another GitHub account, authentication may succeed as the wrong account.

Use the alias in the Git remote URL so the correct block applies:

```sh
git remote set-url origin git@github.com-work:OWNER/REPOSITORY.git
```

Check the current remote with `git remote -v`. The part after the colon is the repository path; the host alias before it selects the SSH configuration.

## `ssh -T`: Test Authentication

The `-T` option disables terminal allocation. GitHub's SSH test uses it to check authentication without opening an interactive shell:

```sh
ssh -T git@github.com-work
```

A successful GitHub authentication prints a greeting naming the account, such as `Hi USERNAME!`. GitHub does not provide a shell through this test, so a message saying shell access is unavailable is expected. Check the greeting: if it names the wrong account, SSH likely offered a key associated with that account.

The `git@` part is the SSH username GitHub expects; it is not your personal GitHub username. The configured alias selects the host settings and key.

## `~/.ssh/known_hosts`: Recognize the Server

The first time SSH connects to a server, it may ask whether you trust that server's host key. After you accept it, SSH records the server identity in `~/.ssh/known_hosts`. On future connections, SSH compares the presented host key with the saved one to help detect an unexpected server or interception.

This is separate from your account key:

- Your **private key** proves your identity to the server.
- The server's **host key**, recorded in `known_hosts`, helps your computer recognize the server.

If SSH warns that a known host's key has changed, do not blindly delete the entry or accept the new key. The cause might be a legitimate server change, but the warning can also indicate a connection security problem. Verify the new fingerprint with the service or server administrator first.

## Putting the Pieces Together

For a GitHub connection using an account-specific alias:

1. `ssh-keygen` creates a private key and its matching `.pub` public key.
2. You add the public key to the intended GitHub account.
3. Optionally, `ssh-add` loads the private key into the agent for convenient use.
4. `~/.ssh/config` maps a host alias to `github.com` and selects the key. `IdentitiesOnly yes` prevents unrelated agent keys from being tried instead.
5. `ssh -T` checks which GitHub account authenticates through that alias.
6. A Git remote using the alias applies the same settings when Git connects.
7. `known_hosts` records the GitHub server's host identity, not your GitHub account identity.

Useful checks:

```sh
ls -l ~/.ssh/id_ed25519_github_work ~/.ssh/id_ed25519_github_work.pub
ssh-add -l
ssh -T git@github.com-work
git remote -v
```

If the key files exist but the greeting names another account, check the matching `Host` block, its `IdentityFile` and `IdentitiesOnly` settings, and whether the Git remote uses the intended alias.

## References

- [OpenSSH `ssh` manual](https://man.openbsd.org/ssh)
- [OpenSSH `ssh_config` manual](https://man.openbsd.org/ssh_config)
- [OpenSSH `ssh-keygen` manual](https://man.openbsd.org/ssh-keygen)
- [OpenSSH `ssh-add` manual](https://man.openbsd.org/ssh-add)
- [GitHub: About SSH](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/about-ssh)
- [GitHub: Testing your SSH connection](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/testing-your-ssh-connection)
