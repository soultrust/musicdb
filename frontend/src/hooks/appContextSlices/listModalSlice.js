import { useMemo } from "react";

function buildListModalContext(args) {
  return {
    listLoading: args.listLoading,
    lists: args.lists,
    selectedListIds: args.selectedListIds,
    toggleListSelection: args.toggleListSelection,
    handleCreateList: args.handleCreateList,
    newListName: args.newListName,
    setNewListName: args.setNewListName,
    listError: args.listError,
    handleAddToLists: args.handleAddToLists,
    handleCloseListModal: args.handleCloseListModal,
  };
}

/** @param {Record<string, unknown>} args */
export function useListModalContextValue(args) {
  const {
    listLoading,
    lists,
    selectedListIds,
    toggleListSelection,
    handleCreateList,
    newListName,
    setNewListName,
    listError,
    handleAddToLists,
    handleCloseListModal,
  } = args;
  return useMemo(
    () =>
      buildListModalContext({
        listLoading,
        lists,
        selectedListIds,
        toggleListSelection,
        handleCreateList,
        newListName,
        setNewListName,
        listError,
        handleAddToLists,
        handleCloseListModal,
      }),
    [
      listLoading,
      lists,
      selectedListIds,
      toggleListSelection,
      handleCreateList,
      newListName,
      setNewListName,
      listError,
      handleAddToLists,
      handleCloseListModal,
    ],
  );
}
