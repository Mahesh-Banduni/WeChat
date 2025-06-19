// src/app/dashboard/page.jsx
import { redirect } from 'next/navigation';

export default function DashboardPage() {
  redirect('/dashboard/chat');
}