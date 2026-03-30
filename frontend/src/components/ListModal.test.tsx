import type { FormEvent } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ListModalSliceContext } from "../context/musicDbSliceContexts";
import { buildListModalSliceValue } from "../test/sliceFixtures";
import type { ListModalSliceValue } from "../types/musicDbSlices";
import ListModal from "./ListModal";

function renderListModal(overrides: Partial<ListModalSliceValue> = {}) {
  const value = buildListModalSliceValue(overrides);
  render(
    <ListModalSliceContext.Provider value={value}>
      <ListModal />
    </ListModalSliceContext.Provider>,
  );
  return value;
}

describe("ListModal", () => {
  it("shows loading state when lists are loading", () => {
    renderListModal({ listLoading: true });
    expect(screen.getByText("Loading lists…")).toBeInTheDocument();
    expect(screen.queryByLabelText(/create a new list/i)).not.toBeInTheDocument();
  });

  it("renders list checkboxes and toggles selection", () => {
    const toggleListSelection = vi.fn();
    renderListModal({
      lists: [
        { id: 1, name: "Favorites" },
        { id: 2, name: "Queue" },
      ],
      selectedListIds: [1],
      toggleListSelection,
    });

    const favorites = screen.getByRole("checkbox", { name: /favorites/i });
    const queue = screen.getByRole("checkbox", { name: /queue/i });
    expect(favorites).toBeChecked();
    expect(queue).not.toBeChecked();

    fireEvent.click(queue);
    expect(toggleListSelection).toHaveBeenCalledWith(2);
  });

  it("submits new list form via handleCreateList", () => {
    const handleCreateList = vi.fn((e?: FormEvent<Element>) => {
      e?.preventDefault();
    });
    renderListModal({
      newListName: "New list",
      handleCreateList,
    });
    const form = document.querySelector("form.create-list-form");
    expect(form).toBeTruthy();
    fireEvent.submit(form!);
    expect(handleCreateList).toHaveBeenCalled();
  });

  it("wires new list name input to setNewListName", () => {
    const setNewListName = vi.fn();
    renderListModal({ setNewListName, newListName: "" });
    fireEvent.change(screen.getByPlaceholderText("List name"), { target: { value: "Roadtrip" } });
    expect(setNewListName).toHaveBeenCalledWith("Roadtrip");
  });

  it("disables Create when name is only whitespace", () => {
    renderListModal({ newListName: "   " });
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("shows listError when present", () => {
    renderListModal({ listError: "Could not save." });
    expect(screen.getByText("Could not save.")).toHaveClass("error");
  });

  it("shows Remove from all lists when nothing selected", () => {
    renderListModal({ selectedListIds: [], lists: [{ id: 1, name: "A" }] });
    expect(screen.getByRole("button", { name: /remove from all lists/i })).toBeInTheDocument();
  });

  it("shows Update 1 list when one list is selected", () => {
    renderListModal({ selectedListIds: [1], lists: [{ id: 1, name: "A" }] });
    expect(screen.getByRole("button", { name: "Update 1 list" })).toBeInTheDocument();
  });

  it("shows Update 2 lists when two lists are selected", () => {
    renderListModal({
      selectedListIds: [1, 2],
      lists: [
        { id: 1, name: "A" },
        { id: 2, name: "B" },
      ],
    });
    expect(screen.getByRole("button", { name: "Update 2 lists" })).toBeInTheDocument();
  });

  it("calls handleAddToLists when Update is clicked", () => {
    const handleAddToLists = vi.fn();
    renderListModal({
      handleAddToLists,
      selectedListIds: [1],
      lists: [{ id: 1, name: "A" }],
    });
    fireEvent.click(screen.getByRole("button", { name: "Update 1 list" }));
    expect(handleAddToLists).toHaveBeenCalledTimes(1);
  });

  it("closes via overlay header close and Cancel", () => {
    const handleCloseListModal = vi.fn();
    renderListModal({ handleCloseListModal, lists: [{ id: 1, name: "A" }] });

    fireEvent.click(document.querySelector(".modal-overlay")!);
    expect(handleCloseListModal).toHaveBeenCalled();

    handleCloseListModal.mockClear();
    fireEvent.click(screen.getByText("×"));
    expect(handleCloseListModal).toHaveBeenCalled();

    handleCloseListModal.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(handleCloseListModal).toHaveBeenCalled();
  });
});
