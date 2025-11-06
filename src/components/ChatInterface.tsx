import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { storageService, ChatMessage } from "@/services/storage";
// Use IBM Granite from Hugging Face - no API keys needed!
import { aiServiceHuggingFace } from "@/services/aiServiceHuggingFace";
// Fallback to rule-based system if needed
import { aiService } from "@/services/aiService";

interface ChatInterfaceProps {
  userId?: string;
}

const ChatInterface = ({ userId }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const loadChatHistory = () => {
    try {
      const history = storageService.getChatHistory(userId);
      setMessages(history);
    } catch (error: any) {
      toast({
        title: "Error loading chat history",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const saveMessage = (role: "user" | "assistant", content: string) => {
    try {
      const message: ChatMessage & { userId?: string } = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role,
        content,
        created_at: new Date().toISOString(),
        userId,
      };
      storageService.saveChatMessage(message);
    } catch (error: any) {
      console.error("Error saving message:", error);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setLoading(true);

    const tempUserMsg: ChatMessage = {
      id: `temp-user-${Date.now()}`,
      role: "user",
      content: userMessage,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    saveMessage("user", userMessage);

    try {
      // Try IBM Granite from Hugging Face first (no API keys needed)
      let aiResponse;
      try {
        aiResponse = await aiServiceHuggingFace.generateResponse(userMessage, messages);
      } catch (hfError) {
        // Fallback to rule-based system if Hugging Face fails
        console.log('Using fallback AI service');
        aiResponse = await aiService.generateResponse(userMessage, messages);
      }
      
      const assistantMsg: ChatMessage = {
        id: `temp-assistant-${Date.now()}`,
        role: "assistant",
        content: aiResponse.content,
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      saveMessage("assistant", aiResponse.content);

      // If AI response includes budget summary or insights, show them
      if (aiResponse.budgetSummary) {
        // Budget summary can be displayed in a card or modal
        toast({
          title: "Budget Summary Generated",
          description: "Check the dashboard for detailed budget analysis.",
        });
      }

      if (aiResponse.insights && aiResponse.insights.recommendations.length > 0) {
        toast({
          title: "Spending Insights Available",
          description: "See recommendations in the dashboard.",
        });
      }
    } catch (error: any) {
      console.error("Error receiving message:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (loadingHistory) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-96 grid grid-cols-1 md:grid-cols-4 gap-4 overflow-hidden">
      <div className="md:col-span-3 flex flex-col min-h-0">
        <ScrollArea className="flex-1 pr-2">
          <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <p className="mb-2">👋 Hi! I'm FINOVA, your financial assistant.</p>
              <p className="text-sm">Ask me anything about personal finance!</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 text-sm",
                  message.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "rounded-lg px-4 py-2 max-w-[80%]",
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
                  <p className="whitespace-pre-wrap">{message.content}</p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3 text-sm justify-start">
              <div className="rounded-lg px-4 py-2 bg-muted">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            </div>
          )}
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="flex gap-2 mt-4">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about budgeting, savings, or financial tips..."
            disabled={loading}
          />
          <Button onClick={handleSend} disabled={loading || !input.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Sidebar with past searches (user messages) */}
      <div className="hidden md:block md:col-span-1 min-h-0">
        <div className="h-full border rounded-lg p-3 bg-card flex flex-col overflow-hidden">
          <div className="text-sm font-medium mb-2">Past searches</div>
          <ScrollArea className="flex-1 pr-1">
            <div className="space-y-2">
              {messages
                .filter((m) => m.role === "user")
                .slice()
                .reverse()
                .reduce<string[]>((acc, m) => {
                  if (!acc.includes(m.content)) acc.push(m.content);
                  return acc;
                }, [])
                .slice(0, 12)
                .map((content) => (
                  <button
                    key={content}
                    className="w-full text-left text-xs px-3 py-2 rounded-md bg-muted/40 hover:bg-muted border transition-colors truncate"
                    onClick={() => setInput(content)}
                    title={content}
                  >
                    {content.length > 60 ? content.slice(0, 60) + "…" : content}
                  </button>
                ))}
              {messages.filter((m) => m.role === "user").length === 0 && (
                <div className="text-xs text-muted-foreground">No past searches yet.</div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
