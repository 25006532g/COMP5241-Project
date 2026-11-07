"use client";

import { useActionState } from "react";
import { Search, Save, ChevronRight } from "lucide-react";
import { searchAccounts, updateAccount } from "@/app/admin/accounts/actions";
import type { AccountSummary, DirectoryState } from "@/lib/account-directory";
import type { ActionState } from "@/app/learning/actions";

function AccountEditor({ account }: { account: AccountSummary }) {
  const [state, action, pending] = useActionState(updateAccount, {} as ActionState);
  return <form action={action} className="learning-form account-row">
    <h2>{account.name}</h2><p className="account-email">{account.email}</p>
    <input type="hidden" name="accountId" value={account.id} />
    {account.role === "admin" ? <p>Administrator (protected)</p> : <fieldset disabled={pending}>
      <label>Account role<select name="role" defaultValue={account.role}><option value="learner">Learner</option><option value="instructor">Instructor</option></select></label>
      <p>Recorded age: {account.age ?? "not available"}</p>
      <label><input type="checkbox" name="aiAccess" defaultChecked={account.aiAccess} /> External AI access</label>
      <label><input type="checkbox" name="confirmAi" /> As administrator, I have reviewed consent for external AI processing, regardless of profile age.</label>
      <button type="submit" className="secondary-button"><Save size={17} />{pending ? "Saving..." : "Save permissions"}</button>
    </fieldset>}
    {state.error && <p role="alert" className="form-notice notice-error">{state.error}</p>}
    {state.success && <p role="status" className="form-notice">{state.success}</p>}
  </form>;
}

export function AccountMaintenance() {
  const [state, action, pending] = useActionState(searchAccounts, {} as DirectoryState);
  return <>
    <form action={action} className="learning-form">
      <label>Email filter<input type="search" name="query" maxLength={254} defaultValue={state.query ?? ""} /></label>
      <button type="submit" name="page" value="1" disabled={pending} className="secondary-button"><Search size={17} />{pending ? "Searching..." : "Search accounts"}</button>
      {state.nextPage && <button type="submit" name="page" value={state.nextPage} disabled={pending} className="secondary-button"><ChevronRight size={17} />Next accounts</button>}
    </form>
    {state.error && <p role="alert" className="form-notice notice-error">{state.error}</p>}
    {state.notice && <p role="status">{state.notice}</p>}
    {state.accounts?.length === 0 && <p role="status">No matching accounts.</p>}
    <div className="learning-list">{state.accounts?.map(account => <AccountEditor key={`${account.id}-${account.role}-${account.aiAccess}`} account={account} />)}</div>
  </>;
}