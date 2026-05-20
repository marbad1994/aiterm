// Session-scoped edit tracker. Records before/after content for every
// write_file and edit_file so the user can review changes later.

const edits = [];

function recordEdit({ filePath, oldContent, newContent, tool }) {
  edits.push({
    filePath,
    oldContent: oldContent ?? null,  // null means new file
    newContent,
    tool,
    timestamp: Date.now(),
  });
}

function getEdits() { return edits; }
function hasEdits() { return edits.length > 0; }
function clearEdits() { edits.length = 0; }
function editCount() { return edits.length; }

module.exports = { recordEdit, getEdits, hasEdits, clearEdits, editCount };
