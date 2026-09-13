# Comment Manager

Personal Kanban for Figma root comments. Figma owns the thread. This plugin owns workflow.

## Product

**Comment Manager**:
The product. A personal board for Figma root comments in the open file.
_Avoid_: Triage, team board, workspace

**Board**:
The Kanban for one person in one file. Columns default to To-do, In Progress, and Done. The user can add, rename, reorder, and delete columns.
_Avoid_: swimlane, workspace board

**Card**:
One root Figma comment. Replies are not cards. Click a card to jump to the pin.
_Avoid_: ticket, issue, thread

## Rules

- The board is personal. Two people in the same file have two boards.
- New cards land in the leftmost column.
- Done is a default name only. It does not resolve the Figma comment.
- Skip already-resolved roots on first capture. If a card later resolves or deletes in Figma, leave the card.
- A live default column set applies to files the user has not customized. Toggle **Edit my default** vs **Edit this file**.
