import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { axe } from "jest-axe";
import { useState } from "react";
import { CommandPalette } from "../command-palette";
import type { Command, CommandGroup } from "../types";

const commands: Command[] = [
  { id: "new", label: "New File", group: "actions" },
  { id: "settings", label: "Settings", group: "nav" },
];
const groups: CommandGroup[] = [
  { id: "actions", label: "Actions" },
  { id: "nav", label: "Navigation" },
];

function Harness(props: { onSelect?: () => void }) {
  const [open, setOpen] = useState(true);
  const cmds = props.onSelect
    ? [{ id: "go", label: "Go", onSelect: props.onSelect }]
    : commands;
  return (
    <CommandPalette
      commands={cmds}
      groups={groups}
      open={open}
      onOpenChange={setOpen}
      disableShortcut
    />
  );
}

describe("CommandPalette view", () => {
  it("renders commands grouped under their labels", () => {
    render(<Harness />);
    expect(screen.getByText("New File")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("filters as the user types", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.keyboard("set");
    expect(screen.queryByText("New File")).not.toBeInTheDocument();
    const options = screen.getAllByRole("option");
    expect(options).toHaveLength(1);
    expect(options[0]!).toHaveTextContent("Settings");
  });

  it("runs onSelect when an option is clicked", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSelect={onSelect} />);
    await user.click(screen.getByText("Go"));
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("runs the active option on Enter", async () => {
    const onSelect = vi.fn();
    const user = userEvent.setup();
    render(<Harness onSelect={onSelect} />);
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledOnce();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("listbox")).not.toBeInTheDocument(),
    );
  });

  it("exposes combobox/listbox/option roles", () => {
    render(<Harness />);
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("listbox")).toBeInTheDocument();
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);
  });

  it("has no axe violations when open", async () => {
    const { container } = render(<Harness />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
