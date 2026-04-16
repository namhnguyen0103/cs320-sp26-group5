import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import NotesSidebar, { type Note } from "./components/NotesSidebar";

const STORAGE_KEY = "react-rich-text-editor-content";

export default function TextEditor() {
  const { workspaceId } = useParams();
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [fontSize, setFontSize] = useState("16px");
  const [textColor, setTextColor] = useState("#111827");
  const [currentNote, setCurrentNote] = useState("Untitled.txt");

  const [currentNoteId, setCurrentNoteId] = useState<string | null>(null);

  // Tagging logic state
  const [dropdownVisible, setDropdownVisible] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });

  // const [html, setHtml] = useState(() => {
  //   return localStorage.getItem(STORAGE_KEY) || "<p>Start typing here...</p>";
  // });
  const [html, setHtml] = useState("<p></p>");

  const [notes, setNotes] = useState<Note[]>([]);

  // Fetch files from the database when the editor loads
  const fetchFiles = async () => {
    if (!workspaceId) return;
    try {
      const token = localStorage.getItem("access_token") || "";
      const res = await fetch(`http://localhost:8000/workspaces/${workspaceId}/files`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Failed to fetch files");
      
      const data = await res.json();
      setNotes(data); 
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [workspaceId]);

  // Hide dropdown if the user clicks away
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.tag-dropdown')) {
        setDropdownVisible(false);
      }
    };

    document.addEventListener('mousedown', handleGlobalClick);
    return () => document.removeEventListener('mousedown', handleGlobalClick);
  }, []);

  // SYNC HTML TO DOM (This MUST come before the Auto-Update logic)
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
    }
  }, [html, currentNoteId]); // <-- ADD currentNoteId HERE

  // AUTO-UPDATE TAGS LOGIC OR STRIP DELETED TAGS
  useEffect(() => {
    if (!editorRef.current || notes.length === 0) return;
    
    let hasChanges = false;
    const tags = editorRef.current.querySelectorAll('.note-link');
    
    tags.forEach((tag) => {
      const id = tag.getAttribute('data-id');
      if (id) {
        const latestNote = notes.find(n => n.id === id);
        
        if (latestNote) {
          // File exists: check if name changed
          if (latestNote.title !== tag.textContent) {
            tag.textContent = latestNote.title;
            tag.setAttribute('data-target', latestNote.title);
            hasChanges = true;
          }
        } else {
          // File was deleted: strip the blue tag and revert to normal text
          const plainText = document.createTextNode(tag.textContent || "");
          tag.parentNode?.replaceChild(plainText, tag);
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setHtml(editorRef.current.innerHTML);
    }
  }, [html, notes]);

  const focusEditor = () => editorRef.current?.focus();

  const updateHtml = () => setHtml(editorRef.current?.innerHTML || "");

  // Input handling for [[ detection 
  const handleInput = () => {
    updateHtml();

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType === Node.TEXT_NODE) {
      const textBeforeCursor = node.textContent?.slice(0, range.startOffset) || "";
      if (textBeforeCursor.endsWith("[[")) {
        const rect = range.getBoundingClientRect();
        setDropdownPos({ top: rect.bottom, left: rect.left });
        setDropdownVisible(true);
      } else {
        setDropdownVisible(false);
      }
    } else {
      setDropdownVisible(false);
    }
  };

  // Inserting the tag (using standard selection, but passing the full Note object)
  const insertLink = (note: Note) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const node = range.startContainer;

    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      const text = node.textContent;
      const newText = text.slice(0, range.startOffset - 2) + text.slice(range.startOffset);
      node.textContent = newText;
      range.setStart(node, range.startOffset - 2);
      range.collapse(true);
    }

    const button = document.createElement("button");
    button.className = "note-link";
    button.setAttribute("data-target", note.title);
    button.setAttribute("data-id", note.id); // Inject the ID for auto-updating!
    button.contentEditable = "false";
    button.textContent = note.title;

    range.insertNode(button);
    range.setStartAfter(button);

    const space = document.createTextNode("\u00A0");
    range.insertNode(space);
    range.setStartAfter(space);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);

    setDropdownVisible(false);
    updateHtml();
  };

  // Saving to backend 
  const handleSave = async () => {
    if (!editorRef.current) return;

    const latestHtml = editorRef.current.innerHTML;
    const linkElements = editorRef.current.querySelectorAll('.note-link');
    const linkedFiles = Array.from(linkElements).map((el) => el.getAttribute('data-target') || "");

    const payload = {
      workspace_id: workspaceId, 
      file_id: currentNoteId, 
      file_name: currentNote,
      file_contents: latestHtml,
      linked_file_names: linkedFiles.filter(Boolean)
    };

    try {
      const token = localStorage.getItem("access_token") || "";
      const response = await fetch("http://localhost:8000/files/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) throw new Error("Failed to save");
      
      // Grab the real ID from the backend response
      const result = await response.json();
      
      await fetchFiles();
      
      // Update the state with the real ID immediately
      setCurrentNoteId(result.file_id); 

      alert(`Saved ${currentNote} successfully!`);
    } catch (error) {
      console.error(error);
      alert("Error saving file. Check console.");
    }
  };

  // Deleting the file 
  const handleDelete = async () => {
    // If it's a temporary file that hasn't been saved to the DB yet, just remove it from UI
    if (!currentNoteId || currentNoteId.startsWith("temp-")) {
      setNotes(notes.filter(n => n.id !== currentNoteId));
      clearEditor();
      setCurrentNote("Untitled.txt");
      setCurrentNoteId(null);
      return;
    }

    if (!window.confirm(`Are you sure you want to delete ${currentNote}? This cannot be undone.`)) return;

    try {
      const token = localStorage.getItem("access_token") || "";
      const response = await fetch(`http://localhost:8000/workspaces/${workspaceId}/files/${currentNoteId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error("Failed to delete");
      
      await fetchFiles(); // Refresh sidebar to remove the file
      clearEditor();      // Empty the text editor
      setCurrentNote("Untitled.txt");
      setCurrentNoteId(null);
      alert("File deleted!");
    } catch (error) {
      console.error(error);
      alert("Error deleting file.");
    }
  };




  // Existing Toolbar Commands 
  const runCommand = (command: string, value: string | undefined = undefined) => {
    focusEditor();
    document.execCommand(command, false, value);
    updateHtml();
  };

  const applyHeading = (tag: string) => {
    focusEditor();
    document.execCommand("formatBlock", false, tag);
    updateHtml();
  };

  const applyLink = () => {
    const url = window.prompt("Enter URL");
    if (!url) return;
    focusEditor();
    document.execCommand("createLink", false, url);
    updateHtml();
  };

  const removeLink = () => runCommand("unlink");

  const applyColor = (color: string) => {
    setTextColor(color);
    runCommand("foreColor", color);
  };

  const applyFontSize = (size: string) => {
    setFontSize(size);
    focusEditor();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed) return;

    const span = document.createElement("span");
    span.style.fontSize = size;
    try {
      range.surroundContents(span);
    } catch {
      document.execCommand("fontSize", false, "7");
      const fonts = editorRef.current?.querySelectorAll('font[size="7"]');
      fonts?.forEach((font) => {
        const el = font as HTMLElement;
        el.removeAttribute("size");
        el.style.fontSize = size;
      });
    }
    updateHtml();
  };

  const clearFormatting = () => {
    focusEditor();
    document.execCommand("removeFormat");
    updateHtml();
  };

  const clearEditor = () => {
    setHtml("<p></p>");
    if (editorRef.current) editorRef.current.innerHTML = "<p></p>";
    localStorage.removeItem(STORAGE_KEY);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    updateHtml();
  };

  const handleCreateNote = () => {
    const noteName = window.prompt("Enter note name (example: science.txt)");
    if (!noteName) return;
    const trimmed = noteName.trim();
    if (!trimmed) return;

    if (notes.some(n => n.title === trimmed)) {
      alert("A note with this name already exists!");
      return;
    }

    const newNote: Note = {
      id: `temp-${Date.now()}`,
      title: trimmed,
      content: "<p></p>"
    };

    setNotes([...notes, newNote]);
    setCurrentNoteId(newNote.id);
    setCurrentNote(newNote.title);
    setHtml(newNote.content);
  };

  const handleNoteClick = (note: Note) => {
    setCurrentNoteId(note.id);
    setCurrentNote(note.title);
    setHtml(note.content || "<p></p>"); 
  };

  //  Handle clicking on blue links inside the editor
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    
    if (target.classList.contains("note-link")) {
      // Grab BOTH the hidden ID and the target name
      const targetId = target.getAttribute("data-id");
      const targetTitle = target.getAttribute("data-target");
      
      let linkedNote;

      // 1. Try to find the file using the permanent database ID (Bulletproof)
      if (targetId) {
        linkedNote = notes.find((n) => n.id === targetId);
      } 
      // 2. Fallback: If it's an older tag created before we added IDs, use the name
      if (!linkedNote && targetTitle) {
        linkedNote = notes.find((n) => n.title === targetTitle);
      }
      
      if (linkedNote) {
        handleNoteClick(linkedNote); // Jump to the file!
      } else {
        alert("Could not find that file. It might have been deleted.");
      }
    }
  };

  return (
    <>
      <style>
        {`
        .page{
          min-height:100vh;
          background:#f1f5f9;
          padding:20px;
        }

        .layout{
          width:100%;
          display:grid;
          grid-template-columns:280px minmax(0, 1fr);
          gap:20px;
          align-items:start;
        }

        .notesSidebar{
          background:white;
          border-radius:20px;
          padding:16px;
          box-shadow:0 10px 25px rgba(0,0,0,0.08);
          position:sticky;
          top:20px;
        }

        .newNoteButton{
          width:100%;
          background:#0f172a;
          color:white;
          border:none;
          border-radius:10px;
          padding:10px 12px;
          font-weight:600;
          cursor:pointer;
        }

        .newNoteButton:hover{
          background:#1e293b;
        }

        .notesList{
          margin-top:14px;
          display:flex;
          flex-direction:column;
          gap:8px;
          max-height:70vh;
          overflow:auto;
        }

        .noteEntryButton{
          text-align:left;
          width:100%;
          border:1px solid #cbd5e1;
          background:#f8fafc;
          border-radius:10px;
          padding:9px 11px;
          cursor:pointer;
          font-weight:500;
          color:#0f172a;
        }

        .noteEntryButton:hover{
          background:#eef2ff;
        }

        .container{
          width:100%;
          background:white;
          padding:25px;
          border-radius:20px;
          box-shadow:0 10px 25px rgba(0,0,0,0.08);
        }

        .title{
          font-size:36px;
          font-weight:bold;
          color:#0f172a;
        }

        .subtitle{
          margin-top:8px;
          color:#64748b;
        }

        .toolbar{
          margin-top:20px;
          display:flex;
          flex-wrap:wrap;
          gap:10px;
          background:#f8fafc;
          border:1px solid #e2e8f0;
          padding:15px;
          border-radius:15px;
        }

        .toolbar button,
        .toolbar select{
          background:white;
          border:1px solid #cbd5e1;
          padding:8px 14px;
          border-radius:10px;
          cursor:pointer;
          font-weight:500;
        }

        .toolbar button:hover{
          background:#f1f5f9;
        }

        .primary-action {
          background: #4f46e5 !important;
          color: white;
          border: 1px solid #4338ca !important;
        }

        .primary-action:hover {
          background: #4338ca !important;
        }

        .danger{
          background:#fef2f2;
          border:1px solid #fecaca;
          color:#dc2626;
        }

        .danger:hover{
          background:#fee2e2;
        }

        .grid{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:20px;
          margin-top:20px;
        }

        .section{
          font-size:20px;
          font-weight:600;
          color:#1e293b;
        }

        .editor{
          min-height:360px;
          border:1px solid #cbd5e1;
          border-radius:15px;
          padding:15px;
          outline:none;
          background:white;
        }

        .editor:focus{
          border-color:#94a3b8;
        }

        .html{
          min-height:360px;
          width:100%;
          border-radius:15px;
          border:1px solid #cbd5e1;
          padding:15px;
          background:#f8fafc;
          font-family:monospace;
        }

        .note-link {
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
        }

        .tag-dropdown {
          position: fixed;
          background: white;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          box-shadow: 0 10px 25px rgba(0,0,0,0.1);
          z-index: 1000;
          max-height: 200px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          padding: 4px;
          min-width: 150px;
        }

        .tag-dropdown button {
          padding: 8px 12px;
          text-align: left;
          border: none;
          background: none;
          cursor: pointer;
          border-radius: 4px;
          font-weight: 500;
        }

        .tag-dropdown button:hover {
          background: #f1f5f9;
        }

        @media (max-width: 900px){
          .layout{
            grid-template-columns:1fr;
          }
          .notesSidebar{
            position:static;
          }
        }
        `}
      </style>

      {/* Render Dropdown if visible */}
      {dropdownVisible && (
        <div 
          className="tag-dropdown" 
          style={{ top: dropdownPos.top + 5, left: dropdownPos.left }}
        >
          {notes.map(note => (
            <button 
              key={note.id} 
              onClick={() => insertLink(note)}
            >
              {note.title}
            </button>
          ))}
        </div>
      )}

      <div className="page">
        <div className="layout">
          <NotesSidebar
            notes={notes}
            onCreateNote={handleCreateNote}
            onNoteClick={handleNoteClick}
          />

          <div className="container">
            <h1 className="title">React Text Editor</h1>
            <p className="subtitle" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              Editing: 
              <input 
                type="text" 
                value={currentNote} 
                onChange={(e) => setCurrentNote(e.target.value)}
                style={{
                  padding: "4px 8px",
                  borderRadius: "6px",
                  border: "1px solid #cbd5e1",
                  fontWeight: "bold",
                  color: "#0f172a",
                  outline: "none"
                }}
              />
            </p>

            <div className="toolbar">
              <button className="primary-action" onClick={handleSave}>
                Save
              </button>

              <button className="danger" onClick={handleDelete}>
                Delete File
              </button>

              <button onClick={()=>runCommand("bold")}>Bold</button>
              <button onClick={()=>runCommand("italic")}>Italic</button>
              <button onClick={()=>runCommand("underline")}>Underline</button>

              <select onChange={(e)=>applyHeading(e.target.value)}>
                <option>Headings</option>
                <option value="P">Paragraph</option>
                <option value="H1">H1</option>
                <option value="H2">H2</option>
              </select>

              <select value={fontSize} onChange={(e)=>applyFontSize(e.target.value)}>
                <option>12px</option>
                <option>14px</option>
                <option>16px</option>
                <option>18px</option>
                <option>20px</option>
                <option>24px</option>
              </select>

              <input
                type="color"
                value={textColor}
                onChange={(e)=>applyColor(e.target.value)}
              />

              <button onClick={()=>runCommand("insertUnorderedList")}>Bullet</button>
              <button onClick={()=>runCommand("insertOrderedList")}>Numbered</button>
              <button onClick={applyLink}>Link</button>
              <button onClick={removeLink}>Unlink</button>
              <button onClick={clearFormatting}>Clear</button>

              <button className="danger" onClick={clearEditor}>Reset</button>
            </div>

            <div className="grid">
              <div>
                <h2 className="section">Editor</h2>
                <div
                  key={currentNoteId || "empty-editor"} /* <--- ADD THIS LINE */
                  ref={editorRef}
                  contentEditable
                  onInput={handleInput} 
                  onPaste={handlePaste}
                  onClick={handleEditorClick}
                  className="editor"
                />
              </div>

              <div>
                <h2 className="section">Saved HTML</h2>
                <textarea
                  value={html}
                  readOnly
                  className="html"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}