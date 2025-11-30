import React, { useState, useEffect, useRef } from 'react';
import { Send, Image, LogOut, Menu, Plus, Trash2, Sparkles, Settings } from 'lucide-react';

const AIChatApp = () => {
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [chats, setChats] = useState([]);
  const [currentChatId, setCurrentChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiPrompt, setShowApiPrompt] = useState(false);
  const [authError, setAuthError] = useState('');
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('aiChatUser');
    const storedApiKey = localStorage.getItem('openaiApiKey');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
      loadChats(JSON.parse(storedUser).uid);
    }
    if (storedApiKey) {
      setApiKey(storedApiKey);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadChats = (userId) => {
    const storedChats = localStorage.getItem(`chats_${userId}`);
    if (storedChats) {
      const parsedChats = JSON.parse(storedChats);
      setChats(parsedChats);
      if (parsedChats.length > 0) {
        setCurrentChatId(parsedChats[0].id);
        loadMessages(parsedChats[0].id, userId);
      }
    }
  };

  const loadMessages = (chatId, userId) => {
    const storedMessages = localStorage.getItem(`messages_${userId}_${chatId}`);
    if (storedMessages) {
      setMessages(JSON.parse(storedMessages));
    } else {
      setMessages([]);
    }
  };

  const saveChats = (userId, updatedChats) => {
    localStorage.setItem(`chats_${userId}`, JSON.stringify(updatedChats));
    setChats(updatedChats);
  };

  const saveMessages = (userId, chatId, updatedMessages) => {
    localStorage.setItem(`messages_${userId}_${chatId}`, JSON.stringify(updatedMessages));
    setMessages(updatedMessages);
  };

  const handleAuth = (e) => {
    e.preventDefault();
    setAuthError('');
    
    if (!email || !password) {
      setAuthError('Please fill all fields');
      return;
    }

    if (authMode === 'signup' && !name) {
      setAuthError('Please enter your name');
      return;
    }

    if (authMode === 'login') {
      const storedUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
      const userKey = email.toLowerCase();
      
      if (storedUsers[userKey] && storedUsers[userKey].password === password) {
        const mockUser = { 
          uid: userKey, 
          email, 
          displayName: storedUsers[userKey].name 
        };
        setUser(mockUser);
        localStorage.setItem('aiChatUser', JSON.stringify(mockUser));
        loadChats(mockUser.uid);
      } else {
        setAuthError('Invalid email or password');
      }
    } else {
      const storedUsers = JSON.parse(localStorage.getItem('registeredUsers') || '{}');
      const userKey = email.toLowerCase();
      
      if (storedUsers[userKey]) {
        setAuthError('Email already registered. Please login.');
        return;
      }

      storedUsers[userKey] = { name, password, email };
      localStorage.setItem('registeredUsers', JSON.stringify(storedUsers));
      
      const mockUser = { uid: userKey, email, displayName: name };
      setUser(mockUser);
      localStorage.setItem('aiChatUser', JSON.stringify(mockUser));
      setChats([]);
    }
    
    setEmail('');
    setPassword('');
    setName('');
  };

  const handleLogout = () => {
    setUser(null);
    setChats([]);
    setMessages([]);
    setCurrentChatId(null);
    localStorage.removeItem('aiChatUser');
  };

  const createNewChat = () => {
    const newChat = {
      id: Date.now().toString(),
      title: 'New Chat',
      createdAt: new Date().toISOString()
    };
    const updatedChats = [newChat, ...chats];
    saveChats(user.uid, updatedChats);
    setCurrentChatId(newChat.id);
    setMessages([]);
  };

  const deleteChat = (chatId) => {
    const updatedChats = chats.filter(c => c.id !== chatId);
    saveChats(user.uid, updatedChats);
    localStorage.removeItem(`messages_${user.uid}_${chatId}`);
    if (currentChatId === chatId) {
      if (updatedChats.length > 0) {
        setCurrentChatId(updatedChats[0].id);
        loadMessages(updatedChats[0].id, user.uid);
      } else {
        setCurrentChatId(null);
        setMessages([]);
      }
    }
  };

  const sendMessage = async () => {
    if ((!input.trim() && !imageFile) || loading) return;

    if (!apiKey) {
      setShowApiPrompt(true);
      return;
    }

    let chatIdToUse = currentChatId;
    
    if (!chatIdToUse) {
      const newChat = {
        id: Date.now().toString(),
        title: input.slice(0, 30) || 'New Chat',
        createdAt: new Date().toISOString()
      };
      const updatedChats = [newChat, ...chats];
      saveChats(user.uid, updatedChats);
      chatIdToUse = newChat.id;
      setCurrentChatId(chatIdToUse);
    }

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString(),
      image: imageFile ? URL.createObjectURL(imageFile) : null
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    const userInput = input;
    setInput('');
    setImageFile(null);
    setLoading(true);

    try {
      let aiResponse;
      
      if (userInput.toLowerCase().includes('image generate') || 
          userInput.toLowerCase().includes('create image') ||
          userInput.toLowerCase().includes('draw') ||
          userInput.toLowerCase().includes('picture of')) {
        
        const imageResponse = await fetch('https://api.openai.com/v1/images/generations', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: "dall-e-3",
            prompt: userInput,
            n: 1,
            size: "1024x1024"
          })
        });

        const imageData = await imageResponse.json();
        
        if (imageData.error) {
          throw new Error(imageData.error.message);
        }

        aiResponse = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Here is your generated image:',
          timestamp: new Date().toISOString(),
          image: imageData.data[0].url
        };
      } else {
        const messages_payload = imageFile ? [
          {
            role: 'user',
            content: [
              { type: 'text', text: userInput },
              { 
                type: 'image_url',
                image_url: { url: await fileToBase64(imageFile) }
              }
            ]
          }
        ] : [
          ...updatedMessages.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        ];

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: imageFile ? 'gpt-4-vision-preview' : 'gpt-4o',
            messages: messages_payload,
            max_tokens: 2000,
            temperature: 0.7
          })
        });

        const data = await response.json();
        
        if (data.error) {
          throw new Error(data.error.message);
        }

        aiResponse = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.choices[0].message.content,
          timestamp: new Date().toISOString()
        };
      }

      const finalMessages = [...updatedMessages, aiResponse];
      saveMessages(user.uid, chatIdToUse, finalMessages);

      if (chats.find(c => c.id === chatIdToUse)?.title === 'New Chat') {
        const updatedChats = chats.map(c => 
          c.id === chatIdToUse ? { ...c, title: userInput.slice(0, 30) } : c
        );
        saveChats(user.uid, updatedChats);
      }
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ Error: ${error.message}\n\nPlease check:\n• Your API key is valid\n• You have sufficient credits\n• The model is available`,
        timestamp: new Date().toISOString(),
        isError: true
      };
      const finalMessages = [...updatedMessages, errorMessage];
      saveMessages(user.uid, chatIdToUse, finalMessages);
    }

    setLoading(false);
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
    }
  };

  const saveApiKey = () => {
    if (!apiKey.startsWith('sk-')) {
      alert('Invalid API key format. It should start with "sk-"');
      return;
    }
    localStorage.setItem('openaiApiKey', apiKey);
    setShowApiPrompt(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 border border-purple-500/20">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full mb-4">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">AI Chat GPT</h1>
            <p className="text-gray-400">Your intelligent coding assistant</p>
          </div>

          <div className="flex gap-2 mb-6">
            <button
              onClick={() => {
                setAuthMode('login');
                setAuthError('');
              }}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                authMode === 'login'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => {
                setAuthMode('signup');
                setAuthError('');
              }}
              className={`flex-1 py-2 rounded-lg font-medium transition ${
                authMode === 'signup'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Sign Up
            </button>
          </div>

          {authError && (
            <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-2 rounded-lg mb-4 text-sm">
              {authError}
            </div>
          )}

          <div className="space-y-4">
            {authMode === 'signup' && (
              <input
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              />
            )}
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
            <button
              onClick={handleAuth}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 transition"
            >
              {authMode === 'login' ? 'Login' : 'Create Account'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white">
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gray-800 transition-all duration-300 overflow-hidden flex flex-col border-r border-gray-700`}>
        <div className="p-4 border-b border-gray-700">
          <button
            onClick={createNewChat}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-3 rounded-lg hover:from-purple-700 hover:to-pink-700 transition"
          >
            <Plus className="w-5 h-5" />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {chats.map(chat => (
            <div
              key={chat.id}
              className={`flex items-center gap-2 p-3 rounded-lg cursor-pointer mb-1 group ${
                currentChatId === chat.id ? 'bg-gray-700' : 'hover:bg-gray-700/50'
              }`}
              onClick={() => {
                setCurrentChatId(chat.id);
                loadMessages(chat.id, user.uid);
              }}
            >
              <span className="flex-1 truncate text-sm">{chat.title}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteChat(chat.id);
                }}
                className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-gray-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">{user.displayName?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user.displayName}</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="bg-gray-800 p-4 border-b border-gray-700 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-700 rounded-lg transition"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1">
            <h2 className="text-xl font-semibold">AI GPT Assistant</h2>
            <p className="text-xs text-gray-400">Powered by OpenAI</p>
          </div>
          <button
            onClick={() => setShowApiPrompt(true)}
            className="flex items-center gap-2 text-sm bg-gray-700 px-3 py-2 rounded-lg hover:bg-gray-600 transition"
          >
            <Settings className="w-4 h-4" />
            {apiKey ? 'API Key ✓' : 'Set API Key'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 mt-20">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-purple-500" />
              <h3 className="text-2xl font-semibold mb-2">How can I help you today?</h3>
              <p className="mb-6">Ask me anything - code, images, or general questions!</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                <div className="bg-gray-800 p-4 rounded-lg text-left hover:bg-gray-700 cursor-pointer transition">
                  <p className="text-sm">💻 Write Python code for...</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg text-left hover:bg-gray-700 cursor-pointer transition">
                  <p className="text-sm">🎨 Generate image of...</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg text-left hover:bg-gray-700 cursor-pointer transition">
                  <p className="text-sm">🤔 Explain how...</p>
                </div>
                <div className="bg-gray-800 p-4 rounded-lg text-left hover:bg-gray-700 cursor-pointer transition">
                  <p className="text-sm">🔍 Analyze this image...</p>
                </div>
              </div>
            </div>
          )}
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl rounded-2xl p-4 ${
                msg.role === 'user' 
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white' 
                  : msg.isError
                  ? 'bg-red-900/30 border border-red-500/50 text-red-200'
                  : 'bg-gray-800 text-gray-100'
              }`}>
                {msg.image && (
                  <img src={msg.image} alt="Content" className="rounded-lg mb-2 max-w-md w-full" />
                )}
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">{msg.content}</pre>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl p-4">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="bg-gray-800 p-4 border-t border-gray-700">
          {imageFile && (
            <div className="mb-2 flex items-center gap-2 bg-gray-700 p-2 rounded-lg">
              <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-12 h-12 rounded object-cover" />
              <span className="text-sm flex-1 truncate">{imageFile.name}</span>
              <button onClick={() => setImageFile(null)} className="text-red-400 hover:text-red-300 transition">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
              title="Upload Image"
            >
              <Image className="w-5 h-5" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Message AI GPT..."
              className="flex-1 bg-gray-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={loading || (!input.trim() && !imageFile)}
              className="px-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">AI can make mistakes. Verify important information.</p>
        </div>
      </div>

      {showApiPrompt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-purple-500/20">
            <h3 className="text-xl font-semibold mb-2">OpenAI API Key Required</h3>
            <p className="text-gray-400 text-sm mb-4">
              Get your API key from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">OpenAI Platform</a>
            </p>
            <div className="bg-gray-900 p-3 rounded-lg mb-4 text-xs text-gray-300">
              <p>✓ Sign up at platform.openai.com</p>
              <p>✓ Create new secret key</p>
              <p>✓ Copy and paste here</p>
            </div>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-proj-..."
              className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg mb-4 focus:ring-2 focus:ring-purple-500 outline-none font-mono text-sm"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setShowApiPrompt(false)}
                className="flex-1 bg-gray-700 px-4 py-2 rounded-lg hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveApiKey}
                disabled={!apiKey}
                className="flex-1 bg-purple-600 px-4 py-2 rounded-lg hover:bg-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Key
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIChatApp;
