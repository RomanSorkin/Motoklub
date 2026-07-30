"use client";

import { deleteRouteAction } from "@/app/actions/routes";

export default function DeleteRouteButton({ id }: { id: string }) {
  return (
    <form
      action={deleteRouteAction}
      onSubmit={(e) => {
        if (
          !confirm(
            "Opravdu smazat tuto trasu? Smažou se i všechny její komentáře, hodnocení a fotky. Akci nelze vzít zpět."
          )
        )
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button className="btn sm danger" type="submit">
        🗑️ Smazat trasu
      </button>
    </form>
  );
}
