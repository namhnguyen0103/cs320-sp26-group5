import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import NotesSidebar, { type Note } from "./components/NotesSidebar";
import SearchBar from "./components/SearchBar.tsx";
import { db_client } from "./auth/client";

// tiptap & yjs imports
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Collaboration from '@tiptap/extension-collaboration';

//other text stuff
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle} from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';


import * as Y from 'yjs';
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from 'y-protocols/awareness';
//icons
const IconGraph = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="3" cy="13" r="2" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="13" cy="3" r="2" stroke="currentColor" strokeWidth="1.3" />
    <circle cx="13" cy="13" r="2" stroke="currentColor" strokeWidth="1.3" />
    <path d="M5 12l6-8M5 13h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const IconUser = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.3" />
    <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

 
const IconBullet = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <circle cx="3" cy="5" r="1.5" fill="currentColor" />
    <circle cx="3" cy="11" r="1.5" fill="currentColor" />
    <path d="M7 5h7M7 11h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const IconNumbered = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 3h2v6H2M7 5h7M7 11h7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
 
const IconAlignLeft = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M2 8h8M2 12h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);
 
const IconAlignCenter = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M4 8h8M3 12h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

const IconAlignRight = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M6 8h8M4 12h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
  </svg>
);

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
  workspaceId: string;
  currentNoteId: string;
  currentNote: string;
  setCurrentNote: (val: string) => void;
  initialHtml: string;
  onSave: (html: string) => void;
  onDelete: () => void;
  notes: Note[];
  onNoteClick: (note: Note) => void; 
  workspaceName: string;
}

// headers from h1 to h6
type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6; 

function ActiveEditor({ 
  workspaceId, currentNoteId, currentNote, setCurrentNote, initialHtml, onSave, onDelete, notes, onNoteClick, workspaceName
}: ActiveEditorProps) {
  const navigate = useNavigate();
  const { ydoc } = useCollaboration(currentNoteId);
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  const [fontSize, setFontSize] = useState(16);
  const [activeColor, setActiveColor] = useState('#ffffff');


  const editor = useEditor({
    extensions: [
      // We must disable history (undo/redo) so Yjs can handle it. Otherwise we might undo our teammates' typing
      StarterKit.configure({ history: false }), 
      Link.configure({ openOnClick: false }), // Stops TipTap from trying to open links in a new tab
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      TextStyle,
      Color,

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

  const applyFontSize = (size: number) => {
    setFontSize(size);
    if (editor) {
      editor.chain().focus().setMark('textStyle', { fontSize: `${size}px` }).run();
    }
  };


  if (!editor) return null;

  const headingOptions = [
    { label: 'Normal Text', value: 'P' },
    { label: 'Title (36)', value: 'H1' },
    { label: 'Heading (32)', value: 'H2' },
    { label: 'Sub-heading (24)', value: 'H3' },
    { label: 'H4', value: 'H4' },
    { label: 'H5', value: 'H5' },
    { label: 'H6', value: 'H6' },
  ];


    return (
    <div className="te-active-root">
      {/* Breadcrumb / Top Bar */}
      <div className="te-top-nav">
        <div className="te-breadcrumb">
          <button onClick={() => navigate('/')} className="te-breadcrumb-home">
            Workspaces
          </button>
          <span className="te-slash">/</span>
          <span className="te-workspace-name">{workspaceName}</span>
          <span className="te-slash">/</span>
          <span className="te-current-filename">{currentNote}</span>
        </div>
        <div className="te-top-actions">
          <button onClick={() => navigate(`/graph/${workspaceId}`)} className="te-icon-btn"><IconGraph /></button>
          <SearchBar placeholder="Search Synapse..." />
          <button className="te-icon-btn"><IconUser /></button>
        </div>
      </div>
 
      {/* Toolbar */}
      <div className="te-toolbar">
        <ToolbarDivider />
 
        {/* Heading selector */}
        <ToolbarSelect 
          value="P"
          onChange={(val) => {
            if (val === 'P') editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: parseInt(val.charAt(1)) as HeadingLevel }).run();
          }}
          options={headingOptions}
          minWidth="120px"
           
        />
 
        <ToolbarDivider />
 
        {/* Font size */}
        <button onClick={() => applyFontSize(Math.max(8, fontSize - 1))} className="te-tb-btn">–</button>
        <span className="te-font-display">{fontSize}</span>
        <button onClick={() => applyFontSize(fontSize + 1)} className="te-tb-btn">+</button>
 
        <ToolbarDivider />
 
        {/* Bold / Italic / Underline */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`te-tb-btn te-bold-btn ${editor.isActive('bold') ? 'active' : ''}`}
          title="Bold"
        >B</button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`te-tb-btn te-italic-btn ${editor.isActive('italic') ? 'active' : ''}`}
          title="Italic"
        >I</button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`te-tb-btn te-underline-btn ${editor.isActive('underline') ? 'active' : ''}`}
          title="Underline" style={{ textDecoration: "underline" }}
        >U</button>
 
        <ToolbarDivider />
 
        {/* Color picker */}
        <div className="te-color-container">
          <span className="te-color-label">Color</span>
          <input 
            type="color"
            value={activeColor}
            onChange={(e) => {
              setActiveColor(e.target.value);
              editor.chain().focus().setColor(e.target.value).run();
            }}
            className="te-color-picker"
            title="Text Color"
          />
        </div>
 
        <ToolbarDivider />
 
        {/* Lists */}
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} className={`te-tb-btn ${editor.isActive('bulletList') ? 'active' : ''}`} title="Bullet List"><IconBullet /></button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} className={`te-tb-btn ${editor.isActive('orderedList') ? 'active' : ''}`} title="Numbered List"><IconNumbered /></button>
 
        <ToolbarDivider />
 
        {/* Alignment */}
        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} className={`te-tb-btn ${editor.isActive({ textAlign: 'left' }) ? 'active' : ''}`} title="Align Left"><IconAlignLeft /></button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} className={`te-tb-btn ${editor.isActive({ textAlign: 'center' }) ? 'active' : ''}`} title="Align Center"><IconAlignCenter /></button>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} className={`te-tb-btn ${editor.isActive({ textAlign: 'right' }) ? 'active' : ''}`} title="Align Right"><IconAlignRight /></button>
 
        <ToolbarDivider />
 
        {/* Save */}
        <button
          onClick={handleSaveClick}
          className="te-tb-btn te-save-main-btn"
        >Save</button>
      </div>
 
      {/* Editor Area */}
      <div className="te-main-scroll">
        {dropdownVisible && (
          <div className="te-tag-dropdown" style={{ top: dropdownPos.top + 5, left: dropdownPos.left }}>
            {notes.map((note: Note) => (
              <button
                key={note.id}
                onClick={() => insertLink(note)}
                className="te-tag-option"
              >
                {note.title}
              </button>
            ))}
          </div>
        )}
 
        {/* Note title editable */}
        <div className="te-title-container">
          <input
            type="text"
            value={currentNote}
            onChange={(e) => setCurrentNote(e.target.value)}
            className="te-main-title-input"
            placeholder="Untitled"
          />
        </div>
 
        <div onClick={handleEditorClick} className="te-editor-wrapper">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  );
}

