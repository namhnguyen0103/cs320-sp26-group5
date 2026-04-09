import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./Home";
import Login from "./login";
import Signup from "./signup";
// import Dashboard from "./Dashboard";
import Editor from "./TextEditor.tsx"
import { AuthProvider } from "./auth/AuthContext";
// import ProtectedRoute from "./components/ProtectedRoute";


// TODO:
  // Style the navbar better, logout button looks goofy
  // Implement navbar page
  // Create temporary loading state to show while signing in
  // Make real dashboard filled with user data
    // Should be empty by default (no user data since they didn't make anything yet)
    // We'll set up the backend to pass the actual data soon
  // See if there's a better way to the layout
  // Reduce margins on login page it looks weird now with the navbar at the top\
    // Unless y'all think there shouldn't be a navbar on login/signup pages



export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={
            <Layout>
              <Home />
            </Layout>
          } />
          <Route path="/home" element={
            <Layout>
              <Home />
            </Layout>
          } />
          <Route path="/login" element={
           
              <Login />
            
          } />
          <Route path="/signup" element={
          
              <Signup />
           
          } />
          {/* <Route path="/dashboard" element={  
            <Layout>
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            </Layout>
          }></Route> */}
          {/* Changed this route to accept the workspace ID */}
          <Route path="/editor/:workspaceId" element={
            <Layout fullWidth>
              <Editor />
            </Layout>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}