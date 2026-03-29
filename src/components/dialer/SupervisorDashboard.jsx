import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase"; // ✅ FIXED
import { createUserWithEmailAndPassword } from "firebase/auth";
import { collection, onSnapshot, doc, setDoc } from "firebase/firestore";

const SupervisorDashboard = () => {
  const [agents, setAgents] = useState([]);

  // 🔥 LIVE AGENT LIST
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "agents"), (snapshot) => {
      const agentList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAgents(agentList);
    });

    return () => unsubscribe();
  }, []);

  // 🔥 CREATE AGENT FUNCTION
  const createAgent = async () => {
    const name = prompt("Enter Agent Name");

    if (!name) return;

    const email =
      name.toLowerCase().replace(/\s/g, "") + "@opslyft.com";
    const password = "123456";

    try {
      // 🔐 CREATE AUTH USER
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      // 👤 USERS COLLECTION
      await setDoc(doc(db, "users", uid), {
        role: "agent",
        email,
      });

      // 📞 AGENTS COLLECTION
      await setDoc(doc(db, "agents", uid), {
        name,
        email,
        status: "Idle",
        callTime: 0,
        createdAt: new Date(),
      });

      alert(`✅ Agent Created\n\nEmail: ${email}\nPassword: ${password}`);
    } catch (error) {
      alert("❌ Error: " + error.message);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Supervisor Dashboard</h2>

      <button
        onClick={createAgent}
        style={{
          padding: "10px 20px",
          background: "black",
          color: "white",
          border: "none",
          cursor: "pointer",
          marginBottom: "20px",
        }}
      >
        + Create Agent
      </button>

      <table border="1" cellPadding="10">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Call Time</th>
          </tr>
        </thead>

        <tbody>
          {agents.map((agent) => (
            <tr key={agent.id}>
              <td>{agent.name}</td>
              <td>{agent.email}</td>
              <td>{agent.status}</td>
              <td>{agent.callTime}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default SupervisorDashboard;
