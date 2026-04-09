import { useState } from "react";
import { db_client } from "./auth/client.ts";
import { useNavigate } from "react-router-dom";
import logoImage from "./assets/synapse_logo.png"; 
import { GlassElement } from "./components/Glass/GlassElement";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  async function handleSubmit() {
    const { data, error } = await db_client.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      alert(error.message);
      return;
    }

    alert("Login successful!");
    console.log(data.session);  // DELETE

    // TODO: redirect to dashboard, populate with user's data
    navigate("/home");
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Krona+One&family=Mukta+Vaani:wght@400;600&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }

        .synapse-page {
          display: flex;
          min-height: 100vh;
          max-height: 100vh;
          background-color: #0d0d0d;
          font-family: 'Mukta Vaani', sans-serif;
          overflow: hidden;
        }

        /* ── Left panel ── */
        .synapse-left {
          position: relative;
          width: 49%;
          background-color: #0d0d0d;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        /* Glass */
        .synapse-glass-overlay{
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
        }

        .synapse-wordmark {
          position: absolute;
          top: 28px;
          left: 32px;
          font-family: 'Krona One', sans-serif;
          font-size: 14px;
          letter-spacing: 0.3em;
          color: #ffffff;
          z-index: 4;
        }

        .synapse-logo-img {
          width: 790px;
          /* max-width: 700%; */
          /* object-fit: contain; */
          transform: rotate(12deg) translateX(4%);
          opacity: 0.92;
          z-index: 2;
          position: relative;
          right: 2vh;
        }

        /* ── Divider ── */
        .synapse-divider {
          width: 1px;
          background: #1a1a1a;
          flex-shrink: 0;
        }

        /* ── Right panel ── */
        .synapse-right {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          /* justify-content: center; */

          padding: 60px 60px;
        
          position: relative;
      
          background-color: #0d0d0d;
        }

        .synapse-form {
          width: 100%;
          max-width: 420px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 18px;
        }

        .synapse-title {
          font-family: 'Krona One', sans-serif;
          font-size: 52px;
          font-weight: 400;
          letter-spacing: 0.1em;
          color: #ffffff;
          margin-bottom: 50px;
          margin-top: 90px;
          text-align: center;
        }

        .synapse-input {
          width: 100%;
          padding: 14px 20px;
          background: linear-gradient(90deg, #0A0322 22%, #3DD6D0 100%);
          border: 0.5px solid #FFFFFF;
          border-radius: 23px;
          color: #c8ecea;
          font-family: 'Mukta Vaani', sans-serif;
          font-size: 16px;
          outline: none;
          transition: border-color 0.2s, box-shadow 0.2s;
        }

        .synapse-input::placeholder {
          color: #ffffff;
        }

        .synapse-input:focus {
          border-color: #ffffff;
          box-shadow: 0 0 0 2px rgba(61, 214, 208, 0.12);
        }

        .synapse-btn {
          width: 65%;
          margin-top: 8px;
          padding: 14px;
          background: linear-gradient(90deg, #3DD6D0 0%, #0A0322 49%);
          border: 1.5px solid #ffffff;
          border-radius: 999px;
          color: #ffffff;
          font-family: 'Mukta Vaani', sans-serif;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: background 0.2s, color 0.2s, box-shadow 0.2s;
        }

        .synapse-btn:hover {
          background: rgba(61, 214, 208, 0.12);
          box-shadow: 0 0 20px rgba(61, 214, 208, 0.15);
        }

          .synapse-glow {
            position: absolute;
            width: 700px;
            height: 800px;
            background: radial-gradient(ellipse at center, #71F7DC 0%, #71F7DC 34%, #3DD6D0 100%);
            opacity: 0.17;
            transform: rotate(41deg); 
            border-radius: 50%;
            z-index: 0;
            filter: blur(40px);          /* the soft blurry edge */
            pointer-events: none;
            top:30%;
      }

      .createAccount{
        margin-top: 16px;
          font-family: 'Mukta Vaani', sans-serif;
          font-size: 13px;
          color: #888;
          text-align: center;
      }

     .createAccount a {
          color: #71F7DC;
          
        }
      .createAccount a:visited {
          color: #aaaaaa;
        }
      `}</style>

      <div className="synapse-page">
        {/* Left: logo and glass */}
        <div className="synapse-left">
          <span className="synapse-wordmark">SYNAPSE</span>
          <div className="synapse-glow"/>
          <img src={logoImage} alt="Synapse logo" className="synapse-logo-img" />
           <div className="synapse-glass-overlay">
              <GlassElement
                width={750}
                height={1024}
                radius={0}
                depth={45}
                blur={1}
                chromaticAberration={2}
                debug={false}
              />
            </div>
          </div>

        {/* <div className="synapse-divider" /> */}

        {/* Right: login */}
        <div className="synapse-right">
          <div className="synapse-form">
            <h1 className="synapse-title">LOG IN</h1>

            <input
              className="synapse-input"
              type="email"
              placeholder="Username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="synapse-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <button className="synapse-btn" onClick={handleSubmit}>
              Log in
            </button>
          </div>
          <div className="createAccount">
            <p>Don't have an account? <a href="./signup">Create one. </a></p>
          </div>
          
        </div>
      </div>
    </>
  );
}
   