---
level: intermediate
technologies:
  - Pandoc
---

# Pandoc: Convert Documents from the Command Line

Pandoc converts documents between markup and word-processing formats. It is useful when the same source needs to become a web page, a Word document, or a PDF, or when converting an existing document into an editable format.

## Install Pandoc

Use the installation method for your operating system from the [Pandoc installation guide](https://pandoc.org/installing.html). On macOS with Homebrew, for example:

```sh
brew install pandoc
```

Check that it is available:

```sh
pandoc --version
```

## The Basic Conversion

The general pattern is:

```sh
pandoc input-file -o output-file
```

Pandoc usually infers the input and output formats from the filename extensions. For example, convert Markdown to HTML or Word:

```sh
pandoc notes.md -o notes.html
pandoc notes.md -o notes.docx
```

Pandoc can also convert in the other direction when it supports both formats:

```sh
pandoc report.docx -o report.md
```

## Specify Formats Explicitly

Use `--from` (or `-f`) to choose the input format and `--to` (or `-t`) to choose the output format. Explicit formats are helpful when filenames have no extension or when the intended format is not obvious:

```sh
pandoc --from markdown --to html notes.txt -o notes.html
```

See which formats the installed version supports with:

```sh
pandoc --list-input-formats
pandoc --list-output-formats
```

## HTML Fragments and Full Documents

By default, Pandoc may produce an HTML fragment rather than a complete page. Add `--standalone` (or `-s`) when you need a full HTML document with a document structure such as `<head>` and `<body>`:

```sh
pandoc notes.md --standalone -o notes.html
```

## Create a PDF

To create a PDF, specify a `.pdf` output file:

```sh
pandoc notes.md -o notes.pdf
```

PDF output requires a PDF-producing engine. The default LaTeX-based engine needs a suitable LaTeX installation; if Pandoc reports that it cannot find the engine, install one or choose another supported PDF engine with `--pdf-engine`. See the [Pandoc PDF documentation](https://pandoc.org/MANUAL.html#creating-a-pdf) for engine options and requirements.

## A Repeatable Workflow

Keep the source document and generate each output from it:

```sh
pandoc guide.md --standalone -o guide.html
pandoc guide.md -o guide.docx
pandoc guide.md -o guide.pdf
```

This keeps content in one editable file while producing formats for different readers. Check the generated output, especially when using advanced formatting, tables, citations, or document-specific features; not every format represents every feature in the same way.

For more options, see the [Pandoc User's Guide](https://pandoc.org/MANUAL.html).