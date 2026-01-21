# UX Improvements & Eisenhower Matrix Design

## Overview

Improvements to George's Ticker to match TickTick's polish and add an Eisenhower Matrix view. Focus on intuitive behavior, information density, and fluid interactions.

---

## 1. Smart Task Creation

### Context-Aware Quick Add

When viewing a smart list, quick-add automatically sets the appropriate due date:

| Current View | New Task Gets |
|--------------|---------------|
| Inbox | No due date |
| Today | Due today |
| Tomorrow | Due tomorrow |
| Next 7 Days | Shows inline date picker |
| All Tasks | No due date |
| Completed | Hide quick-add |
| Custom List | Assigned to that list |

Input placeholder reflects context: *"Add task for tomorrow..."*

### Natural Language Parsing

Type naturally and the parser extracts structured data:

```
"Call mom tomorrow 3pm !high #family"
```

Parses to:
- Title: "Call mom"
- Due: tomorrow's date
- Time: 15:00
- Priority: high
- Tag: family

**Supported shortcuts:**
- Dates: "today", "tomorrow", "monday", "next week", "jan 15"
- Times: "3pm", "15:00", "noon", "morning" (9am), "evening" (6pm)
- Priority: `!high` `!med` `!low` or `!!!` `!!` `!`
- Tags: `#tagname`
- Lists: `^listname`

Parsed elements show as chips below input before Enter for verification.

---

## 2. Eisenhower Matrix View

### New View Mode

Third view option alongside List and Calendar: **Matrix**

Toggle in sidebar header: `[≡] [📅] [⊞]`

### Matrix Layout

2x2 grid filling main content area:

```
┌─────────────────────┬─────────────────────┐
│ Q1: DO FIRST        │ Q2: SCHEDULE        │
│ Urgent + Important  │ Not Urgent + Import │
├─────────────────────┼─────────────────────┤
│ Q3: DELEGATE        │ Q4: ELIMINATE       │
│ Urgent + Not Import │ Not Urgent + Not Imp│
└─────────────────────┴─────────────────────┘
```

### Mapping Logic

- **Urgent** = due today, overdue, or due tomorrow
- **Important** = priority high or medium

No new database fields needed - derived from existing data.

### Interactions

- Drag tasks between quadrants (updates priority/due date accordingly)
- Click task opens detail panel
- Each quadrant scrolls independently
- Quick-add at bottom of each quadrant

---

## 3. Task Completion UX

### Improved Flow

1. **Click checkbox** → checkbox fills with smooth animation (150ms)
2. **Brief pause** → task stays in place 400ms, strikethrough fades in
3. **Slide out** → task slides left and fades (200ms)
4. **Undo toast** → bottom-left: "Task completed · Undo" (3 seconds)

### Visual Details

- Checkbox: border animates to fill, checkmark draws in
- Strikethrough: animates left-to-right across title
- Row compresses smoothly (siblings slide up, no jump)

### Undo Toast

```
┌────────────────────────────┐
│ ✓ "Call mom" completed     │
│              [Undo]        │
└────────────────────────────┘
```

Non-intrusive, disappears after 3 seconds.

### Sound (Optional)

Subtle "tick" sound on completion - disabled by default, enable in settings.

---

## 4. Search & Filter UX

### Always-Visible Search

Slim search bar in header:

```
🔍 Search...                          ⚙
```

Expands on focus, collapses when empty. Filters behind gear icon.

### Quick Filter Pills

Compact text links:

```
all · high priority · overdue · tagged
```

Click to toggle, multiple can be active.

### Advanced Filters Panel

Slides down on gear click:

```
Priority    [None] [Low] [Med] [High]
Tags        [work ×] [personal ×] [+ Add]
Due Date    [Any ▾]
Status      [Incomplete] [Completed] [All]
                        [Clear All]
```

### Keyboard

- `Ctrl+F` or `/` focuses search immediately

### Results Display

```
Showing 12 results for "mom" · [× Clear]
```

---

## 5. View Switching & Navigation

### View Switcher

Small icon-only toggle in sidebar header:

```
George's Ticker     [≡] [📅] [⊞]
```

16px icons, current view has subtle underline. No chunky buttons.

### Keyboard Shortcuts

- `Ctrl+1` → List view
- `Ctrl+2` → Calendar view
- `Ctrl+3` → Matrix view

### Breadcrumb Context

When filtered:

```
Inbox › Priority: High › 3 tasks  [× Clear]
```

### Transitions

- Crossfade animation (150ms)
- Selected task persists across view changes
- Scroll position resets

---

## 6. Aesthetic Principles

### Design Language

| Element | Style |
|---------|-------|
| Sidebar | Subtle background tint |
| List items | Minimal chrome, content-first |
| Hover states | Gentle highlight, reveals actions |
| Selected state | Thin left border accent |
| Spacing | 6-8px gaps |
| Icons | 14-16px, monoline, muted |
| Typography | System font, 13px body, 11px secondary |
| Borders | 1px subtle gray |

### Task Row Density

Compact single line, expands to two when needed:

```
○ Call mom                      tomorrow 3pm
  #family                              !high
```

### Detail Panel

Narrower (320px), sections collapsed by default:

```
Call mom
─────────────────────
📅 Tomorrow, 3:00 PM
⚡ High priority

▸ Tags
▸ Recurrence
▸ Reminders
▸ Notes

[Delete]
```

### Animations

- 100-150ms transitions
- Ease-out curves
- No bounces
- Opacity + transform only

---

## 7. Keyboard & QoL Improvements

### Shortcuts

| Shortcut | Action |
|----------|--------|
| `Enter` | Open detail panel |
| `Escape` | Close panel / clear search |
| `↑↓` | Navigate task list |
| `Space` | Toggle complete |
| `Ctrl+N` or `/` | Quick add |
| `Ctrl+Shift+N` | Quick add with dialog |
| `D` | Set due today |
| `T` | Set due tomorrow |
| `1-4` | Set priority |

### Inline Quick Edit

Double-click task title → edit inline without opening detail panel.

### Empty States

Contextual messages:
- Today: "Nothing due today."
- Tomorrow: "Tomorrow's clear."
- Inbox: "Inbox zero. Add a task with Ctrl+N"

### Drag & Drop Polish

- Subtle drop zone highlights
- Matrix quadrants glow when valid target
- Ghost preview shows landing position

### System Tray Quick Add

Right-click tray → "Quick Add" opens minimal floating window.

---

## Implementation Priority

1. **High**: Smart task creation (context-aware + natural language)
2. **High**: Eisenhower Matrix view
3. **Medium**: Task completion animations + undo
4. **Medium**: Search/filter improvements
5. **Medium**: Compact aesthetic refresh
6. **Low**: Keyboard shortcuts expansion
7. **Low**: System tray quick add

---

## Technical Notes

- Natural language parsing: consider `chrono-node` for date parsing
- Animations: CSS transitions + React state, no heavy library needed
- Matrix view: new component, reuses existing task item components
- Aesthetic changes: Tailwind utility adjustments, minimal structural changes
