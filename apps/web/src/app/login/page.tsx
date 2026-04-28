export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md space-y-4 p-6">
      <h1 className="text-2xl font-bold">Role Login</h1>
      <form className="space-y-3 rounded-xl border p-4">
        <select className="w-full rounded-md border p-2">
          <option value="admin">Admin</option>
          <option value="staff">Staff</option>
          <option value="user">User</option>
        </select>
        <input className="w-full rounded-md border p-2" placeholder="Username" />
        <input type="password" className="w-full rounded-md border p-2" placeholder="Password" />
        <button className="w-full rounded-md bg-black p-2 text-white">Login</button>
      </form>
    </main>
  );
}
