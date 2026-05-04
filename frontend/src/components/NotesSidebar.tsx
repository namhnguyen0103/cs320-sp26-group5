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
  activeNoteId?: string | null;
};

const IconHelp = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
    <path d="M6.5 6a1.5 1.5 0 012.914.5c0 1-1.414 1.5-1.414 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    <circle cx="8" cy="11.5" r="0.5" fill="currentColor" />
  </svg>
);

const IconLogout = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M6 8h7M10 5l3 3-3 3M5 3H3a1 1 0 00-1 1v8a1 1 0 001 1h2"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);



export default function NotesSidebar({
  notes,
  onCreateNote,
  onNoteClick,
  activeNoteId,
}: NotesSidebarProps) {
  return (
    <>
      <style>{`
        .ns-sidebar {
          width: 148px;
          background: #111;
          border-right: 1px solid #1e1e1e;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          height: 93vh;
        }
 
        .ns-new-btn {
          margin: 10px 10px 6px;
          padding: 7px 12px;
          background: linear-gradient(135deg, #71F7DC 15%, #3DD6D0 100%);
          color: #ffffff;
          border: none;
          border-radius: 8px;
          font-family: inherit;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          text-align: center;
        }
 
        .ns-new-btn:hover { 
          opacity: 0.9; 
        }
 
        .ns-list {
          flex: 1;
          overflow-y: auto;
          padding: 4px 6px;
        }
 
        .ns-list::-webkit-scrollbar { width: 4px; }
        .ns-list::-webkit-scrollbar-thumb { background: #222; border-radius: 4px; }
 
        .ns-note-item {
          display: block;
          width: 100%;
          text-align: left;
          padding: 7px 10px;
          background: none;
          border: none;
          border-radius: 6px;
          color: #777;
          font-family: inherit;
          font-size: 12px;
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
 
        .ns-note-item:hover { background: #1a1a1a; color: #ccc; }
        .ns-note-item.ns-active { background: #1e1e1e; color: #e8e8e8; }
 
        .ns-footer {
          border-top: 1px solid #1e1e1e;
          padding: 8px 6px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
 
        .ns-footer-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          background: none;
          border: none;
          color: #555;
          border-radius: 6px;
          cursor: pointer;
          font-family: inherit;
          font-size: 12px;
        }
 
        .ns-footer-btn:hover { background: #1a1a1a; color: #999; }
      `}</style>
      <aside className="ns-sidebar">

          
        <button className="ns-new-btn" onClick={onCreateNote}> 
          + New Note
        </button>
 
        <div className="ns-list">
          {notes.map((note) => (
            <button
              key={note.id}
              type="button"
              className={`ns-note-item${activeNoteId === note.id ? " ns-active" : ""}`}
              onClick={() => onNoteClick(note)} // Call the function when clicked
            >
              {note.title}
            </button>
          ))}
        </div>
 
        <div className="ns-footer">
          <button className="ns-footer-btn">
            <IconHelp />
            <span>Help</span>
          </button>
          <button className="ns-footer-btn">
            <IconLogout />
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}
