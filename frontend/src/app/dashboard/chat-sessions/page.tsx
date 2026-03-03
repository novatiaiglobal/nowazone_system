import { redirect } from 'next/navigation';

/**
 * Live Chat UI removed: admins reply from Tickets only.
 * Redirect old /dashboard/chat-sessions links to Tickets.
 */
export default function ChatSessionsRedirect() {
  redirect('/dashboard/tickets');
}
