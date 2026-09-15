import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Sparkles, HelpCircle, Shield, Terminal, ArrowUp, RefreshCw } from 'lucide-react';
import { ApplicationSummary } from '../types';

interface ChatbotWidgetProps {
  applications?: ApplicationSummary[];
  onOpenIngest?: () => void;
  onOpenWarRoom?: () => void;
  onOpenExplorer?: () => void;
}

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  timestamp: string;
}

export const ChatbotWidget: React.FC<ChatbotWidgetProps> = ({
  applications = [],
  onOpenIngest,
  onOpenWarRoom,
  onOpenExplorer,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputQuery, setInputQuery] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'bot',
      text: "👋 Hi! I'm your Dependly AI Security Assistant. Ask me anything about your supply chain risks, how to use Dependly, or what any feature does!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen, isThinking]);

  const quickPrompts = [
    { label: '🚀 How to analyze an app?', query: 'How do I analyze a new app or package?' },
    { label: '🚨 What does War Room do?', query: 'Explain how the War Room compromise simulator works.' },
    { label: '📊 How is Risk Score calculated?', query: 'How does Dependly calculate Package Risk Scores?' },
    { label: '⚠️ What is Typosquat Monitor?', query: 'What is Typosquat Monitor and how does it protect me?' },
  ];

  const generateAnswer = (query: string): string => {
    const q = query.toLowerCase();

    if (q.includes('analyze') || q.includes('upload') || q.includes('github') || q.includes('ingest')) {
      return "To analyze an app in Dependly:\n1. Click the **'Add App'** button in the top right.\n2. Upload a `package.json` or `requirements.txt` manifest file, OR paste a public GitHub repository URL (e.g., `https://github.com/expressjs/express`).\n3. Dependly will instantly build the full multi-tier dependency graph and score every direct and transitive package for known CVEs and CISA KEV threats!";
    }

    if (q.includes('war room') || q.includes('simulate') || q.includes('compromise')) {
      return "The **War Room** is a zero-day vulnerability simulator. It lets you select any package (e.g. `lodash` or `jsonwebtoken`) and simulates: *\"What happens if this package is compromised right now?\"*\n\nIt calculates:\n• **Blast Radius**: Affected apps & nodes.\n• **Environment Isolation**: Runtime production threat vs. build-time dev dependency.\n• **Remediation**: Gives you a 1-click **Simulate Fix** button to patch the vulnerability!";
    }

    if (q.includes('risk score') || q.includes('score') || q.includes('cve')) {
      return "Dependly's **Risk Score (0–100)** is calculated deterministically using:\n1. **CVE Severity**: Known vulnerability CVSS scores from OSV.dev.\n2. **CISA KEV Status**: Extra weight if actively exploited in the wild.\n3. **Graph Depth**: Transitive distance from your root app.\n4. **Maintenance Signals**: Typosquat alerts & package staleness.\n\nScore > 70 is marked **CRITICAL (Red)**; Score < 30 is **SAFE (Green)**.";
    }

    if (q.includes('typosquat') || q.includes('impersonat')) {
      return "The **Typosquat Monitor** scans open-source package registries in real time for malicious impersonation attacks (e.g. `expressjs-core` instead of `express`). It alerts you if an attacker publishes a similarly named package targeting your software stack.";
    }

    if (q.includes('testing') || q.includes('url') || q.includes('sample')) {
      return "You can test Dependly using these public GitHub repository URLs:\n• `https://github.com/expressjs/express`\n• `https://github.com/lodash/lodash`\n• `https://github.com/psf/requests`\n\nOr click **'Add App'** -> **'Paste GitHub URL'**!";
    }

    return `I analyzed your query regarding "${query}". Dependly monitors ${applications.length} active applications across your software supply chain. You can explore interactive graphs in **Dependency Explorer**, run attack simulations in **War Room**, or inspect CVE risk profiles in **Dashboard**. Let me know if you'd like step-by-step instructions on any feature!`;
  };

  const handleSend = (textToSend?: string) => {
    const text = textToSend || inputQuery;
    if (!text.trim()) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsThinking(true);

    setTimeout(() => {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        text: generateAnswer(text.trim()),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
      setIsThinking(false);
    }, 900);
  };

  return (
    <>
      {/* Floating Action Circle Button */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-3">
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              onClick={() => setIsOpen(true)}
              className="w-14 h-14 rounded-full bg-[#3DDC97] text-[#0A0E14] shadow-2xl flex items-center justify-center relative hover:scale-110 transition-all border-2 border-[#141B26] shadow-glow-green group"
              title="Open Dependly AI Assistant"
            >
              <Bot className="w-7 h-7 group-hover:rotate-12 transition-transform" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF5D5D] border-2 border-[#141B26] animate-ping" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF5D5D] border-2 border-[#141B26]" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-full max-w-md bg-[#141B26] border border-[#2A364F] rounded-3xl shadow-2xl overflow-hidden flex flex-col h-[560px]"
          >
            {/* Chatbot Header */}
            <div className="bg-[#1C2333] border-b border-[#2A364F] p-4 flex justify-between items-center">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#3DDC97]/15 border border-[#3DDC97]/40 flex items-center justify-center text-[#3DDC97]">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-mono font-bold text-sm text-[#E6EDF3] flex items-center space-x-2">
                    <span>Dependly AI Agent</span>
                    <span className="w-2 h-2 rounded-full bg-[#3DDC97] animate-pulse" />
                  </h3>
                  <p className="text-[11px] text-[#8B949E] font-mono">Supply Chain Security Advisor</p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg bg-[#141B26] text-[#8B949E] hover:text-[#E6EDF3] hover:border-[#FF5D5D] transition-all border border-[#2A364F]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Suggestion Pills */}
            <div className="p-3 bg-[#0A0E14]/60 border-b border-[#2A364F] flex items-center space-x-2 overflow-x-auto text-xs no-scrollbar">
              {quickPrompts.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(p.query)}
                  className="whitespace-nowrap px-3 py-1 rounded-full bg-[#1C2333] hover:bg-[#3DDC97]/20 border border-[#2A364F] hover:border-[#3DDC97] text-[#E6EDF3] font-mono text-[11px] transition-all shrink-0"
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      m.sender === 'user'
                        ? 'bg-[#3DDC97] text-[#0A0E14] font-medium rounded-br-none'
                        : 'bg-[#1C2333] border border-[#2A364F] text-[#E6EDF3] rounded-bl-none'
                    }`}
                  >
                    <p className="whitespace-pre-line">{m.text}</p>
                    <span
                      className={`text-[9px] font-mono mt-1.5 block text-right ${
                        m.sender === 'user' ? 'text-[#0A0E14]/70' : 'text-[#8B949E]'
                      }`}
                    >
                      {m.timestamp}
                    </span>
                  </div>
                </div>
              ))}

              {/* Robot Thinking Animation */}
              {isThinking && (
                <div className="flex justify-start items-center space-x-3 bg-[#1C2333] border border-[#3DDC97]/40 rounded-2xl px-4 py-3 max-w-[80%]">
                  <div className="w-8 h-8 rounded-full bg-[#3DDC97]/20 flex items-center justify-center text-[#3DDC97] animate-spin">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-mono text-[#3DDC97] font-bold">AI Robot is thinking...</p>
                    <p className="text-[10px] text-[#8B949E] font-mono">Analyzing vulnerability telemetry...</p>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 bg-[#1C2333] border-t border-[#2A364F] flex items-center space-x-2"
            >
              <input
                type="text"
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                placeholder="Ask Dependly AI anything..."
                className="flex-1 bg-[#141B26] border border-[#2A364F] rounded-xl px-3.5 py-2 text-xs text-[#E6EDF3] placeholder-[#5B6878] focus:outline-none focus:border-[#3DDC97]"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || isThinking}
                className="p-2 rounded-xl bg-[#3DDC97] text-[#0A0E14] font-bold hover:bg-[#3DDC97]/90 disabled:opacity-50 transition-all shadow-glow-green"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