function ToolbarDivider() {
  return <div className="te-divider" />;
}

function ToolbarSelect({ value, onChange, options, minWidth = '90px' }: {
  value: string;
  onChange: (val: string) => void;
  options: { label: string; value: string }[];
  minWidth?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="te-select"
      style={{ minWidth }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}


// 3. THE MAIN PAGE
// Manages application state, saving, and switching between files

export default function TextEditor() {
  const { workspaceId } = useParams();

  const [searchParams] = useSearchParams();  
  
  const [notes, setNotes] = useState<Note[]>([]);

  const [workspaceName, setWorkspaceName] = useState("Workspace");  //workspace name
  
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

      //workspace name
      const workspaceRes = await fetch(`http://localhost:8000/workspaces/info/${workspaceId}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );
      if(workspaceRes.ok){
        const workspaceData = await workspaceRes.json();

        if(workspaceData?.name) {
          setWorkspaceName(workspaceData.name);
        }
      }
    }catch (error){
        console.error(error);
      }
  }, [workspaceId]);

  useEffect(() => { fetchFiles(); }, [fetchFiles]);

  // Open a specific file if ?file=<id> is in the URL (e.g. from the graph view)
  useEffect(() => {
    const requestedId = searchParams.get("file");
    if (!requestedId || notes.length === 0) return;
    const match = notes.find(n => n.id === requestedId);
    if (match && match.id !== currentNoteId) {
      setCurrentNoteId(match.id);
      setCurrentNote(match.title);
      setInitialHtml(match.content || "<p></p>");
      setEditorKey(match.id);
    }
  }, [notes, searchParams, currentNoteId]);

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
      @import url('https://fonts.googleapis.com/css2?family=Krona+One&family=Mukta+Vaani:wght@400;600&display=swap');
        .te-app-root { display: flex; height: 100vh; background: #111; overflow: hidden; font-family: "Mukta Vaani", sans-serif; }
        
        /* Sidebar Styles */
        .te-sidebar { width: 220px; background: #141414; border-right: 1px solid #222; display: flex; flexDirection: column; flex-shrink: 0; }
        .te-sidebar-header { padding: 16px 14px 8px; border-bottom: 1px solid #222; }
        .te-new-note-btn { font-family: "Mukta Vaani", sans-serif; width: 100%; background: #3DD6D0; color: #0a1f1e; border: none; border-radius: 8px; padding: 8px 12px; font-weight: 700; cursor: pointer; font-size: 13px; letter-spacing: 0.02em; transition: opacity 0.15s; }
        .te-new-note-btn:hover { opacity: 0.85; }
        .te-note-list { flex: 1; overflow-y: auto; padding: 8px 8px; }
        .te-note-item { width: 100%; text-align: left; border: none; border-radius: 6px; padding: 7px 10px; cursor: pointer; font-size: 13px; transition: all 0.15s; margin-bottom: 2px; }
        .te-note-item.active { background: #1e2e2d; color: #3DD6D0; font-weight: 600; }
        .te-note-item:not(.active) { background: none; color: #999; }
        .te-note-item:not(.active):hover { color: #ccc; }
        .te-sidebar-footer { border-top: 1px solid #222; padding: 10px 8px; }
        .te-footer-btn { width: 100%; text-align: left; background: none; border: none; color: #666; cursor: pointer; font-size: 13px; padding: 7px 10px; border-radius: 6px; }
        .te-footer-btn:hover { color: #ccc; }

        /* Main Area Styles */
        .te-main-container { flex: 1; overflow: hidden; display: flex; flex-direction: column; }
        .te-empty-state { flex: 1; display: flex; alignItems: center; justifyContent: center; color: #444; fontSize: 16px; }

        /* Active Editor UI */
        .te-active-root { display: flex; flex-direction: column; height: 100vh; background: #1a1a1a; color: #e8e8e8; font-family: "Mukta Vaani", sans-serif; }
        .te-top-nav { display: flex; align-items: center; justify-content: space-between; padding: 0 20px; height: 44px; background: #111; border-bottom: 1px solid #2a2a2a; flex-shrink: 0; }
        .te-breadcrumb { fontFamily: "Mukta Vaani", sans-serif; display: flex; align-items: center; gap: 6px; fontSize: 10px; color: #888; }
        .te-breadcrumb-home { background: none; border: none; color: #3DD6D0; cursor: pointer; fontSize: 10px; padding: 2px 4px; borderRadius: 4px; transition: background 0.15s; }
        .te-breadcrumb-home:hover { background: #1e3534; }
        .te-slash { color: #444; }
        .te-workspace-name { 
        font-family: "Mukta Vaani", sans-serif;
         color: #ffffff; 
         font-weight: 500; }
        .te-top-actions { display: flex; gap: 10px; align-items: center; }
        .te-icon-btn { background: none; border: none; color: #888; cursor: pointer; font-size: 13px; }
        .te-search-pill {
          display: flex;
          align-items: center;
          gap: 6px;
          background: #161616;
          border: 1px solid #222;
          border-radius: 7px;
          padding: 4px 10px;
          color: #888;
          font-size: 12px;
          cursor: pointer;
        }

        /* Toolbar */
        .te-toolbar { 
          display: flex; 
          align-items: center; 
          gap: 4px; 
          padding: 0 16px; 
          height: 40px; 
          background: #161616; 
          border-bottom: 1px solid #252525; 
          flex-shrink: 0; 
          flex-wrap: wrap; 
          overflow-x: auto; 
          fontFamily: "Mukta Vaani, sans-serif";
        }
        .te-tb-btn { background: none; border: none; color: #ccc; cursor: pointer; padding: 3px 7px; border-radius: 4px; font-size: 13px; line-height: 1; transition: background 0.1s; }
        .te-tb-btn:hover { background: #222; }
        .te-tb-btn.active { color: #3DD6D0 !important; }
        .te-divider { width: 1px; height: 16px; background: #2a2a2a; margin: 0 4px; flex-shrink: 0; }
        .te-select { 
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;

          background: #1c1c1c;
          border: 1px solid #2d2d2d;
          color: #ddd;

          border-radius: 8px;

          padding: 6px 32px 6px 10px;

          font-size: 12px;
          font-family: "Mukta Vaani", sans-serif;

          outline: none;
          cursor: pointer;

          transition:
            border-color 0.15s ease,
            background 0.15s ease,
            color 0.15s ease;

          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M2 3l3 3 3-3' stroke='%23999' stroke-width='1.3' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");

          background-repeat: no-repeat;
          background-position: right 10px center;

          min-height: 30px;
        }
        .te-select:hover {
          background: #232323;
          border-color: #3a3a3a;
        }
          
        .te-font-display { font-size: 12px; color: #888; min-width: 20px; text-align: center; }
        .te-color-container { display: flex; align-items: center; gap: 4px; }
        .te-color-label { font-size: 12px; color: #888; }
        .te-color-picker { 
          width: 20px; 
          height: 20px; 
          border: 1px solid #888; 
          border-radius: 8px; 
          background: none; cursor: pointer; padding: 0px;
         }
          .te-color-picker::-webkit-color-swatch-wrapper {
            padding: 0;
          }

          .te-color-picker::-webkit-color-swatch {
            border: none;
            border-radius: 7px;
          }
        .te-utility-btn { color: #888; font-size: 11px; }
        .te-save-main-btn { 
          background: linear-gradient(135deg, #71F7DC 15%, #3DD6D0 100%);
          padding: 8px 15px 6px 15px;
          color: #e8e8e8; 
          margin-left: 7px; 
          font-size: 11px; 

          }

        /* Editor Scroll Area */
        .te-main-scroll { flex: 1; overflow: auto; padding: 0 60px 40px; position: relative; }
        .te-title-container { padding-top: 40px; margin-bottom: 8px; }
        .te-main-title-input { font-size: 32px; font-weight: bold; color: #f0f0f0; background: none; border: none; outline: none; width: 100%; font-family: "Mukta Vaani, sans-serif"; }
        .te-editor-wrapper { cursor: text; }

        /* Tag Dropdown */
        .te-tag-dropdown { background: white; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 1000; display: flex; flex-direction: column; padding: 4px; min-width: 150px; }
        .te-tag-option { padding: 8px 12px; textAlign: left; border: none; background: none; cursor: pointer; borderRadius: 4px; color: #e8e8e8; fontSize: 13px; }
        .te-tag-option:hover { background: #2a2a2a; }

        /* TipTap Core Styles */
        .ProseMirror { min-height: 60vh; outline: none; font-size: 16px; line-height: 1.75; color: #d8d8d8; font-family: "Mukta Vaani, sans-serif"; caret-color: #ffffff; }
        .ProseMirror p { margin: 0 0 0.5em; }
        .ProseMirror h1 { font-size: 36px; font-weight: bold; color: #f0f0f0; margin: 0.6em 0 0.3em; }
        .ProseMirror h2 { font-size: 32px; font-weight: bold; color: #eee; margin: 0.6em 0 0.3em; }
        .ProseMirror h3 { font-size: 24px; font-weight: 600; color: #ddd; margin: 0.5em 0 0.2em; }
        .ProseMirror a { color: #3DD6D0; text-decoration: underline; text-underline-offset: 2px; }
        .ProseMirror a[href^="#note:"] { background: rgba(61,214,208,0.1); color: #3DD6D0; border: 1px solid rgba(61,214,208,0.3); border-radius: 4px; padding: 2px 6px; margin: 0 2px; cursor: pointer; font-size: 0.9em; display: inline-block; user-select: none; text-decoration: none; }
        .ProseMirror ul { list-style: disc; padding-left: 24px; }
        .ProseMirror ol { list-style: decimal; padding-left: 24px; }
        .ProseMirror blockquote { border-left: 3px solid #3DD6D0; padding-left: 16px; color: #888; }
        .ProseMirror code { background: #2a2a2a; border-radius: 4px; padding: 2px 5px; font-family: "Mukta Vaani", sans-serif; color: #3DD6D0; }
        .ProseMirror strong { color: #f0f0f0; }
        .ProseMirror em { color: #c8c8c8; }
      `}</style>

      <div className="te-app-root">
        {/* Sidebar */}
        <NotesSidebar
            notes={notes}
            onCreateNote={handleCreateNote}
            onNoteClick={handleNoteClick}
           
          />
 
  
        {/* Main content */}
        <div className="te-main-container">
          {editorKey ? (
            <ActiveEditor
              key={editorKey}
              workspaceId={workspaceId!}
              currentNoteId={currentNoteId!}
              currentNote={currentNote}
              setCurrentNote={setCurrentNote}
              initialHtml={initialHtml}
              onSave={handleSave}
              onDelete={handleDelete}
              notes={notes}
              onNoteClick={handleNoteClick}
              workspaceName={workspaceName}
            />
          ) : (
            <div className="te-empty-state">
              Select or create a note to begin.
            </div>
          )}
        </div>
      </div>
    </>
  );
}