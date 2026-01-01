# Visual Guide: Saved Posts Fix

## Before Fix (Incorrect Behavior)

```
┌─────────────────────────────────────────────────────────┐
│ User Action: Click "Add to Queue"                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Database: saved_posts table                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ user_id | post_id | queue_position                  │ │
│ │ 123     | abc     | 1                               │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────┴─────────────────┐
        ↓                                   ↓
┌──────────────────┐             ┌──────────────────┐
│ SavePostButton   │             │ Saved Page       │
│ Checks: entry    │             │ Filters:         │
│ exists?          │             │ queue_position   │
│ Result: YES ✓    │             │ IS NULL          │
│ Shows: SAVED ✓   │             │ Result: EMPTY ✗  │
└──────────────────┘             └──────────────────┘

PROBLEM: Button says "Saved" but post doesn't appear in Saved page!
```

## After Fix (Correct Behavior)

```
┌─────────────────────────────────────────────────────────┐
│ User Action: Click "Add to Queue"                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ Database: saved_posts table                             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ user_id | post_id | queue_position | is_saved      │ │
│ │ 123     | abc     | 1              | false         │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                          ↓
        ┌─────────────────┴─────────────────┐
        ↓                                   ↓
┌──────────────────┐             ┌──────────────────┐
│ SavePostButton   │             │ Saved Page       │
│ Checks: is_saved │             │ Filters:         │
│ = true?          │             │ is_saved = true  │
│ Result: NO ✗     │             │ Result: EMPTY ✓  │
│ Shows: SAVE      │             └──────────────────┘
└──────────────────┘

CORRECT: Button shows "Save" and post doesn't appear in Saved page!
```

## State Transitions

### Scenario 1: Save a Post
```
Initial State: No entry
      ↓ Click "Save"
┌─────────────────────────────────────┐
│ is_saved = true                     │
│ queue_position = NULL               │
└─────────────────────────────────────┘
Shows in: Saved Page ✓
```

### Scenario 2: Add to Queue
```
Initial State: No entry
      ↓ Click "Add to Queue"
┌─────────────────────────────────────┐
│ is_saved = false                    │
│ queue_position = 1                  │
└─────────────────────────────────────┘
Shows in: Queue Page ✓
```

### Scenario 3: Save then Add to Queue
```
Initial State: is_saved=true, queue_position=NULL
      ↓ Click "Add to Queue"
┌─────────────────────────────────────┐
│ is_saved = true                     │
│ queue_position = 1                  │
└─────────────────────────────────────┘
Shows in: Saved Page ✓, Queue Page ✓
```

### Scenario 4: Add to Queue then Save
```
Initial State: is_saved=false, queue_position=1
      ↓ Click "Save"
┌─────────────────────────────────────┐
│ is_saved = true                     │
│ queue_position = 1                  │
└─────────────────────────────────────┘
Shows in: Saved Page ✓, Queue Page ✓
```

### Scenario 5: Unsave from Both Saved and Queued
```
Initial State: is_saved=true, queue_position=1
      ↓ Click "Save" to unsave
┌─────────────────────────────────────┐
│ is_saved = false                    │
│ queue_position = 1                  │
└─────────────────────────────────────┘
Shows in: Queue Page ✓
```

### Scenario 6: Remove from Queue (Both Saved and Queued)
```
Initial State: is_saved=true, queue_position=1
      ↓ Click "Add to Queue" to remove
┌─────────────────────────────────────┐
│ is_saved = true                     │
│ queue_position = NULL               │
└─────────────────────────────────────┘
Shows in: Saved Page ✓
```

### Scenario 7: Complete Removal (Saved Only)
```
Initial State: is_saved=true, queue_position=NULL
      ↓ Click "Save" to unsave
┌─────────────────────────────────────┐
│ Record DELETED                      │
└─────────────────────────────────────┘
Shows in: Nothing
```

### Scenario 8: Complete Removal (Queued Only)
```
Initial State: is_saved=false, queue_position=1
      ↓ Click "Add to Queue" to remove
┌─────────────────────────────────────┐
│ Record DELETED                      │
└─────────────────────────────────────┘
Shows in: Nothing
```

## Decision Table

| is_saved | queue_position | Shows in Saved | Shows in Queue | Save Button | Queue Button |
|----------|----------------|----------------|----------------|-------------|--------------|
| -        | -              | ✗              | ✗              | Empty       | Empty        |
| true     | NULL           | ✓              | ✗              | Filled      | Empty        |
| false    | 1              | ✗              | ✓              | Empty       | Filled       |
| true     | 1              | ✓              | ✓              | Filled      | Filled       |

Legend:
- `-` = No record exists
- `NULL` = Column value is NULL
- `1` = Any non-NULL queue position value
- Empty = Empty/outline icon
- Filled = Filled/solid icon
