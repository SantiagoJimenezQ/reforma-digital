export function searchMode(): "live" | "preview" {
  return process.env.SEARCH_MODE === "live" ? "live" : "preview";
}
