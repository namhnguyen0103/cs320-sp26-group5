import { useState } from "react";
import { db_client } from "./auth/client";
import { useNavigate } from "react-router-dom";
import logoImage from "./assets/synapse_logo.png"; 
import { GlassElement } from "./components/Glass/GlassElement";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const navigate = useNavigate();

  async function handleSubmit() {
    if (password !== confirm) {
      alert("Passwords don't match");
      return;
    }
    
    const { data, error } = await db_client.auth.signUp({
      email,
      password
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("Account created! Check your email to verify.");
    console.log(data.user); // DELETE
    navigate("/login");
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

        /* ── Left panel: form ── */
        .synapse-left {
          width: 50%;
          background-color: #0d0d0d;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 48px;
          position: relative;
       
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
          font-size: 42px;
          font-weight: 400;
          letter-spacing: 0.1em;
          color: #ffffff;
          margin-bottom: 24px;
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

        .login {
          margin-top: 16px;
          font-family: 'Mukta Vaani', sans-serif;
          font-size: 13px;
          color: #888;
          text-align: center;
        }

        .login a {
          color: #71F7DC;
        }

        .login a:visited {
          color: #aaaaaa;
        }

        /* ── Right panel: logo + glass ── */
        .synapse-right {
          width: 50%;
          background-color: #0d0d0d;
          position: relative;
          left: 2.8vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .synapse-wordmark {
          position: absolute;
          top: 28px;
          right: 32px;
          font-family: 'Krona One', sans-serif;
          font-size: 14px;
          letter-spacing: 0.3em;
          color: #ffffff;
          z-index: 4;
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
          filter: blur(40px);
          pointer-events: none;
        }

        .synapse-logo-img {
          width: 790px;
          transform: rotate(12deg) translateX(4%);
          opacity: 0.92;
          z-index: 2;
          position: relative;
          bottom: 2vh;
        }

        .synapse-glass-overlay {
          position: absolute;
          inset: 0;
          z-index: 3;
          pointer-events: none;
        }
      `}</style>

      <div className="synapse-page">
        {/* Left: form */}
        <div className="synapse-left">
          <div className="synapse-form">
            <h1 className="synapse-title">CREATE AN ACCOUNT</h1>

            <input
              className="synapse-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="synapse-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <input
              className="synapse-input"
              type="password"
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />

            <button className="synapse-btn" onClick={handleSubmit}>
              Sign Up
            </button>
          </div>

          <p className="login">
            Already have an account? <a href="/login">Sign in.</a>
          </p>
        </div>

        {/* Right: logo + glass */}
        <div className="synapse-right">
          <span className="synapse-wordmark">SYNAPSE</span>
          <div className="synapse-glow" />
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
      </div>
    </>
  );
}