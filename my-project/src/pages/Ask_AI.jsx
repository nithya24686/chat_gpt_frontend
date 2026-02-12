import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

// Helper: get a unique user key from the access token (use a hash of the token)
const getUserKey = () => {
    const token = localStorage.getItem("access_token");
    if (!token) return null;
    // Use a simple hash of the token as user key
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
        hash = (hash << 5) - hash + token.charCodeAt(i);
        hash |= 0;
    }
    return "user_" + Math.abs(hash);
};

// Helper: load all chats for the current user
const loadChats = () => {
    const key = getUserKey();
    if (!key) return [];
    const stored = localStorage.getItem(`chats_${key}`);
    return stored ? JSON.parse(stored) : [];
};

// Helper: save all chats for the current user
const saveChats = (chats) => {
    const key = getUserKey();
    if (!key) return;
    localStorage.setItem(`chats_${key}`, JSON.stringify(chats));
};

const Ask_AI = () => {
    const navigate = useNavigate();
    const accessToken = localStorage.getItem("access_token");

    const [chats, setChats] = useState([]); // array of { id, title, messages }
    const [activeChatId, setActiveChatId] = useState(null);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const messagesEndRef = useRef(null);

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!accessToken) {
            navigate("/login");
        }
    }, [accessToken, navigate]);

    // Load chats from localStorage on mount
    useEffect(() => {
        const saved = loadChats();
        setChats(saved);
        if (saved.length > 0) {
            setActiveChatId(saved[0].id);
        }
    }, []);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chats, activeChatId]);

    const activeChat = chats.find((c) => c.id === activeChatId);
    const messages = activeChat ? activeChat.messages : [];

    // Create a new chat
    const handleNewChat = () => {
        const newChat = {
            id: Date.now().toString(),
            title: "New Chat",
            messages: [],
        };
        const updated = [newChat, ...chats];
        setChats(updated);
        setActiveChatId(newChat.id);
        saveChats(updated);
    };

    // Delete a chat
    const handleDeleteChat = (chatId, e) => {
        e.stopPropagation();
        const updated = chats.filter((c) => c.id !== chatId);
        setChats(updated);
        saveChats(updated);
        if (activeChatId === chatId) {
            setActiveChatId(updated.length > 0 ? updated[0].id : null);
        }
    };

    // Update chats state and persist
    const updateChat = (chatId, newMessages, title) => {
        const updated = chats.map((c) =>
            c.id === chatId
                ? { ...c, messages: newMessages, title: title || c.title }
                : c
        );
        setChats(updated);
        saveChats(updated);
    };

    // Send a message
    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        let currentChatId = activeChatId;
        let currentChats = chats;

        // If no active chat, create one
        if (!currentChatId) {
            const newChat = {
                id: Date.now().toString(),
                title: input.substring(0, 30) + (input.length > 30 ? "..." : ""),
                messages: [],
            };
            currentChats = [newChat, ...chats];
            currentChatId = newChat.id;
            setChats(currentChats);
            setActiveChatId(currentChatId);
        }

        const userMessage = { role: "user", content: input };
        const currentChat = currentChats.find((c) => c.id === currentChatId);
        const updatedMessages = [...(currentChat?.messages || []), userMessage];

        // Set title from first message
        const title =
            currentChat?.messages.length === 0
                ? input.substring(0, 30) + (input.length > 30 ? "..." : "")
                : currentChat.title;

        const newChats = currentChats.map((c) =>
            c.id === currentChatId ? { ...c, messages: updatedMessages, title } : c
        );
        setChats(newChats);
        saveChats(newChats);

        setInput("");
        setLoading(true);

        try {
            const response = await fetch("http://127.0.0.1:8000/ask", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    message: input,
                    system_prompt: "You are a helpful assistant who understands Kannada, Kanglish (Kannada written in English script), and English. If the user writes in Kannada or Kanglish, you MUST reply in the same language they used. If they write in Kannada script, reply in Kannada script. If they write in Kanglish, reply in Kanglish. If they write in English, reply in English. Always be helpful and friendly.",
                }),
            });

            if (!response.ok) throw new Error("Network response was not ok");

            const data = await response.json();
            const aiMessage = { role: "assistant", content: data.response };
            const finalMessages = [...updatedMessages, aiMessage];

            const finalChats = newChats.map((c) =>
                c.id === currentChatId ? { ...c, messages: finalMessages } : c
            );
            setChats(finalChats);
            saveChats(finalChats);
        } catch (error) {
            console.error("Error fetching AI response:", error);
            const errorMessage = {
                role: "assistant",
                content: "Sorry, something went wrong. Please try again.",
            };
            const finalMessages = [...updatedMessages, errorMessage];
            const finalChats = newChats.map((c) =>
                c.id === currentChatId ? { ...c, messages: finalMessages } : c
            );
            setChats(finalChats);
            saveChats(finalChats);
        } finally {
            setLoading(false);
        }
    };

    if (!accessToken) return null;

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            {/* Sidebar */}
            <div
                className={`${sidebarOpen ? "w-72" : "w-0"
                    } bg-gray-950 border-r border-gray-800 flex flex-col transition-all duration-300 overflow-hidden`}
            >
                {/* New Chat Button */}
                <div className="p-3">
                    <button
                        onClick={handleNewChat}
                        className="w-full flex items-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl text-sm font-medium transition-colors border border-gray-700"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        New Chat
                    </button>
                </div>

                {/* Chat List */}
                <div className="flex-1 overflow-y-auto px-2 space-y-1">
                    {chats.length === 0 && (
                        <p className="text-gray-500 text-xs text-center mt-8 px-4">
                            No conversations yet. Start a new chat!
                        </p>
                    )}
                    {chats.map((chat) => (
                        <div
                            key={chat.id}
                            onClick={() => setActiveChatId(chat.id)}
                            className={`group flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition-colors ${activeChatId === chat.id
                                ? "bg-gray-800 text-white"
                                : "text-gray-400 hover:bg-gray-800/50 hover:text-gray-200"
                                }`}
                        >
                            <div className="flex items-center gap-2 truncate flex-1">
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                                    />
                                </svg>
                                <span className="truncate">{chat.title}</span>
                            </div>
                            <button
                                onClick={(e) => handleDeleteChat(chat.id, e)}
                                className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition-all p-1"
                                title="Delete chat"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Top Bar */}
                <div className="h-14 flex items-center justify-between px-4 border-b border-gray-800 bg-gray-900">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <h1 className="text-lg font-semibold text-gray-200">
                            {activeChat ? activeChat.title : "Ask AI"}
                        </h1>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <div className="w-16 h-16 mb-6 bg-gray-800 rounded-2xl flex items-center justify-center">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                                    />
                                </svg>
                            </div>
                            <p className="text-xl font-medium mb-2">How can I help you today?</p>
                            <p className="text-sm text-gray-600">Start a conversation by typing a message below.</p>
                        </div>
                    )}

                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div className="flex items-start gap-3 max-w-2xl">
                                {msg.role === "assistant" && (
                                    <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 mt-1">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                    </div>
                                )}
                                <div
                                    className={`px-4 py-3 rounded-2xl ${msg.role === "user"
                                        ? "bg-indigo-600 text-white rounded-br-sm"
                                        : "bg-gray-800 text-gray-200 rounded-bl-sm border border-gray-700"
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                </div>
                                {msg.role === "user" && (
                                    <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center flex-shrink-0 mt-1">
                                        <svg className="w-5 h-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {loading && (
                        <div className="flex justify-start">
                            <div className="flex items-start gap-3">
                                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div className="bg-gray-800 border border-gray-700 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center space-x-1.5">
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" />
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                                    <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="border-t border-gray-800 bg-gray-900 p-4">
                    <form onSubmit={handleSend} className="max-w-3xl mx-auto relative">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Message Ask AI..."
                            className="w-full pl-4 pr-14 py-3.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-lg"
                        />
                        <button
                            type="submit"
                            disabled={loading || !input.trim()}
                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                        </button>
                    </form>
                    <p className="text-center text-xs text-gray-600 mt-2">
                        AI responses may be inaccurate. Please verify important information.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Ask_AI;
