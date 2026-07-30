import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, ShieldCheck } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
import { PASSWORD_RULES_HINT, extractApiError, validatePasswordValue } from '@/lib/password';
import { schoolsService } from '@/services/schools.service';
import type { SchoolAdmin, SchoolAdminWriteRequest } from '@/types';

/**
 * Manage a school's School Admin account — deliberately separate from the school edit form.
 *
 * The admin's login email is a credential and lives on the User; the school's official email
 * is a contact address and lives on the School. Editing one must never touch the other, so
 * they are edited in different places.
 */
export default function SchoolAdminSection({ schoolId }: { schoolId: number }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<SchoolAdminWriteRequest>({});
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const { data: admins, isLoading } = useQuery({
    queryKey: ['school-admins', schoolId],
    queryFn: () => schoolsService.admins(schoolId),
  });

  const mutation = useMutation({
    mutationFn: ({ adminId, payload }: { adminId: number; payload: SchoolAdminWriteRequest }) =>
      schoolsService.updateAdmin(schoolId, adminId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['school-admins', schoolId] });
      setEditing(null);
      setForm({});
      setError(null);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => setError(extractApiError(err, 'Could not update the School Admin.')),
  });

  const startEdit = (admin: SchoolAdmin) => {
    setEditing(admin.id);
    setForm({ full_name: admin.full_name, email: admin.email });
    setError(null);
  };

  // Blank is fine (it means "keep the current password"); anything typed must satisfy the
  // policy. Checked as you type so the Save button can refuse before the API does.
  const passwordError = form.password ? validatePasswordValue(form.password) : null;

  const save = (adminId: number) => {
    if (passwordError) {
      setError(passwordError);
      return;
    }
    // Only send what was actually filled in — a blank password must not clear the password.
    const payload: SchoolAdminWriteRequest = {};
    if (form.full_name) payload.full_name = form.full_name;
    if (form.email) payload.email = form.email;
    if (form.password) payload.password = form.password;
    mutation.mutate({ adminId, payload });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          School Admin
        </CardTitle>
        <CardDescription>
          The login account for this school. This email is used only for login and password
          reset — it is not the school's official email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <Spinner label="Loading School Admin…" />}

        {!isLoading && (!admins || admins.length === 0) && (
          <p className="text-sm text-muted-foreground">
            This school has no School Admin account yet.
          </p>
        )}

        {admins?.map((admin) =>
          editing === admin.id ? (
            <div key={admin.id} className="space-y-3 rounded-md border border-border p-4">
              <div className="space-y-1.5">
                <Label htmlFor={`name-${admin.id}`}>Name</Label>
                <Input
                  id={`name-${admin.id}`}
                  value={form.full_name ?? ''}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`email-${admin.id}`}>Login email</Label>
                <Input
                  id={`email-${admin.id}`}
                  type="email"
                  value={form.email ?? ''}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Used only for login and password reset.</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`pw-${admin.id}`}>New temporary password (optional)</Label>
                <Input
                  id={`pw-${admin.id}`}
                  type="text"
                  autoComplete="off"
                  placeholder="Leave blank to keep the current password"
                  value={form.password ?? ''}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                {passwordError ? (
                  <p className="text-xs text-destructive">{passwordError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">{PASSWORD_RULES_HINT}</p>
                )}
              </div>

              {error && <p className="text-sm text-destructive">{error}</p>}

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditing(null);
                    setError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="gradient"
                  // Block submission outright while the typed password breaks the policy.
                  disabled={mutation.isPending || passwordError !== null}
                  onClick={() => save(admin.id)}
                >
                  {mutation.isPending ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </div>
          ) : (
            <div
              key={admin.id}
              className="flex items-center justify-between gap-4 rounded-md border border-border px-4 py-3"
            >
              <div className="min-w-0">
                <p className="font-medium truncate">{admin.full_name}</p>
                <p className="text-sm text-muted-foreground truncate">{admin.email}</p>
                <div className="flex gap-2 mt-1">
                  {!admin.is_active && <Badge variant="destructive">Inactive</Badge>}
                  {!admin.is_password_set && (
                    <Badge variant="warning">
                      <KeyRound className="mr-1 h-3 w-3" />
                      Password not set yet
                    </Badge>
                  )}
                  {admin.is_password_set && admin.must_change_password && (
                    <Badge variant="warning">
                      <KeyRound className="mr-1 h-3 w-3" />
                      Must change password
                    </Badge>
                  )}
                </div>
              </div>
              <Button type="button" variant="outline" onClick={() => startEdit(admin)}>
                Edit account
              </Button>
            </div>
          ),
        )}

        {saved && <p className="text-sm text-emerald-600 dark:text-emerald-400">School Admin updated.</p>}
      </CardContent>
    </Card>
  );
}
