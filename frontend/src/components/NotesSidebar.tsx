// Update the type to match the data coming from the database
export type Note = {
  id: string;
  title: string;
  content: string;
};

type NotesSidebarProps = {
  notes: Note[]; // Now an array of objects
  onCreateNote: () => void;
  onNoteClick: (note: Note) => void; // New prop for handling clicks
};

export default function NotesSidebar({
  notes,
  onCreateNote,
  onNoteClick, // Destructure the new prop
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
        {notes.map((note) => (
          <button
            key={note.id}
            type="button"
            className="noteEntryButton"
            onClick={() => onNoteClick(note)} // Call the function when clicked
          >
            {note.title}
          </button>
        ))}
      </div>
    </aside>
  );
}