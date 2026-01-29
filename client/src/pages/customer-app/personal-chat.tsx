import { useParams, useLocation } from "wouter";
import ChatPanel from "./chat-panel";
import { chatRoutes } from "@/lib/chat-routes";

export default function PersonalChatPage() {
  const params = useParams<{ chatId: string }>();
  const [, navigate] = useLocation();
  
  const handleClose = () => {
    navigate(chatRoutes.inbox());
  };

  if (!params.chatId) {
    navigate(chatRoutes.inbox());
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      <ChatPanel 
        chatId={params.chatId}
        chatType="personal"
        onClose={handleClose}
        isEmbedded={false}
      />
    </div>
  );
}
