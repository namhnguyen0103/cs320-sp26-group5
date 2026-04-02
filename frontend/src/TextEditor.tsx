import React, { useEffect, useRef, useState } from "react";
import NotesSidebar from "./components/NotesSidebar";

const STORAGE_KEY = "react-rich-text-editor-content";
const NOTES_STORAGE_KEY = "react-rich-text-editor-notes";

export default function TextEditor() {
  const editorRef = useRef<HTMLDivElement | null>(null);

  const [fontSize, setFontSize] = useState("16px");
  const [textColor, setTextColor] = useState("#111827");

  const [html, setHtml] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || "<p>Start typing here...</p>";
  });

  const [notes, setNotes] = useState<string[]>(() => {
    const savedNotes = localStorage.getItem(NOTES_STORAGE_KEY);

    if (savedNotes) {
      try {
        const parsed = JSON.parse(savedNotes) as string[];
        if (Array.isArray(parsed)) return parsed;
      } catch {
        // Ignore malformed storage and fall back to defaults.
      }
    }

    return ["science.txt", "history.txt", "ideas.txt"];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, html);
  }, [html]);

  useEffect(() => {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== html) {
      editorRef.current.innerHTML = html;
    }
  }, [html]);

  const focusEditor = () => editorRef.current?.focus();

  const updateHtml = () =>
    setHtml(editorRef.current?.innerHTML || "");

  const runCommand = (
    command: string,
    value: string | undefined = undefined,
  ) => {
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

      const fonts =
        editorRef.current?.querySelectorAll('font[size="7"]');

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
    if (editorRef.current)
      editorRef.current.innerHTML = "<p></p>";

    localStorage.removeItem(STORAGE_KEY);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    updateHtml();
  };

  const downloadHtml = () => {
    const blob = new Blob([html], { type: "text/html" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "note.html";
    a.click();

    URL.revokeObjectURL(url);
  };

  const downloadText = () => {
    const temp = document.createElement("div");
    temp.innerHTML = html;

    const blob = new Blob([temp.innerText], {
      type: "text/plain",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "note.txt";
    a.click();

    URL.revokeObjectURL(url);
  };

  const handleCreateNote = () => {
    const noteName = window.prompt(
      "Enter note name (example: science.txt)",
    );

    if (!noteName) return;

    const trimmed = noteName.trim();
    if (!trimmed) return;

    setNotes((prevNotes) => {
      if (prevNotes.includes(trimmed)) return prevNotes;
      return [...prevNotes, trimmed];
    });
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

      <div className="page">
        <div className="layout">
          <NotesSidebar
            notes={notes}
            onCreateNote={handleCreateNote}
          />

          <div className="container">

          <h1 className="title">
            React Text Editor
          </h1>

          <p className="subtitle">
            Rich text editor with formatting and auto-save
          </p>

          <div className="toolbar">

            <button onClick={()=>runCommand("bold")}>
              Bold
            </button>

            <button onClick={()=>runCommand("italic")}>
              Italic
            </button>

            <button onClick={()=>runCommand("underline")}>
              Underline
            </button>

            <select
              onChange={(e)=>applyHeading(e.target.value)}
            >
              <option>Headings</option>
              <option value="P">Paragraph</option>
              <option value="H1">H1</option>
              <option value="H2">H2</option>
            </select>

            <select
              value={fontSize}
              onChange={(e)=>
                applyFontSize(e.target.value)
              }
            >
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
              onChange={(e)=>
                applyColor(e.target.value)
              }
            />

            <button
              onClick={()=>runCommand("insertUnorderedList")}
            >
              Bullet
            </button>

            <button
              onClick={()=>runCommand("insertOrderedList")}
            >
              Numbered
            </button>

            <button onClick={applyLink}>
              Link
            </button>

            <button onClick={removeLink}>
              Unlink
            </button>

            <button onClick={clearFormatting}>
              Clear
            </button>

            <button onClick={downloadHtml}>
              HTML
            </button>

            <button onClick={downloadText}>
              TXT
            </button>

            <button
              className="danger"
              onClick={clearEditor}
            >
              Reset
            </button>

          </div>

          <div className="grid">

            <div>
              <h2 className="section">
                Editor
              </h2>

              <div
                ref={editorRef}
                contentEditable
                onInput={updateHtml}
                onPaste={handlePaste}
                className="editor"
              />
            </div>

            <div>

              <h2 className="section">
                Saved HTML
              </h2>

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