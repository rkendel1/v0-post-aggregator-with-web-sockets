# Manual Testing Guide for Saved Posts Fix

## Prerequisites
1. Apply the migration script `scripts/013_add_is_saved_column.sql` to your database
2. Start the development server: `npm run dev`
3. Log in to the application

## Test Scenarios

### Scenario 1: Save a Post (Not in Queue)
**Steps:**
1. Navigate to the home feed
2. Find a post that is not saved and not in queue
3. Click the "Save" button (bookmark icon)
4. Navigate to the "Saved" page

**Expected Result:**
- The post should appear in the Saved page
- The Save button should show a filled bookmark icon
- The post should NOT appear in the Queue page

### Scenario 2: Add a Post to Queue (Not Saved)
**Steps:**
1. Navigate to the home feed
2. Find a post with audio that is not saved and not in queue
3. Click the "Add to Queue" button
4. Navigate to the "Queue" page

**Expected Result:**
- The post should appear in the Queue page
- The Add to Queue button should show a filled list icon
- The post should NOT appear in the Saved page
- The Save button should still show an empty bookmark icon

### Scenario 3: Save a Post That's Already in Queue
**Steps:**
1. Navigate to the home feed
2. Find a post with audio that is in the queue (from Scenario 2)
3. Click the "Save" button

**Expected Result:**
- The post should appear in BOTH the Saved page AND the Queue page
- Both the Save button and Add to Queue button should be active/filled

### Scenario 4: Add to Queue a Post That's Already Saved
**Steps:**
1. Navigate to the home feed
2. Find a post with audio that is saved (from Scenario 1)
3. Click the "Add to Queue" button

**Expected Result:**
- The post should appear in BOTH the Saved page AND the Queue page
- Both the Save button and Add to Queue button should be active/filled

### Scenario 5: Unsave a Post That's Also in Queue
**Steps:**
1. Use a post from Scenario 3 or 4 (both saved and queued)
2. Click the "Save" button to unsave it

**Expected Result:**
- The post should NO LONGER appear in the Saved page
- The post should STILL appear in the Queue page
- The Save button should show an empty bookmark icon
- The Add to Queue button should still be active/filled

### Scenario 6: Remove from Queue a Post That's Also Saved
**Steps:**
1. Use a post from Scenario 3 or 4 (both saved and queued)
2. Click the "Add to Queue" button to remove it from queue

**Expected Result:**
- The post should STILL appear in the Saved page
- The post should NO LONGER appear in the Queue page
- The Save button should still be active/filled
- The Add to Queue button should show an empty list icon

### Scenario 7: Complete Removal
**Steps:**
1. Use a post from Scenario 3 or 4 (both saved and queued)
2. Click the "Save" button to unsave it
3. Click the "Add to Queue" button to remove from queue

**Expected Result:**
- The post should NOT appear in the Saved page
- The post should NOT appear in the Queue page
- Both buttons should show empty icons

## Database Verification
You can verify the database state using the Supabase SQL Editor:

```sql
-- Check all saved_posts for a specific user
SELECT 
  sp.id,
  sp.is_saved,
  sp.queue_position,
  p.content
FROM saved_posts sp
JOIN posts p ON sp.post_id = p.id
WHERE sp.user_id = 'YOUR_USER_ID'
ORDER BY sp.created_at DESC;
```

Expected states:
- Saved only: `is_saved = true, queue_position = NULL`
- Queued only: `is_saved = false, queue_position = (some number)`
- Both: `is_saved = true, queue_position = (some number)`
