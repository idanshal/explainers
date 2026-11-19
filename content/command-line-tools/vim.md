---
level: foundations
technologies:
  - Vim
---

# Vim: A Practical Guide to the Modal Editor

Updated Nov 18, 2026

**Vim** is a text editor that runs in a terminal as well as in graphical versions. It is often used for code, configuration files, and quick edits over SSH. Vim builds on the vi editor and adds features such as multiple undo, search, syntax highlighting, and extensive customization.

Vim is a **modal editor**: the same key can do different things depending on the current mode. You navigate and edit with commands in Normal mode, and switch to Insert mode when you want to type text. Once that distinction clicks, Vim's commands become a compact vocabulary for editing text precisely.

## Start Here

Open a file from your shell:

```sh
vim notes.txt
```

If you are new to Vim, run the interactive tutorial with `vimtutor`. It walks through the basics in a temporary practice file.

When Vim opens, it starts in **Normal mode**. Press `i` to enter Insert mode, type a little text, then press `Esc` to return to Normal mode. To save and leave, type `:wq` and press `Enter`.

## The Modes You Need First

| Mode | How to enter | What it is for |
| --- | --- | --- |
| Normal | `Esc` | Move around, make edits, and run commands. This is the default mode. |
| Insert | `i`, `a`, or `o` from Normal mode | Type text. `i` inserts before the cursor, `a` after it, and `o` opens a new line below. |
| Visual | `v` or `V` from Normal mode | Select text by character (`v`) or whole lines (`V`), then operate on the selection. |
| Command-line | `:` from Normal mode | Run commands such as `:w`, `:q`, and search-and-replace commands. |

If a key seems to type a strange command instead of text, press `Esc` to return to Normal mode, then press `i` to resume typing.

## Moving Around

These keys work in Normal mode. The classic `h`, `j`, `k`, `l` keys move left, down, up, and right; the arrow keys also work in most installations.

| Key | Movement |
| --- | --- |
| `h`, `j`, `k`, `l` | Left, down, up, right |
| `w`, `b`, `e` | Next word start, previous word start, word end |
| `0`, `^`, `$` | Line start, first nonblank character, line end |
| `gg`, `G` | First line, last line |
| `{number}G` | Go to that line, for example `12G` |
| `Ctrl-d`, `Ctrl-u` | Scroll down or up about half a screen |
| `%` | Jump between matching brackets or parentheses |

Use `f` followed by a character to jump forward to that character on the current line. For example, `f,` moves to the next comma. `;` repeats the last `f` or `t` search in the same direction.

## Edit with Operators and Motions

Many Normal-mode edits combine an **operator** (what to do) with a **motion** (which text to act on). This makes a small set of commands apply to many different ranges.

| Command | Result |
| --- | --- |
| `dw` | Delete from the cursor through the next word movement |
| `d$` | Delete from the cursor to the end of the line |
| `dd` | Delete the current line |
| `cw` | Change text from the cursor through the next word movement, then enter Insert mode |
| `ciw` | Change the word under the cursor, then enter Insert mode |
| `yy` | Copy (yank) the current line |
| `p`, `P` | Paste after or before the cursor (or below/above the current line for a linewise copy) |
| `x` | Delete the character under the cursor |
| `u`, `Ctrl-r` | Undo, redo |
| `.` | Repeat the last change |

For example, `d` means delete and `w` means move to the next word start, so `dw` combines them. Add a count to repeat an operation: `3dd` deletes three lines. To try a change without committing to it, remember that `u` undoes it.

Visual mode is a useful alternative when you want to see the range first: press `v`, move to extend the selection, then press `d` to delete it or `y` to copy it. Use `V` to select whole lines.

## Search and Replace

From Normal mode, search forward with `/`, type a pattern, and press `Enter`. Use `?` to search backward. Press `n` for the next match and `N` for the previous one.

In Command-line mode, replace text on the current line with:

```vim
:s/old/new/g
```

To replace throughout the whole file, add the `%` range. Add `c` to confirm each replacement:

```vim
:%s/old/new/gc
```

## Save and Quit

| Command | Result |
| --- | --- |
| `:w` | Save the file |
| `:w other.txt` | Save a copy under another name |
| `:q` | Quit, if there are no unsaved changes |
| `:wq` | Save and quit |
| `:q!` | Quit and discard unsaved changes |
| `ZZ` | Save and quit (Normal mode) |

Commands that start with `:` are completed by pressing `Enter`. If Vim says there are unsaved changes, use `:w` to save them or `:q!` only when you intend to discard them.

## A Small Editing Routine

1. Open a file with `vim filename`.
2. Navigate in Normal mode with `w`, `b`, `0`, and `$`.
3. Use an operator and motion, such as `ciw`, to change a specific piece of text.
4. Press `Esc` when you finish typing.
5. Search with `/pattern`, then move between matches with `n` and `N`.
6. Save with `:w`; leave with `:q` or combine both with `:wq`.

## A Few More Useful Commands

- `:help` opens Vim's built-in help; `:help motion` looks up a topic.
- `:Tutor` starts the interactive tutorial from inside Vim on versions that include it; `vimtutor` is the shell command alternative.
- `:set number` shows line numbers for the current session.
- `:e filename` opens another file in the current window.
- `:sp filename` and `:vsp filename` split the window horizontally or vertically.
- `Ctrl-w` followed by `h`, `j`, `k`, or `l` moves between split windows.

Vim has many more commands than a beginner needs. Start with Normal/Insert mode, a few motions, `u`, `/`, `:w`, and `:q`; learn additional commands when a real editing task calls for them.