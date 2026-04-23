import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import NotesSidebar, { type Note } from "./components/NotesSidebar";
import { db_client } from "./auth/client";

// tiptap & yjs imports
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Collaboration from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';


// 1. THE NETWORK BRIDGE
// This is the middleman between our local text editor and Supabase WebSockets

function useCollaboration(fileId: string | null) {
  // ydoc is the brain that figures out how to merge everyone's typing together
  const [ydoc] = useState(() => new Y.Doc());
  
  // TipTap expects a full network library, so we have to give empty functions so it doesn't crash.
  const [provider] = useState(() => {
    const awareness = new Awareness(ydoc);
    return { awareness, on: () => {}, off: () => {} };
  });

  useEffect(() => {
    // Don't try to connect to a websocket room for an unsaved "temp" file
    // temp rooms are used for when we create file but haven't saved it
    if (!fileId || fileId.startsWith('temp-')) return;

    const awareness = provider.awareness;
    const channel = db_client.channel(`room-${fileId}`);

    // Listen for typing updates from the room and apply them to yjs
    channel.on('broadcast', { event: 'update' }, ({ payload }) => {
      Y.applyUpdate(ydoc, new Uint8Array(payload.update));
    });

    // Listen for presence updates (like mouse movements) from others
    channel.on('broadcast', { event: 'awareness' }, ({ payload }) => {
      applyAwarenessUpdate(awareness, new Uint8Array(payload.update), 'remote');
    });

    // Every time we type something, broadcast the changes to everyone else
    ydoc.on('update', (update) => {
      channel.send({
        type: 'broadcast',
        event: 'update',
        payload: { update: Array.from(update) }
      });
    });

    // Broadcast our own presence/cursor movements
    awareness.on('update', ({ added, updated, removed }: { added: number[], updated: number[], removed: number[] }) => {
      const changes = encodeAwarenessUpdate(awareness, [...added, ...updated, ...removed]);
      channel.send({
        type: 'broadcast',
        event: 'awareness',
        payload: { update: Array.from(changes) }
      });
    });

    // When we first join a room, we ask others in the room for most up to date text
    channel.subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        const stateVector = Y.encodeStateVector(ydoc);
        channel.send({
           type: 'broadcast',
           event: 'sync-request',
           payload: { stateVector: Array.from(stateVector) }
        });
      }
    });
    
    // If we hear someone new join and ask for document, beam them the full document
    channel.on('broadcast', { event: 'sync-request' }, ({ payload }) => {
       const stateVector = new Uint8Array(payload.stateVector);
       const update = Y.encodeStateAsUpdate(ydoc, stateVector);
       channel.send({
           type: 'broadcast',
           event: 'update',
           payload: { update: Array.from(update) }
       });
    });

    // Unsubscribe when we leave the file
    return () => {
      channel.unsubscribe();
    };
  }, [fileId, ydoc, provider]);

  // Clean up Yjs memory when the component fully unmounts
  useEffect(() => {
    return () => ydoc.destroy();
  }, [ydoc]);

  return { ydoc, provider };
}



// 2. THE EDITOR COMPONENT
// Displays the Yjs logic onto the screen so it looks like a real text box
interface ActiveEditorProps {
  currentNoteId: string;
  currentNote: string;
  setCurrentNote: (val: string) => void;
  initialHtml: string;
  onSave: (html: string) => void;
  onDelete: () => void;
  notes: Note[];
  onNoteClick: (note: Note) => void; 
}

// headers from h1 to h6
type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6; 

