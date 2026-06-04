import type { Command, CommandGroup } from "@interlace/components/command-palette";

export const demoGroups: CommandGroup[] = [
  { id: "actions", label: "Actions" },
  { id: "navigation", label: "Navigation" },
  { id: "recent", label: "Recent" },
];

export const demoCommands: Command[] = [
  { id: "new-issue", label: "Create new issue", group: "actions", keywords: ["add", "task"], shortcut: ["⌘", "⇧", "I"] },
  {
    id: "status",
    label: "Change status…",
    group: "actions",
    children: [
      { id: "todo", label: "Todo" },
      { id: "in-progress", label: "In Progress" },
      { id: "done", label: "Done" },
    ],
  },
  {
    id: "assign",
    label: "Assign to…",
    group: "actions",
    // Async source: simulates a network fetch with a small delay.
    children: async (query: string) => {
      await new Promise((r) => setTimeout(r, 600));
      const people = ["Alice Wong", "Bob Singh", "Carol Diaz", "Dan Lee"];
      return people
        .filter((p) => p.toLowerCase().includes(query.toLowerCase()))
        .map((label) => ({ id: label, label }));
    },
  },
  { id: "go-inbox", label: "Go to Inbox", group: "navigation", shortcut: ["G", "I"] },
  { id: "go-settings", label: "Go to Settings", group: "navigation", shortcut: ["G", "S"] },
  { id: "recent-1", label: "Reopened: Login bug", group: "recent" },
];
