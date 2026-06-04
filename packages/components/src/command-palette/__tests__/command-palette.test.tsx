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

  it("puts combobox roles on the input and dialog on the panel", () => {
    render(<Harness />);
    const input = screen.getByRole("combobox");
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("aria-expanded", "true");
    const listbox = screen.getByRole("listbox");
    expect(input).toHaveAttribute("aria-controls", listbox.id);
    expect(input).toHaveAttribute("aria-autocomplete", "list");
    // active descendant points at the active option
    const activeId = input.getAttribute("aria-activedescendant");
    expect(activeId).toBeTruthy();
    expect(document.getElementById(activeId!)).not.toBeNull();

    const dialog = screen.getByRole("dialog");
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAttribute("aria-label");
  });

  it("does not expose a role=textbox element", () => {
    render(<Harness />);
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("traps focus within the palette (Tab does not escape to the page)", async () => {
    const user = userEvent.setup();
    function H() {
      const [open, setOpen] = useState(true);
      return (
        <div>
          <button data-testid="outside">Outside</button>
          <CommandPalette
            commands={commands}
            groups={groups}
            open={open}
            onOpenChange={setOpen}
            disableShortcut
          />
        </div>
      );
    }
    render(<H />);
    const input = screen.getByRole("combobox");
    const outside = screen.getByTestId("outside");
    const dialog = screen.getByRole("dialog");
    input.focus();
    expect(document.activeElement).toBe(input);
    for (let i = 0; i < 5; i++) {
      await user.tab();
      expect(document.activeElement).not.toBe(outside);
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
    for (let i = 0; i < 5; i++) {
      await user.tab({ shift: true });
      expect(document.activeElement).not.toBe(outside);
      expect(dialog.contains(document.activeElement)).toBe(true);
    }
  });

  it("exposes a polite live region reflecting result status", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-live", "polite");
    expect(status).toHaveTextContent(/result/i);
    await user.keyboard("zzzzz");
    expect(screen.getByRole("status")).toHaveTextContent(/no results/i);
  });

  it("notifies onOpenChange(false) on internal Escape close (no desync)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    function H() {
      return (
        <CommandPalette
          commands={commands}
          groups={groups}
          open
          onOpenChange={onOpenChange}
          disableShortcut
        />
      );
    }
    render(<H />);
    screen.getByRole("combobox").focus();
    await user.keyboard("{Escape}");
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

describe("CommandPalette: shortcut hints", () => {
  it("renders shortcut tokens as kbd elements when present", () => {
    function H() {
      const [open, setOpen] = useState(true);
      const cmds: Command[] = [
        { id: "new", label: "New File", shortcut: ["⌘", "N"] },
      ];
      return (
        <CommandPalette commands={cmds} open={open} onOpenChange={setOpen} disableShortcut />
      );
    }
    render(<H />);
    const option = screen.getByRole("option");
    const kbds = option.querySelectorAll("kbd");
    expect(kbds.length).toBe(2);
    expect(kbds[0]!.textContent).toBe("⌘");
    expect(kbds[1]!.textContent).toBe("N");
  });

  it("renders no kbd when a command has no shortcut", () => {
    function H() {
      const [open, setOpen] = useState(true);
      const cmds: Command[] = [{ id: "new", label: "New File" }];
      return (
        <CommandPalette commands={cmds} open={open} onOpenChange={setOpen} disableShortcut />
      );
    }
    render(<H />);
    expect(screen.getByRole("option").querySelector("kbd")).toBeNull();
  });
});

describe("CommandPalette: virtualization", () => {
  function makeCommands(n: number): Command[] {
    return Array.from({ length: n }, (_, i) => ({
      id: `cmd-${i}`,
      label: `Command number ${i}`,
    }));
  }

  it("renders every row for a small list (below threshold)", () => {
    function H() {
      const [open, setOpen] = useState(true);
      return (
        <CommandPalette commands={makeCommands(20)} open={open} onOpenChange={setOpen} disableShortcut />
      );
    }
    render(<H />);
    expect(screen.getAllByRole("option").length).toBe(20);
  });

  it("renders only a window of rows for a large list (above threshold)", () => {
    function H() {
      const [open, setOpen] = useState(true);
      return (
        <CommandPalette commands={makeCommands(2000)} open={open} onOpenChange={setOpen} disableShortcut />
      );
    }
    render(<H />);
    const rendered = screen.getAllByRole("option").length;
    expect(rendered).toBeGreaterThan(0);
    expect(rendered).toBeLessThan(2000);
  });

  it("has no axe violations with a virtualized list", async () => {
    function H() {
      const [open, setOpen] = useState(true);
      return (
        <CommandPalette commands={makeCommands(2000)} open={open} onOpenChange={setOpen} disableShortcut />
      );
    }
    const { container } = render(<H />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
