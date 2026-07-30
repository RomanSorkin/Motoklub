import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { approveUserAction, deleteUserAction } from "../actions/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") redirect("/");

  const users = await prisma.user.findMany({
    orderBy: [{ approved: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      approved: true,
      createdAt: true,
      _count: { select: { routes: true } },
    },
  });

  const pending = users.filter((u) => !u.approved);

  return (
    <>
      <h1 className="page-title">Správa členů</h1>
      <p className="page-sub">
        {pending.length > 0
          ? `${pending.length} účtů čeká na schválení.`
          : "Všechny účty jsou schválené."}
      </p>

      <div className="card">
        <table className="admin">
          <thead>
            <tr>
              <th>Jméno</th>
              <th>E-mail</th>
              <th>Role</th>
              <th>Trasy</th>
              <th>Stav</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.role === "ADMIN" ? "admin" : "člen"}</td>
                <td>{u._count.routes}</td>
                <td style={{ color: u.approved ? "var(--green)" : "var(--yellow)" }}>
                  {u.approved ? "schválen" : "čeká"}
                </td>
                <td style={{ display: "flex", gap: 8 }}>
                  {!u.approved && (
                    <form action={approveUserAction}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button className="btn sm" type="submit">
                        Schválit
                      </button>
                    </form>
                  )}
                  {u.id !== user.id && (
                    <form action={deleteUserAction}>
                      <input type="hidden" name="userId" value={u.id} />
                      <button className="btn sm danger" type="submit">
                        Smazat
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
