# ZedExt

A browsable mirror of Zed's extension registry, ranked by downloads, with theme previews and setup guides.

## Extensions

**Extension**:
One entry in Zed's registry, identified by its registry id (e.g. `java`).
_Avoid_: plugin, package

**Provides**:
The registry's list of what an extension contributes (`languages`, `themes`, `context-servers`, …); one extension can provide several.
_Avoid_: capabilities, features

**Kind**:
A provides value as people see it: its name ("MCP server"), short tag ("MCP"), color and category.
_Avoid_: type, category (when meaning one extension's kind)

**Primary kind**:
The one kind an extension is shown as when it provides several: a language beats its language server, a language server beats its MCP server.
_Avoid_: main kind, first provide

**Minor kind**:
A provides value never shown as an extension's kind (grammars, slash commands, docs providers), because nearly every language has one.

**Category**:
A browsable list of every extension of one kind, e.g. /mcp-servers.

## Data

**Snapshot**:
The nightly copy of the whole registry, with download counts and GitHub stats, that every page reads.
_Avoid_: database, cache

**Preview bundle**:
The nightly file of colors for every theme and icon theme, used to draw previews.

**Variant**:
One theme inside a theme extension (e.g. "Catppuccin Mocha" in Catppuccin), with its own appearance and colors.
_Avoid_: flavor, style
