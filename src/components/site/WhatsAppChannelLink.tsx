import { ArrowUpRight, MessageCircle } from "lucide-react";

export const WHATSAPP_CHANNEL_URL = "https://whatsapp.com/channel/0029Vb9FELHGOj9kL9Jffm0l";

export default function WhatsAppChannelLink({ className = "button button-outline channel-link" }: { className?: string }) {
  return <a href={WHATSAPP_CHANNEL_URL} className={className} target="_blank" rel="noopener noreferrer"><MessageCircle size={17} aria-hidden="true" />Join our WhatsApp channel<ArrowUpRight size={16} aria-hidden="true" /></a>;
}
