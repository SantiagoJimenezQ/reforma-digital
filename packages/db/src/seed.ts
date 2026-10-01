import { sources } from "@gov/government";
import { db, sourcesTable, closeDb } from "./index";
try {
  for (const s of sources) {
    const { hosts: _, ...row } = s;
    await db()
      .insert(sourcesTable)
      .values(row)
      .onConflictDoUpdate({ target: sourcesTable.id, set: row });
  }
  console.log(`${sources.length} fuentes oficiales registradas.`);
} finally {
  await closeDb();
}
