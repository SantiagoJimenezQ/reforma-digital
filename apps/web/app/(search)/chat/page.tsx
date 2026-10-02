import { redirect } from 'next/navigation';
// Preserve existing links to the previous chat route.
export default function LegacyChatPage() {
  redirect('/composer');
}
