import React from 'react';

function Chats() {
  return (
    <div className="content-area">
      <h1 className="page-title">Recent Chats</h1>
      <p className="page-desc">Your recent chat conversations.</p>
      <div className="empty-state">
        <h3>No recent chats</h3>
        <p>Start a new chat using the + New Chat button in the sidebar.</p>
      </div>
    </div>
  );
}

export default Chats;