function ActiveEditor({ 
  currentNoteId, currentNote, setCurrentNote, initialHtml, onSave, onDelete, notes, onNoteClick
}: ActiveEditorProps) {
  const { ydoc } = useCollaboration(currentNoteId);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const editor = useEditor({
    extensions: [
      // We must disable history (undo/redo) so Yjs can handle it. Otherwise we might undo our teammates' typing
      StarterKit.configure({ history: false }), 
      Link.configure({ openOnClick: false }), // Stops TipTap from trying to open links in a new tab
      Collaboration.configure({ document: ydoc }),
    ],
    onUpdate: ({ editor }) => {
      // Whenever we type, look at the 2 characters right behind the cursor
      const { from } = editor.state.selection;
      const textBeforeCursor = editor.state.doc.textBetween(Math.max(0, from - 2), from, '\n');
      
      // If they typed [[, calculate the pixel coordinates and pop the dropdown menu
      if (textBeforeCursor === "[[") {
        const coords = editor.view.coordsAtPos(from);
        setDropdownPos({ top: coords.bottom, left: coords.left });
        setDropdownVisible(true);
      } else {
        setDropdownVisible(false);
      }
    }
  });

  // THE FALLBACK TIMER
  // WebSockets forget data when the room is empty
  // We wait 1 sec to see if anyone beams us live text. If nobody does, we are alone, so load the text from Supabase
  useEffect(() => {
    if (!editor || !initialHtml) return;

    let hasReceivedSync = false;
    const handleUpdate = () => { hasReceivedSync = true; };
    ydoc.on('update', handleUpdate);

    const timer = setTimeout(() => {
      if (!hasReceivedSync && editor.isEmpty) {
        editor.commands.setContent(initialHtml, false);
      }
    }, 1000); 

    return () => {
      ydoc.off('update', handleUpdate);
      clearTimeout(timer);
    };
  }, [editor, initialHtml, ydoc]);

  // Handle inserting a linked file into the text
  const insertLink = (note: Note) => {
    if (!editor) return;
    
    // Get rid of the "[[" characters they just typed
    editor.chain().focus().deleteRange({ from: editor.state.selection.from - 2, to: editor.state.selection.from }).run();
    
    // Inject the link block using the # prefix so TipTap passes it through security
    editor.chain().focus().insertContent([
      { type: 'text', text: note.title, marks: [{ type: 'link', attrs: { href: `#note:${note.id}` } }] },
      { type: 'text', text: ' ' } // add a safe space so they don't get stuck typing inside the link
    ]).run();
    
    setDropdownVisible(false);
  };

  const handleSaveClick = () => {
    if (editor) onSave(editor.getHTML());
  };

  // Intercept clicks on the editor. If they click one of our custom links, swap files!
  const handleEditorClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const link = target.closest('a'); 
    
    if (link && link.getAttribute('href')?.startsWith('#note:')) {
      e.preventDefault(); 
      const targetId = link.getAttribute('href')?.replace('#note:', '');
      const linkedNote = notes.find((n) => n.id === targetId);
      
      if (linkedNote) onNoteClick(linkedNote);
      else alert("Could not find that file. It might have been deleted.");
    }
  };

  if (!editor) return null;

  return (
    // the following is the HTML for the editor
    <div className="container" style={{ position: "relative" }}>
      {dropdownVisible && (
        <div className="tag-dropdown" style={{ top: dropdownPos.top + 5, left: dropdownPos.left, position: 'fixed' }}>
          {notes.map((note: Note) => (
            <button key={note.id} onClick={() => insertLink(note)}>
              {note.title}
            </button>
          ))}
        </div>
      )}

      <h1 className="title">React Text Editor</h1>
      <p className="subtitle" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        Editing: 
        <input 
          type="text" 
          value={currentNote} 
          onChange={(e) => setCurrentNote(e.target.value)}
          style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #cbd5e1", fontWeight: "bold", color: "#0f172a", outline: "none" }}
        />
      </p>

      <div className="toolbar">
        <button className="primary-action" onClick={handleSaveClick}>Save</button>
        <button className="danger" onClick={onDelete}>Delete File</button>

        <button onClick={() => editor.chain().focus().toggleBold().run()}>Bold</button>
        <button onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</button>
        
        <select onChange={(e) => {
          const val = e.target.value;
          if (val === "P") editor.chain().focus().setParagraph().run();
          else editor.chain().focus().toggleHeading({ level: parseInt(val.charAt(1)) as HeadingLevel }).run();
        }}>
          <option>Headings</option>
          <option value="P">Paragraph</option>
          <option value="H1">H1</option>
          <option value="H2">H2</option>
        </select>

        <button onClick={() => editor.chain().focus().toggleBulletList().run()}>Bullet</button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()}>Numbered</button>
        <button onClick={() => {
          const url = window.prompt("Enter URL");
          if (url) editor.chain().focus().setLink({ href: url }).run();
        }}>Link</button>
        <button onClick={() => editor.chain().focus().unsetLink().run()}>Unlink</button>
        <button onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()}>Clear</button>
      </div>

      <div className="grid">
        <div onClick={handleEditorClick}>
          <h2 className="section">Editor</h2>
          <EditorContent editor={editor} className="editor" />
        </div>
        <div>
          <h2 className="section">Saved HTML</h2>
          <textarea value={editor.getHTML()} readOnly className="html" />
        </div>
      </div>
    </div>
  );
}


