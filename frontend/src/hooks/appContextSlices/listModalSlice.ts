import { useMemo } from "react";
import type { AppContextSliceArgs } from "../../types/appContextSliceArgs";
import type { ListModalSliceDeps } from "../../types/sliceBuildDeps";

function buildListModalContext(args: ListModalSliceDeps) {
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

export function useListModalContextValue(args: AppContextSliceArgs) {
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
