import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import NotesSidebar, { type Note } from "./components/NotesSidebar";
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
  workspaceName: string;
}

// headers from h1 to h6
type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6; 

function ActiveEditor({ 
  currentNoteId, currentNote, setCurrentNote, initialHtml, onSave, onDelete, notes, onNoteClick, workspaceName
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#1a1a1a', color: '#e8e8e8', fontFamily: "'Georgia', serif" }}>
      {/* Breadcrumb / Top Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: '44px', background: '#111', borderBottom: '1px solid #2a2a2a', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#888' }}>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: '#3DD6D0', cursor: 'pointer', fontSize: '13px', padding: '2px 4px', borderRadius: '4px', transition: 'background 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#1e3534')}
            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
          >
            Workspaces
          </button>
          <span style={{ color: '#444' }}>/</span>
          <span style={{ color: '#aaa' }}>{workspaceName}</span>
          <span style={{ color: '#444' }}>/</span>
          <span style={{ color: '#e8e8e8', fontWeight: 600 }}>{currentNote}</span>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '13px' }}>Graph</button>
          <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '13px' }}>☰</button>
          <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '13px' }}>🔍 Search</button>
          <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '13px' }}>🔔</button>
          <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '13px' }}>👤</button>
        </div>
      </div>
 
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '2px', padding: '0 16px', height: '40px', background: '#161616', borderBottom: '1px solid #252525', flexShrink: 0, flexWrap: 'wrap', overflowX: 'auto' }}>
        {/* Status */}
        <ToolbarSelect
          value=""
          onChange={() => {}}
          options={[{ label: 'Status', value: '' }, { label: 'Draft', value: 'draft' }, { label: 'Published', value: 'published' }]}
        />
 
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
        <button onClick={() => applyFontSize(Math.max(8, fontSize - 1))} style={tbBtn}>–</button>
        <span style={{ fontSize: '12px', color: '#888', minWidth: '20px', textAlign: 'center' }}>{fontSize}</span>
        <button onClick={() => applyFontSize(fontSize + 1)} style={tbBtn}>+</button>
 
        <ToolbarDivider />
 
        {/* Bold / Italic / Underline */}
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          style={{ ...tbBtn, fontWeight: 'bold', color: editor.isActive('bold') ? '#3DD6D0' : '#ccc' }}
          title="Bold"
        >B</button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          style={{ ...tbBtn, fontStyle: 'italic', color: editor.isActive('italic') ? '#3DD6D0' : '#ccc' }}
          title="Italic"
        >I</button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          style={{ ...tbBtn, textDecoration: 'underline', color: editor.isActive('underline') ? '#3DD6D0' : '#ccc' }}
          title="Underline"
        >U</button>
 
        <ToolbarDivider />
 
        {/* Color picker */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span style={{ fontSize: '12px', color: '#888' }}>Color</span>
          <input
            type="color"
            value={activeColor}
            onChange={(e) => {
              setActiveColor(e.target.value);
              editor.chain().focus().setColor(e.target.value).run();
            }}
            style={{ width: '24px', height: '18px', border: '1px solid #333', borderRadius: '3px', background: 'none', cursor: 'pointer', padding: 0 }}
            title="Text Color"
          />
        </div>
 
        <ToolbarDivider />
 
        {/* Lists */}
        <button onClick={() => editor.chain().focus().toggleBulletList().run()} style={{ ...tbBtn, color: editor.isActive('bulletList') ? '#3DD6D0' : '#ccc' }} title="Bullet List">≡</button>
        <button onClick={() => editor.chain().focus().toggleOrderedList().run()} style={{ ...tbBtn, color: editor.isActive('orderedList') ? '#3DD6D0' : '#ccc' }} title="Numbered List">⁋</button>
 
        <ToolbarDivider />
 
        {/* Alignment */}
        <button onClick={() => editor.chain().focus().setTextAlign('left').run()} style={{ ...tbBtn, color: editor.isActive({ textAlign: 'left' }) ? '#3DD6D0' : '#ccc' }} title="Align Left">⬅</button>
        <button onClick={() => editor.chain().focus().setTextAlign('center').run()} style={{ ...tbBtn, color: editor.isActive({ textAlign: 'center' }) ? '#3DD6D0' : '#ccc' }} title="Align Center">☰</button>
        <button onClick={() => editor.chain().focus().setTextAlign('right').run()} style={{ ...tbBtn, color: editor.isActive({ textAlign: 'right' }) ? '#3DD6D0' : '#ccc' }} title="Align Right">➡</button>
        <button onClick={() => editor.chain().focus().setTextAlign('justify').run()} style={{ ...tbBtn, color: editor.isActive({ textAlign: 'justify' }) ? '#3DD6D0' : '#ccc' }} title="Justify">▤</button>
 
        <ToolbarDivider />
 
        {/* Clear Editor */}
        <button
          onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().setContent('<p></p>').run()}
          style={{ ...tbBtn, color: '#888', fontSize: '11px' }}
          title="Clear Editor"
        >Clear Editor</button>
 
        <ToolbarDivider />
 
        {/* Download */}
        <button
          onClick={() => {
            const blob = new Blob([editor.getHTML()], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = `${currentNote}.html`; a.click();
            URL.revokeObjectURL(url);
          }}
          style={{ ...tbBtn, color: '#888', fontSize: '11px' }}
        >Download ▾</button>
 
        {/* Save */}
        <button
          onClick={handleSaveClick}
          style={{ ...tbBtn, color: '#e8e8e8', marginLeft: '4px', fontSize: '11px' }}
        >Save</button>
      </div>
 
      {/* Editor Area */}
      <div style={{ flex: 1, overflow: 'auto', padding: '0 60px 40px', position: 'relative' }}>
        {dropdownVisible && (
          <div style={{ position: 'fixed', top: dropdownPos.top + 5, left: dropdownPos.left, background: '#222', border: '1px solid #333', borderRadius: '8px', boxShadow: '0 10px 30px rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', flexDirection: 'column', padding: '4px', minWidth: '160px' }}>
            {notes.map((note: Note) => (
              <button
                key={note.id}
                onClick={() => insertLink(note)}
                style={{ padding: '8px 12px', textAlign: 'left', border: 'none', background: 'none', cursor: 'pointer', borderRadius: '4px', color: '#e8e8e8', fontSize: '13px' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#2a2a2a')}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}
              >
                {note.title}
              </button>
            ))}
          </div>
        )}
 
        {/* Note title editable */}
        <div style={{ paddingTop: '40px', marginBottom: '8px' }}>
          <input
            type="text"
            value={currentNote}
            onChange={(e) => setCurrentNote(e.target.value)}
            style={{ fontSize: '32px', fontWeight: 'bold', color: '#f0f0f0', background: 'none', border: 'none', outline: 'none', width: '100%', fontFamily: "'Georgia', serif" }}
            placeholder="Untitled"
          />
        </div>
 
        <div onClick={handleEditorClick} style={{ cursor: 'text' }}>
          <EditorContent editor={editor} />
        </div>
      </div>
 
      <style>{`
        .ProseMirror {
          min-height: 60vh;
          outline: none;
          font-size: 16px;
          line-height: 1.75;
          color: #d8d8d8;
          font-family: 'Georgia', serif;
          caret-color: #3DD6D0;
        }
        .ProseMirror p { margin: 0 0 0.5em; }
        .ProseMirror h1 { font-size: 36px; font-weight: bold; color: #f0f0f0; margin: 0.6em 0 0.3em; }
        .ProseMirror h2 { font-size: 32px; font-weight: bold; color: #eee; margin: 0.6em 0 0.3em; }
        .ProseMirror h3 { font-size: 24px; font-weight: 600; color: #ddd; margin: 0.5em 0 0.2em; }
        .ProseMirror h4 { font-size: 20px; font-weight: 600; color: #ccc; }
        .ProseMirror h5 { font-size: 18px; font-weight: 600; color: #bbb; }
        .ProseMirror h6 { font-size: 16px; font-weight: 600; color: #aaa; }
        .ProseMirror a { color: #3DD6D0; text-decoration: underline; text-underline-offset: 2px; }
        .ProseMirror a[href^="#note:"] {
          background: rgba(61,214,208,0.1);
          color: #3DD6D0;
          border: 1px solid rgba(61,214,208,0.3);
          border-radius: 4px;
          padding: 2px 6px;
          margin: 0 2px;
          cursor: pointer;
          font-size: 0.9em;
          display: inline-block;
          user-select: none;
          text-decoration: none;
        }
        .ProseMirror ul { list-style: disc; padding-left: 24px; }
        .ProseMirror ol { list-style: decimal; padding-left: 24px; }
        .ProseMirror blockquote { border-left: 3px solid #3DD6D0; padding-left: 16px; color: #888; }
        .ProseMirror code { background: #2a2a2a; border-radius: 4px; padding: 2px 5px; font-family: monospace; color: #3DD6D0; }
        .ProseMirror strong { color: #f0f0f0; }
        .ProseMirror em { color: #c8c8c8; }
      `}</style>
    </div>
  );
}
//helper functions: 

// shared toolbar button style
const tbBtn: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#ccc',
  cursor: 'pointer',
  padding: '3px 7px',
  borderRadius: '4px',
  fontSize: '13px',
  lineHeight: 1,
  transition: 'background 0.1s',
};
 
function ToolbarDivider() {
  return <div style={{ width: '1px', height: '16px', background: '#2a2a2a', margin: '0 4px', flexShrink: 0 }} />;
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
      style={{ background: '#1e1e1e', border: '1px solid #2a2a2a', color: '#ccc', borderRadius: '5px', padding: '2px 6px', fontSize: '12px', cursor: 'pointer', minWidth, outline: 'none' }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}




// 3. THE MAIN PAGE
// Manages application state, saving, and switching between files

export default function TextEditor() {
  const { workspaceId } = useParams();
  
  const [notes, setNotes] = useState<Note[]>([]);
  //workspace name
  const [workspaceName, setWorkspaceName] = useState("Workspace 1");
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
      if (data.workspaceName) setWorkspaceName(data.workspaceName);
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
        <div style={{ display: 'flex', height: '100vh', background: '#111', overflow: 'hidden', fontFamily: "'Georgia', serif" }}>
      {/* Sidebar */}
      <div style={{ width: '220px', background: '#141414', borderRight: '1px solid #222', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        {/* Sidebar Header */}
        <div style={{ padding: '16px 14px 8px', borderBottom: '1px solid #222' }}>
          <button
            onClick={handleCreateNote}
            style={{ width: '100%', background: '#3DD6D0', color: '#0a1f1e', border: 'none', borderRadius: '8px', padding: '8px 12px', fontWeight: '700', cursor: 'pointer', fontSize: '13px', letterSpacing: '0.02em', transition: 'opacity 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            + New Note
          </button>
        </div>
 
        {/* Notes list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {notes.map(note => (
            <button
              key={note.id}
              onClick={() => handleNoteClick(note)}
              style={{
                width: '100%', textAlign: 'left', background: note.id === currentNoteId ? '#1e2e2d' : 'none',
                border: 'none', borderRadius: '6px', padding: '7px 10px', cursor: 'pointer',
                color: note.id === currentNoteId ? '#3DD6D0' : '#999', fontSize: '13px',
                fontWeight: note.id === currentNoteId ? 600 : 400, transition: 'all 0.15s',
                marginBottom: '2px',
              }}
              onMouseEnter={e => { if (note.id !== currentNoteId) e.currentTarget.style.color = '#ccc'; }}
              onMouseLeave={e => { if (note.id !== currentNoteId) e.currentTarget.style.color = '#999'; }}
            >
              {note.title}
            </button>
          ))}
        </div>
 
        {/* Bottom actions */}
        <div style={{ borderTop: '1px solid #222', padding: '10px 8px' }}>
          <button style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '13px', padding: '7px 10px', borderRadius: '6px' }}>
            ❓ Help
          </button>
          <button
            onClick={() => navigate('/login')}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '13px', padding: '7px 10px', borderRadius: '6px' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ccc')}
            onMouseLeave={e => (e.currentTarget.style.color = '#666')}
          >
            🚪 Logout
          </button>
        </div>
      </div>
 
      {/* Main content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
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
            workspaceName={workspaceName}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#444', fontSize: '16px' }}>
            Select or create a note to begin.
          </div>
        )}
      </div>
    </div>
  );
}