// 3. THE MAIN PAGE
// Manages application state, saving, and switching between files

export default function TextEditor() {
  const { workspaceId } = useParams();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState("Untitled.txt");
  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);
  
  // We pass this as the "key" to ActiveEditor to force React to completely destroy and reboot 
  // the editor when we swap files. This stops websocket rooms from getting tangled.
  const [editorKey, setEditorKey] = useState<string | null>(null); 
  const [initialHtml, setInitialHtml] = useState("<p></p>");

  const fetchFiles = useCallback(async () => {
    if (!workspaceId) return;
    try {
      const token = localStorage.getItem("access_token") || "";
      // We fetch from supabase using FAST API listening on port 8000
      const res = await fetch(`http://localhost:8000/workspaces/${workspaceId}/files`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch files");
      const data = await res.json();
      setNotes(data); 
    } catch (error) {
      console.error(error);
    }
  }, [workspaceId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  const saveToDatabase = async (latestHtml: string) => {
    // Quick DOM parse to scrape out all the tags so the Python backend can build its graph
    const parser = new DOMParser();
    const doc = parser.parseFromString(latestHtml, 'text/html');
    const links = doc.querySelectorAll('a[href^="#note:"]');
    const linkedFiles = Array.from(links).map(a => a.textContent || "");

    const payload = {
      workspace_id: workspaceId, 
      file_id: currentNoteId, 
      file_name: currentNote,
      file_contents: latestHtml,
      linked_file_names: linkedFiles 
    };

    const token = localStorage.getItem("access_token") || "";
    // We fetch from supabase using FAST API listening on port 8000
    const response = await fetch("http://localhost:8000/files/save", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) throw new Error("Failed to save");
    return await response.json();
  };

  const handleSave = async (latestHtml: string) => {
    try {
      const result = await saveToDatabase(latestHtml);
      await fetchFiles();
      setInitialHtml(latestHtml);
      
      // If we just saved a newly created file, securely move the WebSockets from the temp room to the real room
      if (currentNoteId?.startsWith("temp-")) {
        setCurrentNoteId(result.file_id); 
        setEditorKey(result.file_id);
      }
      
      alert(`Saved ${currentNote} successfully!`);
    } catch (error) {
      console.error(error);
      alert("Error saving file. Check console.");
    }
  };

  const handleDelete = async () => {
    // Handle deleting a file that hasn't actually been saved to the DB yet
    if (!currentNoteId || currentNoteId.startsWith("temp-")) {
      setNotes(notes.filter(n => n.id !== currentNoteId));
      setCurrentNote("Untitled.txt");
      setCurrentNoteId(null);
      setEditorKey(null);
      return;
    }
    
    if (!window.confirm(`Are you sure you want to delete ${currentNote}? This cannot be undone.`)) return;

    try {
      const token = localStorage.getItem("access_token") || "";
      const response = await fetch(`http://localhost:8000/workspaces/${workspaceId}/files/${currentNoteId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!response.ok) throw new Error("Failed to delete");
      
      await fetchFiles(); 
      setCurrentNote("Untitled.txt");
      setCurrentNoteId(null);
      setEditorKey(null);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateNote = () => {
    const noteName = window.prompt("Enter note name (example: science.txt)");
    if (!noteName?.trim()) return;
    if (notes.some(n => n.title === noteName.trim())) return alert("Name exists!");

    const newNote: Note = {
      id: `temp-${Date.now()}`, // we assign temp id for new files before they are saved
      title: noteName.trim(),
      content: "<p></p>"
    };
    setNotes([...notes, newNote]);
    setCurrentNoteId(newNote.id);
    setEditorKey(newNote.id); 
    setCurrentNote(newNote.title);
    setInitialHtml(newNote.content);
  };

  // Forces the app to fetch the newest text from the DB when switching files 
  // so we don't accidentally overwrite a teammate's work with outdated browser memory
  const handleNoteClick = async (note: Note) => {
    setEditorKey(null); // Unmount editor immediately so we don't accidentally leak old WebSockets
    setCurrentNoteId(note.id);
    setCurrentNote(note.title);

    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch(`http://localhost:8000/files/${note.id}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (!res.ok) throw new Error("Failed to fetch fresh document");
      const data = await res.json();
      setInitialHtml(data.content || "<p></p>");
    } catch (error) {
      console.error(error);
      setInitialHtml(note.content || "<p></p>"); // Fallback to cache if strictly necessary
    }
    
    setEditorKey(note.id); // Re-mount the editor now that we securely have the fresh text
  };

  return (
    <>
      <style>{`
        /* ... existing styles ... */
        .page{ min-height:100vh; background:#f1f5f9; padding:20px; }
        .layout{ width:100%; display:grid; grid-template-columns:280px minmax(0, 1fr); gap:20px; align-items:start; }
        .notesSidebar{ background:white; border-radius:20px; padding:16px; box-shadow:0 10px 25px rgba(0,0,0,0.08); position:sticky; top:20px; }
        .newNoteButton{ width:100%; background:#0f172a; color:white; border:none; border-radius:10px; padding:10px 12px; font-weight:600; cursor:pointer; }
        .notesList{ margin-top:14px; display:flex; flex-direction:column; gap:8px; max-height:70vh; overflow:auto; }
        .noteEntryButton{ text-align:left; width:100%; border:1px solid #cbd5e1; background:#f8fafc; border-radius:10px; padding:9px 11px; cursor:pointer; font-weight:500; color:#0f172a; }
        .container{ width:100%; background:white; padding:25px; border-radius:20px; box-shadow:0 10px 25px rgba(0,0,0,0.08); }
        .title{ font-size:36px; font-weight:bold; color:#0f172a; }
        .subtitle{ margin-top:8px; color:#64748b; }
        .toolbar{ margin-top:20px; display:flex; flex-wrap:wrap; gap:10px; background:#f8fafc; border:1px solid #e2e8f0; padding:15px; border-radius:15px; }
        .toolbar button, .toolbar select{ background:white; border:1px solid #cbd5e1; padding:8px 14px; border-radius:10px; cursor:pointer; font-weight:500; }
        .primary-action { background: #4f46e5 !important; color: white; border: 1px solid #4338ca !important; }
        .danger{ background:#fef2f2; border:1px solid #fecaca; color:#dc2626; }
        .grid{ display:grid; grid-template-columns:1fr 1fr; gap:20px; margin-top:20px; }
        .section{ font-size:20px; font-weight:600; color:#1e293b; margin-bottom: 10px; }
        .html{ min-height:360px; width:100%; border-radius:15px; border:1px solid #cbd5e1; padding:15px; background:#f8fafc; font-family:monospace; }
        .tag-dropdown { background: white; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 1000; display: flex; flex-direction: column; padding: 4px; min-width: 150px; }
        .tag-dropdown button { padding: 8px 12px; text-align: left; border: none; background: none; cursor: pointer; border-radius: 4px; }
        .tag-dropdown button:hover { background: #f1f5f9; }

        a[href^="#note:"] { 
          background: #eef2ff; 
          color: #4f46e5; 
          border: 1px solid #c7d2fe; 
          border-radius: 4px; 
          padding: 2px 6px; 
          margin: 0 2px; 
          cursor: pointer; 
          font-size: 0.9em; 
          display: inline-block; 
          user-select: none; 
          text-decoration: none;
        }

        .ProseMirror { min-height: 340px; border: 1px solid #cbd5e1; border-radius: 15px; padding: 15px; outline: none; background: white; }
        .ProseMirror:focus { border-color: #94a3b8; }
      `}</style>

      <div className="page">
        <div className="layout">
          <NotesSidebar notes={notes} onCreateNote={handleCreateNote} onNoteClick={handleNoteClick} />
          
          {editorKey ? (
            <ActiveEditor 
              key={editorKey} 
              currentNoteId={currentNoteId!} 
              currentNote={currentNote}
              setCurrentNote={setCurrentNote}
              initialHtml={initialHtml}
              onSave={handleSave}
              onDelete={handleDelete}
              notes={notes}
              onNoteClick={handleNoteClick}
            />
          ) : (
            <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ color: '#64748b', fontSize: '18px' }}>Select or create a note to begin.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}