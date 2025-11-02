import ChatWindow from "@/components/ChatWindow";

export default function ChatPage({ params }) {
  return <ChatWindow channelId={params.id} />;
}
