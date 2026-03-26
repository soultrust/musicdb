export default function ListModal({
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
}) {
  return (
    <div className="modal-overlay" onClick={handleCloseListModal}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Manage Lists</h2>
          <button className="modal-close" onClick={handleCloseListModal}>
            ×
          </button>
        </div>
        <div className="modal-body">
          {listLoading ? (
            <p className="detail-loading">Loading lists…</p>
          ) : (
            <>
              {lists.length > 0 && (
                <div className="lists-checkbox-group">
                  <p className="lists-label">Select lists:</p>
                  {lists.map((list) => (
                    <label key={list.id} className="list-checkbox">
                      <input
                        type="checkbox"
                        checked={selectedListIds.includes(list.id)}
                        onChange={() => toggleListSelection(list.id)}
                        disabled={listLoading}
                      />
                      <span className="list-checkbox-box" />
                      <span className="list-checkbox-label">{list.name}</span>
                    </label>
                  ))}
                </div>
              )}
              <form onSubmit={handleCreateList} className="create-list-form">
                <label htmlFor="new-list-name">Create a new list</label>
                <div className="create-list-input-group">
                  <input
                    id="new-list-name"
                    type="text"
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    placeholder="List name"
                    disabled={listLoading}
                  />
                  <button type="submit" disabled={listLoading || !newListName.trim()}>
                    Create
                  </button>
                </div>
              </form>
              {listError && <p className="error">{listError}</p>}
              <div className="modal-actions">
                <button
                  onClick={handleAddToLists}
                  disabled={listLoading}
                  className="add-to-lists-btn"
                >
                  {listLoading
                    ? "Updating…"
                    : selectedListIds.length === 0
                      ? "Remove from all lists"
                      : `Update ${selectedListIds.length} list${selectedListIds.length !== 1 ? "s" : ""}`}
                </button>
                <button onClick={handleCloseListModal} className="modal-cancel-btn">
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

