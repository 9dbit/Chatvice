import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DndContext } from "@dnd-kit/core";
import { SortableEntryCard } from "../dashboard/knowledge";

afterEach(cleanup);
function setup() {
  const handlers = { onNameChange: vi.fn(), onContentChange: vi.fn(), onSave: vi.fn(), onDelete: vi.fn(), onToggleActive: vi.fn(), onToggleLink: vi.fn(), onCheckClarity: vi.fn() };
  render(<DndContext><SortableEntryCard entry={{id:"test", isActive:true, isLinked:false} as any} localName="Test knowledge" localContent="Opening hours: 9–5" isSaving={false} currentStage={null} hasChanges={true} {...handlers} /></DndContext>);
  return handlers;
}
it("toolbar actions do not collapse the editor or save implicitly", async () => {
  const h = setup(); const user = userEvent.setup();
  await user.click(screen.getByRole("button",{name:"Share"}));
  await user.click(screen.getByRole("button",{name:"Clarity"}));
  await user.click(screen.getByRole("button",{name:"Delete Test knowledge"}));
  expect(h.onToggleLink).toHaveBeenCalledOnce(); expect(h.onCheckClarity).toHaveBeenCalledOnce(); expect(h.onDelete).toHaveBeenCalledOnce();
  expect(h.onSave).not.toHaveBeenCalled(); expect(screen.getByTestId("textarea-entry-content-test")).toBeVisible();
});
it("the footer opens the larger editor and Save uses the existing callback", async () => {
  const h = setup(); const user = userEvent.setup();
  await user.click(screen.getByTestId("button-expand-entry-test"));
  expect(screen.getByRole("dialog")).toBeVisible();
  expect(screen.getByRole("textbox",{name:"Knowledge content for Test knowledge"})).toHaveValue("Opening hours: 9–5");
  await user.keyboard("{Escape}");
  await user.click(screen.getByTestId("button-save-entry-test"));
  expect(h.onSave).toHaveBeenCalledOnce();
});
it("only the separate collapse button toggles the card body", async () => {
  setup(); const user = userEvent.setup();
  await user.click(screen.getByRole("textbox",{name:"Knowledge entry name"}));
  expect(screen.getByTestId("textarea-entry-content-test")).toBeVisible();
  await user.click(screen.getByRole("button",{name:"Toggle Test knowledge"}));
  expect(screen.queryByTestId("textarea-entry-content-test")).not.toBeInTheDocument();
});
