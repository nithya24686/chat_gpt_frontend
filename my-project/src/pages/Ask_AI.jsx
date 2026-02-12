import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const API_BASE = "http://127.0.0.1:8000";

const Ask_AI = () => {
    const navigate = useNavigate();
    const accessToken = localStorage.getItem("access_token");

    const [chats, setChats] = useState([]); // array of { id, title, created_at }
    const [activeChatId, setActiveChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const messagesEndRef = useRef(null);

    const authHeaders = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
    };

    const handleLogout = () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        navigate("/login");
    };

    // Redirect to login if not authenticated
    useEffect(() => {
        if (!accessToken) {
            navigate("/login");
        }
    }, [accessToken, navigate]);

    // Load chats from backend on mount
    useEffect(() => {
        if (!accessToken) return;
        const fetchChats = async () => {
            try {
                const res = await fetch(`${API_BASE}/chats`, {
                    headers: authHeaders,
                });
                if (res.status === 401) {
                    handleLogout();
                    return;
                }
                const data = await res.json();
                setChats(data);
                if (data.length > 0) {
                    setActiveChatId(data[0].id);
                }
            } catch (err) {
                console.error("Failed to load chats:", err);
            }
        };
        fetchChats();
    }, []);

    // Load messages when active chat changes
    useEffect(() => {
        if (!activeChatId || !accessToken) {
            setMessages([]);
            return;
        }
        const fetchMessages = async () => {
            try {
                const res = await fetch(`${API_BASE}/chats/${activeChatId}`, {
                    headers: authHeaders,
                });
                if (res.ok) {
                    const data = await res.json();
                    setMessages(data.messages || []);
                }
            } catch (err) {
                console.error("Failed to load messages:", err);
            }
        };
        fetchMessages();
    }, [activeChatId]);

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Create a new chat
    const handleNewChat = async () => {
        try {
            const res = await fetch(`${API_BASE}/chats`, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify({ title: "New Chat" }),
            });
            const newChat = await res.json();
            setChats([newChat, ...chats]);
            setActiveChatId(newChat.id);
            setMessages([]);
        } catch (err) {
            console.error("Failed to create chat:", err);
        }
    };

    // Delete a chat
    const handleDeleteChat = async (chatId, e) => {
        e.stopPropagation();
        try {
            await fetch(`${API_BASE}/chats/${chatId}`, {
                method: "DELETE",
                headers: authHeaders,
            });
            const updated = chats.filter((c) => c.id !== chatId);
            setChats(updated);
            if (activeChatId === chatId) {
                if (updated.length > 0) {
                    setActiveChatId(updated[0].id);
                } else {
                    setActiveChatId(null);
                    setMessages([]);
                }
            }
        } catch (err) {
            console.error("Failed to delete chat:", err);
        }
    };

    // Send a message
    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim() || loading) return;

        let currentChatId = activeChatId;

        // If no active chat, create one
        if (!currentChatId) {
            try {
                const title = input.substring(0, 30) + (input.length > 30 ? "..." : "");
                const res = await fetch(`${API_BASE}/chats`, {
                    method: "POST",
                    headers: authHeaders,
                    body: JSON.stringify({ title }),
                });
                const newChat = await res.json();
                currentChatId = newChat.id;
                setChats([newChat, ...chats]);
                setActiveChatId(currentChatId);
            } catch (err) {
                console.error("Failed to create chat:", err);
                return;
            }
        }

        const userMessage = { role: "user", content: input };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput("");
        setLoading(true);

        try {
            // Save user message to backend
            await fetch(`${API_BASE}/chats/${currentChatId}/messages`, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify(userMessage),
            });

            // Update chat title if first message
            const currentChat = chats.find((c) => c.id === currentChatId);
            if (currentChat && currentChat.title === "New Chat") {
                const newTitle = input.substring(0, 30) + (input.length > 30 ? "..." : "");
                await fetch(`${API_BASE}/chats/${currentChatId}`, {
                    method: "PUT",
                    headers: authHeaders,
                    body: JSON.stringify({ title: newTitle }),
                });
                setChats(
                    chats.map((c) =>
                        c.id === currentChatId ? { ...c, title: newTitle } : c
                    )
                );
            }

            // Get AI response
            const aiRes = await fetch(`${API_BASE}/ask`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: input,
                    system_prompt:
                        "You are a helpful assistant who understands Kannada, Kanglish (Kannada written in English script), and English. If the user writes in Kannada or Kanglish, you MUST reply in the same language they used. If they write in Kannada script, reply in Kannada script. If they write in Kanglish, reply in Kanglish. If they write in English, reply in English. Always be helpful and friendly.",
                }),
            });

            if (!aiRes.ok) throw new Error("AI response failed");

            const aiData = await aiRes.json();
            const aiMessage = { role: "assistant", content: aiData.response };

            // Save AI message to backend
            await fetch(`${API_BASE}/chats/${currentChatId}/messages`, {
                method: "POST",
                headers: authHeaders,
                body: JSON.stringify(aiMessage),
            });

            setMessages([...updatedMessages, aiMessage]);
        } catch (error) {
            console.error("Error:", error);
            const errorMessage = {
                role: "assistant",
                content: "Sorry, something went wrong. Please try again.",
            };
            setMessages([...updatedMessages, errorMessage]);
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

                {/* Logout Button */}
                <div className="p-3 border-t border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-3 bg-red-600/10 hover:bg-red-600/20 text-red-400 hover:text-red-300 rounded-xl text-sm font-medium transition-colors border border-red-800/30"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                    </button>
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
                            {chats.find((c) => c.id === activeChatId)?.title || "Ask AI"}
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
