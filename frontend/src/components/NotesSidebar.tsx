import React from "react";

type NotesSidebarProps = {
  notes: string[];
  onCreateNote: () => void;
};

export default function NotesSidebar({
  notes,
  onCreateNote,
}: NotesSidebarProps) {
  return (
    <aside className="notesSidebar">
      <button
        className="newNoteButton"
        onClick={onCreateNote}
      >
        + New Note
      </button>

      <div className="notesList">
        {notes.map((noteName) => (
          <button
            key={noteName}
            type="button"
            className="noteEntryButton"
          >
            {noteName}
          </button>
        ))}
      </div>
    </aside>
  );
}