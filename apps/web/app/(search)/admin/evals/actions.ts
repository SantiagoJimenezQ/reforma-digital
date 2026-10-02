'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { authorized } from '../../../../lib/security';
export async function login(form: FormData) {
  const token = String(form.get('token') ?? '');
  if (!authorized(token)) redirect('/admin/evals?error=1');
  (await cookies()).set('gov_admin', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/admin',
    maxAge: 3600,
  });
  redirect('/admin/evals');
}
export async function logout() {
  (await cookies()).delete('gov_admin');
  redirect('/admin/evals');
}
